import pathlib
import pytest
from unittest.mock import AsyncMock, MagicMock

from src.discovery.career_page import CareerPageDiscovery
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


def make_llm_client(response_text: str):
    """Build a minimal mock that mimics the anthropic.Anthropic().messages.create() interface."""
    content_block = MagicMock()
    content_block.text = response_text
    message = MagicMock()
    message.content = [content_block]
    client = MagicMock()
    client.messages.create = MagicMock(return_value=message)
    return client


@pytest.mark.asyncio
async def test_search_company_returns_list(tmp_path):
    """search_company() returns a list when LLM returns empty JSON array."""
    browser = MagicMock()
    page = MagicMock()
    page.goto = AsyncMock()
    page.content = AsyncMock(return_value="<html><body>careers</body></html>")
    page.close = AsyncMock()
    browser.new_page = AsyncMock(return_value=page)

    # LLM: first call returns null (no careers link), second returns []
    llm = make_llm_client("null")
    # Override to handle two calls
    call_responses = ["null", "[]"]
    call_index = {"i": 0}

    def create_side_effect(**kwargs):
        idx = call_index["i"]
        call_index["i"] += 1
        text = call_responses[idx] if idx < len(call_responses) else "[]"
        content_block = MagicMock()
        content_block.text = text
        message = MagicMock()
        message.content = [content_block]
        return message

    llm.messages.create = MagicMock(side_effect=create_side_effect)

    discovery = CareerPageDiscovery(
        browser=browser,
        search_config=make_search_config(),
        db=make_db(tmp_path),
        profile_dir=tmp_path,
        llm_client=llm,
    )
    results = await discovery.search_company("https://example.com")
    assert isinstance(results, list)
    assert results == []
