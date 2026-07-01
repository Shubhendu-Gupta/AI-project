import urllib.parse

from playwright.async_api import Browser

from src.discovery.base import BaseDiscovery
from src.profile.loader import SearchConfig
from src.tracker.db import Application, ApplicationDB


class IndeedDiscovery(BaseDiscovery):
    BASE_URL = "https://www.indeed.com/jobs"

    async def discover(self) -> list[Application]:
        results = []
        for title in self.search_config.job_titles:
            for location in self.search_config.locations:
                listings = await self._search_one(title, location)
                results.extend(listings)
        return results

    async def _search_one(self, title: str, location: str) -> list[Application]:
        page = await self.browser.new_page()
        params = urllib.parse.urlencode({"q": title, "l": location})
        try:
            await page.goto(f"{self.BASE_URL}?{params}")
            await page.wait_for_selector(".jobsearch-ResultsList", timeout=10000)
        except Exception:
            await page.close()
            return []

        cards = await page.query_selector_all(".job_seen_beacon")
        listings = []
        for card in cards:
            try:
                title_el = await card.query_selector("h2")
                company_el = await card.query_selector(".companyName")
                link_el = await card.query_selector("a")
                if not all([title_el, company_el, link_el]):
                    continue
                job_title = (await title_el.inner_text()).strip()
                if any(kw.lower() in job_title.lower() for kw in self.search_config.exclude_keywords):
                    continue
                company = (await company_el.inner_text()).strip()
                href = await link_el.get_attribute("href") or ""
                url = f"https://www.indeed.com{href}" if href.startswith("/") else href
                if self.db.already_seen(url):
                    continue
                listings.append(Application(
                    id=self._make_id("indeed", url),
                    source="indeed",
                    title=job_title,
                    company=company,
                    url=url,
                ))
            except Exception:
                continue
        await page.close()
        return listings
