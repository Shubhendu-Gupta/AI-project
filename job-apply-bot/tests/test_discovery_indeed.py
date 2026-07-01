import pathlib
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from src.discovery.indeed import IndeedDiscovery
from src.profile.loader import SearchConfig
from src.tracker.db import ApplicationDB


def make_search_config(**overrides):
    defaults = dict(
        job_titles=["Software Engineer"],
        locations=["Remote"],
        remote_only=True,
        salary_min=100000,
        experience_level="mid",
        exclude_keywords=[],
    )
    defaults.update(overrides)
    return SearchConfig(**defaults)


def make_db(tmp_path):
    return ApplicationDB(db_path=tmp_path / "test.db")


@pytest.mark.asyncio
async def test_discover_returns_list(tmp_path):
    """discover() returns a list (empty when page has no results)."""
    browser = MagicMock()
    page = MagicMock()

    # page.goto and wait_for_selector raise to simulate no results
    page.goto = AsyncMock()
    page.wait_for_selector = AsyncMock(side_effect=Exception("timeout"))
    page.close = AsyncMock()
    browser.new_page = AsyncMock(return_value=page)

    search_config = make_search_config()
    db = make_db(tmp_path)

    discovery = IndeedDiscovery(
        browser=browser,
        search_config=search_config,
        db=db,
        profile_dir=tmp_path,
    )
    results = await discovery.discover()
    assert isinstance(results, list)
    assert results == []


@pytest.mark.asyncio
async def test_discover_filters_excluded_keywords(tmp_path):
    """Jobs whose title contains an excluded keyword are not returned."""
    browser = MagicMock()
    page = MagicMock()

    # Mock the card elements
    title_el = MagicMock()
    title_el.inner_text = AsyncMock(return_value="Principal Engineer")
    company_el = MagicMock()
    company_el.inner_text = AsyncMock(return_value="Acme Corp")
    link_el = MagicMock()
    link_el.get_attribute = AsyncMock(return_value="/jobs/view/123")

    card = MagicMock()

    async def card_query_selector(selector):
        if selector == "h2":
            return title_el
        if selector == ".companyName":
            return company_el
        if selector == "a":
            return link_el
        return None

    card.query_selector = card_query_selector

    page.goto = AsyncMock()
    page.wait_for_selector = AsyncMock()
    page.query_selector_all = AsyncMock(return_value=[card])
    page.close = AsyncMock()
    browser.new_page = AsyncMock(return_value=page)

    search_config = make_search_config(exclude_keywords=["Principal"])
    db = make_db(tmp_path)

    discovery = IndeedDiscovery(
        browser=browser,
        search_config=search_config,
        db=db,
        profile_dir=tmp_path,
    )
    results = await discovery.discover()
    assert isinstance(results, list)
    assert all("Principal" not in app.title for app in results)
    assert results == []
