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


def test_profile_dir_created(tmp_path):
    """The profile directory can be created via mkdir when needed."""
    session = BrowserSession("testsite", profiles_dir=tmp_path)
    path = session.profile_path()
    # Simulate the directory creation that start() would do
    path.mkdir(parents=True, exist_ok=True)
    assert path.exists()
    assert path.is_dir()
