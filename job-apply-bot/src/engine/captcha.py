import sys

# Detect common CAPTCHA patterns
CAPTCHA_SELECTORS = [
    "iframe[src*='hcaptcha']",
    "iframe[src*='recaptcha']",
    ".h-captcha",
    "#cf-challenge-running",
    "[data-sitekey]",
]


async def is_captcha_present(page) -> bool:
    """Return True if any CAPTCHA selector is found on the page."""
    for selector in CAPTCHA_SELECTORS:
        element = await page.query_selector(selector)
        if element:
            return True
    return False


def pause_for_captcha(company: str) -> None:
    """Print bell + message, block until user presses Enter."""
    sys.stdout.write("\a")
    sys.stdout.flush()
    print(f"\n{'='*60}")
    print(f"CAPTCHA detected at {company}")
    print("Solve it in the browser window, then press Enter to continue...")
    print(f"{'='*60}\n")
    input()
