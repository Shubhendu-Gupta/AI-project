import asyncio
import functools
import json
import urllib.parse

import anthropic

from src.discovery.base import BaseDiscovery
from src.tracker.db import Application, ApplicationDB


class CareerPageDiscovery(BaseDiscovery):
    def __init__(self, browser, search_config, db, profile_dir, llm_client=None):
        super().__init__(browser, search_config, db, profile_dir)
        self._client = llm_client if llm_client else anthropic.Anthropic()

    async def discover(self) -> list[Application]:
        return []  # driven externally via search_company()

    async def search_company(self, company_url: str) -> list[Application]:
        page = await self.browser.new_page()
        try:
            await page.goto(company_url)
            careers_url = await self._find_careers_link(page, company_url)
            if careers_url:
                await page.goto(careers_url)
            dom = await page.content()
            listings = await self._extract_jobs(dom, company_url)
        except Exception:
            await page.close()
            return []
        await page.close()
        return listings

    async def _find_careers_link(self, page, base_url: str) -> str | None:
        content = await page.content()
        prompt = (
            f"In this HTML, find the URL for the careers/jobs page. "
            f"Return ONLY the URL string, nothing else. If not found, return null.\n\nHTML:\n{content[:4000]}"
        )
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            None,
            functools.partial(
                self._client.messages.create,
                model="claude-sonnet-4-6",
                max_tokens=100,
                messages=[{"role": "user", "content": prompt}],
            ),
        )
        result = response.content[0].text.strip()
        if result.lower() in ("null", "none", ""):
            return None
        if result.startswith("/"):
            parsed = urllib.parse.urlparse(base_url)
            return f"{parsed.scheme}://{parsed.netloc}{result}"
        return result

    async def _extract_jobs(self, dom: str, company_url: str) -> list[Application]:
        titles = ", ".join(self.search_config.job_titles)
        prompt = (
            f"Extract job listings from this HTML that match: {titles}.\n"
            f"Return JSON array: [{{title, url, location, description}}]\nReturn ONLY JSON.\n\nHTML:\n{dom[:8000]}"
        )
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            None,
            functools.partial(
                self._client.messages.create,
                model="claude-sonnet-4-6",
                max_tokens=2000,
                messages=[{"role": "user", "content": prompt}],
            ),
        )
        try:
            data = json.loads(response.content[0].text.strip())
        except json.JSONDecodeError:
            return []
        parsed = urllib.parse.urlparse(company_url)
        company_name = parsed.netloc.replace("www.", "")
        results = []
        for item in data:
            title = item.get("title", "")
            if not title:
                continue
            if any(kw.lower() in title.lower() for kw in self.search_config.exclude_keywords):
                continue
            url = item.get("url", "")
            if url.startswith("/"):
                url = f"{parsed.scheme}://{parsed.netloc}{url}"
            if self.db.already_seen(url):
                continue
            results.append(Application(
                id=self._make_id("career_page", url),
                source="career_page",
                title=title,
                company=company_name,
                url=url,
            ))
        return results
