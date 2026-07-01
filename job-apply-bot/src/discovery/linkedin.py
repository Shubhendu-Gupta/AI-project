import logging
import pathlib
import urllib.parse

from src.discovery.base import BaseDiscovery
from src.tracker.db import Application

logger = logging.getLogger(__name__)


class LinkedInDiscovery(BaseDiscovery):
    SOURCE = 'linkedin'
    BASE_URL = 'https://www.linkedin.com/jobs/search/'
    MAX_RESULTS = 20

    async def discover(self) -> list[Application]:
        """
        1. Open browser page with persistent profile (profile_dir / 'linkedin').
        2. Build search URL from search_config job_titles[0] and locations[0].
        3. Navigate and wait for job card selector.
        4. Extract up to 20 job cards: title, company, url.
        5. Filter out jobs matching exclude_keywords (case-insensitive).
        6. Filter out already_seen urls via db.
        7. Return list of Application objects with status='pending'.
        """
        persistent_dir = self.profile_dir / 'linkedin'
        persistent_dir.mkdir(parents=True, exist_ok=True)

        context = await self.browser.new_context(
            user_data_dir=str(persistent_dir),
        ) if hasattr(self.browser, 'new_context') else None

        # Prefer persistent context if browser supports it; fall back to new_page
        if context is not None:
            page = await context.new_page()
        else:
            page = await self.browser.new_page()

        applications: list[Application] = []

        try:
            job_title = self.search_config.job_titles[0] if self.search_config.job_titles else ''
            location = self.search_config.locations[0] if self.search_config.locations else ''

            params = urllib.parse.urlencode({
                'keywords': job_title,
                'location': location,
                'f_WT': '2' if self.search_config.remote_only else '',
            })
            search_url = f"{self.BASE_URL}?{params}"

            logger.info("LinkedIn discovery: navigating to %s", search_url)
            response = await page.goto(search_url, wait_until='domcontentloaded', timeout=30_000)

            # Detect login wall
            current_url = page.url
            if '/login' in current_url or '/authwall' in current_url:
                logger.warning(
                    "LinkedIn redirected to login page (%s). "
                    "Returning empty list — please log in via the browser profile.",
                    current_url,
                )
                return []

            # Wait for job cards to appear
            card_selector = '.job-card-container'
            try:
                await page.wait_for_selector(card_selector, timeout=15_000)
            except Exception:
                # Try alternative selector used on some LinkedIn views
                alt_selector = '.jobs-search-results__list-item'
                try:
                    await page.wait_for_selector(alt_selector, timeout=5_000)
                    card_selector = alt_selector
                except Exception:
                    logger.warning("No job cards found on LinkedIn search page")
                    return []

            # Extract job card data
            raw_jobs: list[dict] = await page.evaluate(
                """
                (selector) => {
                    const cards = Array.from(document.querySelectorAll(selector));
                    return cards.slice(0, 20).map(card => {
                        const titleEl = card.querySelector(
                            '.job-card-list__title, .job-card-container__link, a[data-control-name="job_card_title"]'
                        );
                        const companyEl = card.querySelector(
                            '.job-card-container__company-name, .artdeco-entity-lockup__subtitle'
                        );
                        const linkEl = card.querySelector('a[href*="/jobs/view/"]');

                        const title = titleEl ? titleEl.textContent.trim() : '';
                        const company = companyEl ? companyEl.textContent.trim() : '';
                        let url = linkEl ? linkEl.href : '';
                        // Normalize URL — strip query params after the job id
                        try {
                            const parsed = new URL(url);
                            url = parsed.origin + parsed.pathname;
                        } catch (_) {}

                        return { title, company, url };
                    });
                }
                """,
                card_selector,
            )

            exclude_lower = [kw.lower() for kw in self.search_config.exclude_keywords]

            for job in raw_jobs:
                title: str = job.get('title', '').strip()
                company: str = job.get('company', '').strip()
                url: str = job.get('url', '').strip()

                if not url or not title:
                    continue

                # Filter exclude keywords against title + company
                combined_lower = f"{title} {company}".lower()
                if any(kw in combined_lower for kw in exclude_lower):
                    logger.debug("Skipping %r — matched exclude keyword", title)
                    continue

                # Skip already-seen
                if self.db.already_seen(url):
                    logger.debug("Skipping already-seen URL: %s", url)
                    continue

                app = Application(
                    id=self._make_id(self.SOURCE, url),
                    source=self.SOURCE,
                    title=title,
                    company=company,
                    url=url,
                    status='pending',
                )
                applications.append(app)

                if len(applications) >= self.MAX_RESULTS:
                    break

            logger.info("LinkedIn discovery found %d new jobs", len(applications))
            return applications

        except Exception as exc:
            logger.error("LinkedIn discovery error: %s", exc)
            return []
        finally:
            try:
                await page.close()
            except Exception:
                pass
            if context is not None:
                try:
                    await context.close()
                except Exception:
                    pass
