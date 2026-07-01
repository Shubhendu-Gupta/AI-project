import pytest
from unittest.mock import AsyncMock, MagicMock

from src.engine.captcha import is_captcha_present, CAPTCHA_SELECTORS


@pytest.mark.asyncio
async def test_detects_hcaptcha():
    """Returns True when an hCAPTCHA iframe is found on the page."""
    page = MagicMock()
    mock_element = MagicMock()

    async def query_selector(selector):
        if "hcaptcha" in selector:
            return mock_element
        return None

    page.query_selector = query_selector
    result = await is_captcha_present(page)
    assert result is True


@pytest.mark.asyncio
async def test_detects_recaptcha():
    """Returns True when a reCAPTCHA iframe is found on the page."""
    page = MagicMock()
    mock_element = MagicMock()

    async def query_selector(selector):
        if "recaptcha" in selector:
            return mock_element
        return None

    page.query_selector = query_selector
    result = await is_captcha_present(page)
    assert result is True


@pytest.mark.asyncio
async def test_no_captcha():
    """Returns False when no CAPTCHA selectors are found."""
    page = MagicMock()

    async def query_selector(selector):
        return None

    page.query_selector = query_selector
    result = await is_captcha_present(page)
    assert result is False
