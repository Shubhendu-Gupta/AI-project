import json
import logging
from typing import Any, Optional

import anthropic
from playwright.async_api import Page

from src.profile.loader import UserProfile
from src.qa.answerer import QAAnswerer

logger = logging.getLogger(__name__)


class FormFiller:
    def __init__(
        self,
        profile: UserProfile,
        answerer: QAAnswerer,
        model: str = 'claude-sonnet-4-6',
        client: Optional[anthropic.Anthropic] = None,
    ):
        self.profile = profile
        self.answerer = answerer
        self.model = model
        self._client = client if client is not None else anthropic.Anthropic()

    async def fill_form(self, page: Page) -> dict:
        """
        1. Extract all visible input/select/textarea fields from the page DOM.
        2. Call _identify_fields() to map each field to a profile attribute or question.
        3. Fill each field. Return {'filled': int, 'skipped': int, 'errors': list[str]}.
        """
        result: dict[str, Any] = {'filled': 0, 'skipped': 0, 'errors': []}

        try:
            fields = await self._get_page_fields(page)
        except Exception as exc:
            logger.error("Failed to extract page fields: %s", exc)
            result['errors'].append(f"Field extraction failed: {exc}")
            return result

        if not fields:
            return result

        try:
            mapped = self._identify_fields(fields)
        except Exception as exc:
            logger.error("Failed to identify fields: %s", exc)
            result['errors'].append(f"Field identification failed: {exc}")
            return result

        # Build a quick lookup from selector to field metadata for field_type
        field_meta: dict[str, dict] = {f['selector']: f for f in fields}

        for mapping in mapped:
            selector: str = mapping.get('selector', '')
            map_to: str = mapping.get('map_to', 'skip')

            if map_to == 'skip' or not selector:
                result['skipped'] += 1
                continue

            value = self._resolve_value(map_to)
            if value is None:
                result['skipped'] += 1
                continue

            meta = field_meta.get(selector, {})
            field_type = meta.get('field_type', 'text')

            try:
                await self._fill_field(page, selector, value, field_type)
                result['filled'] += 1
            except Exception as exc:
                logger.warning("Failed to fill field %r: %s", selector, exc)
                result['errors'].append(f"Failed to fill {selector}: {exc}")
                result['skipped'] += 1

        return result

    def _resolve_value(self, map_to: str) -> str | None:
        """Resolve a map_to string to an actual value from profile or QA answerer."""
        if map_to.startswith('profile.'):
            attr = map_to[len('profile.'):]
            value = getattr(self.profile, attr, None)
            if value is None:
                return None
            if isinstance(value, list):
                return ', '.join(str(v) for v in value)
            return str(value)
        elif map_to.startswith('qa:'):
            question = map_to[len('qa:'):]
            return self.answerer.answer(question)
        return None

    async def _get_page_fields(self, page: Page) -> list[dict]:
        """
        Use page.evaluate() to extract fields: returns list of
        {selector, label, placeholder, field_type, name, id}
        """
        fields: list[dict] = await page.evaluate("""
            () => {
                const results = [];
                const seen = new Set();

                function getLabel(el) {
                    // Try explicit label
                    if (el.id) {
                        const lbl = document.querySelector('label[for="' + el.id + '"]');
                        if (lbl) return lbl.textContent.trim();
                    }
                    // Try aria-label
                    if (el.getAttribute('aria-label')) return el.getAttribute('aria-label');
                    // Try aria-labelledby
                    const lblId = el.getAttribute('aria-labelledby');
                    if (lblId) {
                        const lbl = document.getElementById(lblId);
                        if (lbl) return lbl.textContent.trim();
                    }
                    // Try closest label ancestor
                    const parent = el.closest('label');
                    if (parent) return parent.textContent.trim();
                    return '';
                }

                function buildSelector(el) {
                    if (el.id) return '#' + CSS.escape(el.id);
                    if (el.name) return el.tagName.toLowerCase() + '[name="' + el.name + '"]';
                    // Fall back to nth-of-type path
                    const idx = Array.from(el.parentElement.children).indexOf(el) + 1;
                    return el.tagName.toLowerCase() + ':nth-child(' + idx + ')';
                }

                const inputs = document.querySelectorAll(
                    'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]):not([type="file"]):not([type="image"]), select, textarea'
                );

                for (const el of inputs) {
                    const style = window.getComputedStyle(el);
                    if (style.display === 'none' || style.visibility === 'hidden') continue;
                    if (el.offsetParent === null && el.tagName !== 'SELECT') continue;
                    if (el.disabled) continue;

                    const selector = buildSelector(el);
                    if (seen.has(selector)) continue;
                    seen.add(selector);

                    results.push({
                        selector: selector,
                        label: getLabel(el),
                        placeholder: el.placeholder || '',
                        field_type: el.tagName.toLowerCase() === 'select' ? 'select'
                                    : el.tagName.toLowerCase() === 'textarea' ? 'textarea'
                                    : (el.type || 'text'),
                        name: el.name || '',
                        id: el.id || ''
                    });
                }
                return results;
            }
        """)
        return fields

    def _identify_fields(self, fields: list[dict]) -> list[dict]:
        """
        Use Claude API to identify which profile field or question each form field maps to.
        Returns list of {selector, map_to}.
        Falls back to 'skip' for all fields on any error.
        """
        profile = self.profile
        system_prompt = (
            "You map HTML form fields to job application data. "
            "Given a JSON list of form fields, return a JSON list of objects, "
            "one per field, with keys 'selector' and 'map_to'.\n\n"
            "map_to values:\n"
            "  'profile.first_name', 'profile.last_name', 'profile.full_name',\n"
            "  'profile.email', 'profile.phone', 'profile.location',\n"
            "  'profile.linkedin_url', 'profile.github_url',\n"
            "  'profile.years_experience', 'profile.summary',\n"
            "  'profile.skills' — for skills list fields,\n"
            "  'qa:<question text>' — for open-ended application questions,\n"
            "  'skip' — for fields you cannot confidently map (captcha, file upload, etc.).\n\n"
            "Respond with only a valid JSON array — no markdown, no explanation."
        )

        user_content = (
            f"Candidate: {profile.full_name}, {profile.years_experience} yrs exp, "
            f"skills: {', '.join(profile.skills[:5])}.\n\n"
            f"Fields:\n{json.dumps(fields, indent=2)}"
        )

        fallback = [{'selector': f['selector'], 'map_to': 'skip'} for f in fields]

        try:
            response = self._client.messages.create(
                model=self.model,
                max_tokens=1024,
                system=system_prompt,
                messages=[{'role': 'user', 'content': user_content}],
            )
            raw = response.content[0].text.strip()
            # Strip markdown code fences if present
            if raw.startswith('```'):
                raw = raw.split('\n', 1)[-1]
                raw = raw.rsplit('```', 1)[0]
            result = json.loads(raw)
            if not isinstance(result, list):
                logger.warning("Claude returned non-list for field identification, using fallback")
                return fallback
            return result
        except json.JSONDecodeError as exc:
            logger.error("Failed to parse Claude field identification response: %s", exc)
            return fallback
        except anthropic.APIError as exc:
            logger.error("Claude API error during field identification: %s", exc)
            return fallback
        except Exception as exc:
            logger.error("Unexpected error during field identification: %s", exc)
            return fallback

    async def _fill_field(
        self, page: Page, selector: str, value: str, field_type: str
    ) -> None:
        """Fill a single field. Use page.select_option for 'select', page.fill for text inputs."""
        if field_type == 'select':
            await page.select_option(selector, label=value)
        elif field_type == 'checkbox':
            lower_val = value.lower()
            if lower_val in ('yes', 'true', '1'):
                await page.check(selector)
            else:
                await page.uncheck(selector)
        elif field_type == 'radio':
            await page.check(f"{selector}[value='{value}']")
        else:
            # text, email, tel, textarea, number, url, etc.
            await page.fill(selector, value)
