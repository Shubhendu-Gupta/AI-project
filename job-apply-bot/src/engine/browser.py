import pathlib
from playwright.async_api import async_playwright, BrowserContext

PROFILES_DIR = pathlib.Path(__file__).parent.parent.parent / "browser_profiles"


class BrowserSession:
    def __init__(self, source: str, profiles_dir: pathlib.Path = PROFILES_DIR):
        self.source = source
        self.profiles_dir = pathlib.Path(profiles_dir)
        self._playwright = None
        self._context: BrowserContext | None = None

    def profile_path(self) -> pathlib.Path:
        return self.profiles_dir / self.source

    async def start(self) -> BrowserContext:
        """Launch persistent browser context. Returns the context (which acts like a browser)."""
        path = self.profile_path()
        path.mkdir(parents=True, exist_ok=True)
        self._playwright = await async_playwright().start()
        self._context = await self._playwright.chromium.launch_persistent_context(
            str(path),
            headless=False,
            args=["--disable-blink-features=AutomationControlled"],
        )
        return self._context

    async def stop(self) -> None:
        if self._context:
            await self._context.close()
            self._context = None
        if self._playwright:
            await self._playwright.stop()
            self._playwright = None

    async def __aenter__(self) -> BrowserContext:
        return await self.start()

    async def __aexit__(self, *args) -> None:
        await self.stop()
