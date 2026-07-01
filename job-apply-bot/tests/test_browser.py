import pathlib
import pytest

from src.engine.browser import BrowserSession, PROFILES_DIR


def test_profile_path_default():
    """profile_path() ends with 'browser_profiles/linkedin' for default dir."""
    session = BrowserSession("linkedin")
    path = session.profile_path()
    assert path.parts[-1] == "linkedin"
    assert path.parts[-2] == "browser_profiles"


def test_profile_path_custom(tmp_path):
    """profile_path() uses a custom profiles_dir when provided."""
    session = BrowserSession("indeed", profiles_dir=tmp_path)
    path = session.profile_path()
    assert path == tmp_path / "indeed"


@pytest.mark.asyncio
async def test_profile_dir_created(tmp_path):
    """BrowserSession.start() creates the profile directory."""
    from unittest.mock import AsyncMock, patch

    session = BrowserSession("test_source", profiles_dir=tmp_path / "profiles")

    mock_context = AsyncMock()
    mock_playwright = AsyncMock()
    mock_playwright.chromium.launch_persistent_context = AsyncMock(return_value=mock_context)

    with patch("src.engine.browser.async_playwright") as mock_ap:
        mock_ap_instance = AsyncMock()
        mock_ap_instance.start = AsyncMock(return_value=mock_playwright)
        mock_ap.return_value = mock_ap_instance

        await session.start()

    assert (tmp_path / "profiles" / "test_source").exists()
    assert (tmp_path / "profiles" / "test_source").is_dir()
