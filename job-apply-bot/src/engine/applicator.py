import asyncio
import logging
import pathlib
from datetime import datetime, timezone

from playwright.async_api import Browser

from src.tracker.db import Application, ApplicationDB
from src.profile.loader import UserProfile
from src.qa.answerer import QAAnswerer
from src.engine.form_filler import FormFiller

logger = logging.getLogger(__name__)

# Selectors tried in order when looking for a submit button
_SUBMIT_SELECTORS = [
    "button[type='submit']",
    "input[type='submit']",
    "button:has-text('Apply')",
    "button:has-text('Submit')",
    "button:has-text('Apply Now')",
    "button:has-text('Submit Application')",
]


class Applicator:
    def __init__(
        self,
        browser: Browser,
        profile: UserProfile,
        db: ApplicationDB,
        answerer: QAAnswerer,
        screenshots_dir: pathlib.Path,
    ):
        self.browser = browser
        self.profile = profile
        self.db = db
        self.answerer = answerer
        self.screenshots_dir = pathlib.Path(screenshots_dir)
        self.screenshots_dir.mkdir(parents=True, exist_ok=True)

    async def apply(self, app: Application) -> bool:
        """
        1. Open a new browser page.
        2. Navigate to app.url.
        3. Take a before screenshot.
        4. Call FormFiller.fill_form().
        5. Look for a submit button.
        6. Click submit.
        7. Wait 2s, take after screenshot.
        8. Mark applied in DB with screenshot path.
        9. Return True on success, False on any exception.
        """
        page = None
        try:
            page = await self.browser.new_page()

            logger.info("Navigating to %s", app.url)
            await page.goto(app.url, wait_until='domcontentloaded', timeout=30_000)

            # Before screenshot
            before_path = self._screenshot_path(app.id, 'before')
            await page.screenshot(path=str(before_path), full_page=False)

            # Fill the form
            filler = FormFiller(self.profile, self.answerer)
            fill_result = await filler.fill_form(page)
            logger.info(
                "Form fill result for %s: filled=%d skipped=%d errors=%d",
                app.id,
                fill_result['filled'],
                fill_result['skipped'],
                len(fill_result['errors']),
            )

            # Find and click submit button
            submit_clicked = False
            for selector in _SUBMIT_SELECTORS:
                try:
                    btn = page.locator(selector).first
                    if await btn.is_visible(timeout=2_000):
                        await btn.click()
                        submit_clicked = True
                        logger.info("Clicked submit with selector %r", selector)
                        break
                except Exception:
                    continue

            if not submit_clicked:
                logger.warning("No submit button found for application %s", app.id)

            # Wait and take after screenshot
            await asyncio.sleep(2)
            after_path = self._screenshot_path(app.id, 'after')
            await page.screenshot(path=str(after_path), full_page=False)

            # Mark applied
            self.db.mark_applied(app.id, screenshot_path=str(after_path))
            logger.info("Marked application %s as applied", app.id)
            return True

        except Exception as exc:
            logger.error("Application %s failed: %s", app.id, exc)
            self.db.mark_failed(app.id, notes=str(exc))
            return False
        finally:
            if page is not None:
                try:
                    await page.close()
                except Exception:
                    pass

    def _screenshot_path(self, app_id: str, suffix: str) -> pathlib.Path:
        timestamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S')
        filename = f"{app_id}_{suffix}_{timestamp}.png"
        return self.screenshots_dir / filename
