import pathlib
import pytest
from unittest.mock import AsyncMock, MagicMock

from src.discovery.glassdoor import GlassdoorDiscovery
from src.discovery.naukri import NaukriDiscovery
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
async def test_glassdoor_returns_list(tmp_path):
    """GlassdoorDiscovery.discover() returns a list (empty on timeout)."""
    browser = MagicMock()
    page = MagicMock()
    page.goto = AsyncMock()
    page.wait_for_selector = AsyncMock(side_effect=Exception("timeout"))
    page.close = AsyncMock()
    browser.new_page = AsyncMock(return_value=page)

    discovery = GlassdoorDiscovery(
        browser=browser,
        search_config=make_search_config(),
        db=make_db(tmp_path),
        profile_dir=tmp_path,
    )
    results = await discovery.discover()
    assert isinstance(results, list)
    assert results == []


@pytest.mark.asyncio
async def test_naukri_returns_list(tmp_path):
    """NaukriDiscovery.discover() returns a list (empty on timeout)."""
    browser = MagicMock()
    page = MagicMock()
    page.goto = AsyncMock()
    page.wait_for_selector = AsyncMock(side_effect=Exception("timeout"))
    page.close = AsyncMock()
    browser.new_page = AsyncMock(return_value=page)

    discovery = NaukriDiscovery(
        browser=browser,
        search_config=make_search_config(),
        db=make_db(tmp_path),
        profile_dir=tmp_path,
    )
    results = await discovery.discover()
    assert isinstance(results, list)
    assert results == []
