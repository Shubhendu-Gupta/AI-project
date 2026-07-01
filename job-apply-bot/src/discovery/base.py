import hashlib
import pathlib
from abc import ABC, abstractmethod

from playwright.async_api import Browser

from src.profile.loader import SearchConfig
from src.tracker.db import Application, ApplicationDB


class BaseDiscovery(ABC):
    def __init__(
        self,
        browser: Browser,
        search_config: SearchConfig,
        db: ApplicationDB,
        profile_dir: pathlib.Path,
    ):
        self.browser = browser
        self.search_config = search_config
        self.db = db
        self.profile_dir = pathlib.Path(profile_dir)

    @abstractmethod
    async def discover(self) -> list[Application]:
        """Discover and return new (not already seen) Application objects."""
        ...

    def _make_id(self, source: str, url: str) -> str:
        """Return a stable ID: sha256(url)[:12]."""
        return hashlib.sha256(url.encode()).hexdigest()[:12]
