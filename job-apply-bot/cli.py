import asyncio
import logging
import pathlib

import click
from rich.console import Console
from rich.table import Table
from rich.text import Text

console = Console()
logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(name)s: %(message)s')
logger = logging.getLogger(__name__)

BROWSER_PROFILES_DIR = pathlib.Path(__file__).parent / 'browser_profiles'
SCREENSHOTS_DIR = pathlib.Path(__file__).parent / 'screenshots'


@click.group()
def cli():
    """Job application bot — discover and apply to jobs automatically."""


@cli.command()
@click.option('--dry-run', is_flag=True, help='Discover but do not apply')
@click.option('--limit', default=10, show_default=True, help='Max applications per run')
@click.option(
    '--source',
    default='linkedin',
    type=click.Choice(['linkedin']),
    show_default=True,
    help='Job source to scrape',
)
def run(dry_run: bool, limit: int, source: str) -> None:
    """Discover and apply to jobs."""
    asyncio.run(_run(dry_run, limit, source))


async def _run(dry_run: bool, limit: int, source: str) -> None:
    """Load config, open browser, discover jobs, apply (unless dry_run)."""
    from playwright.async_api import async_playwright
    from src.profile.loader import load_profile, load_search_config, load_qa_bank
    from src.tracker.db import ApplicationDB
    from src.qa.answerer import QAAnswerer
    from src.engine.applicator import Applicator
    from src.notifications.notifier import Notifier

    try:
        profile = load_profile()
        search_config = load_search_config()
        qa_bank = load_qa_bank()
    except (ValueError, FileNotFoundError) as exc:
        console.print(f"[bold red]Configuration error:[/bold red] {exc}")
        return

    db = ApplicationDB()
    notifier = Notifier()
    answerer = QAAnswerer(profile, qa_bank)

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        try:
            # Select discovery source
            if source == 'linkedin':
                from src.discovery.linkedin import LinkedInDiscovery
                discoverer = LinkedInDiscovery(browser, search_config, db, BROWSER_PROFILES_DIR)
            else:
                console.print(f"[bold red]Unknown source:[/bold red] {source}")
                return

            console.print(f"[bold]Discovering jobs from {source}...[/bold]")
            applications = await discoverer.discover()

            if not applications:
                console.print("[yellow]No new jobs found.[/yellow]")
                notifier.summary(db.stats())
                return

            # Persist discovered jobs
            for app in applications:
                db.upsert(app)
                notifier.job_found(app)

            applied_count = 0
            applicator = Applicator(browser, profile, db, answerer, SCREENSHOTS_DIR)

            for app in applications[:limit]:
                if dry_run:
                    notifier.skipped(app, reason='dry-run mode')
                    db.mark_skipped(app.id, notes='dry-run')
                    continue

                console.print(f"\n[bold]Applying to:[/bold] {app.title} at {app.company}")
                success = await applicator.apply(app)
                if success:
                    notifier.applied(app)
                    applied_count += 1
                else:
                    notifier.failed(app, reason='See logs for details')

            console.print(
                f"\n[bold]Run complete.[/bold] "
                f"Discovered: {len(applications)}, Applied: {applied_count}"
            )
        finally:
            await browser.close()

    notifier.summary(db.stats())


@cli.command()
def status() -> None:
    """Show application statistics."""
    from src.tracker.db import ApplicationDB
    from src.notifications.notifier import Notifier

    db = ApplicationDB()
    notifier = Notifier()
    notifier.summary(db.stats())


@cli.command()
def report() -> None:
    """Print full application log as a rich table."""
    from src.tracker.db import ApplicationDB

    db = ApplicationDB()
    applications = db.get_all()

    if not applications:
        console.print("[yellow]No applications recorded yet.[/yellow]")
        return

    table = Table(title="All Applications", show_header=True, header_style="bold magenta")
    table.add_column("ID", style="dim", min_width=12)
    table.add_column("Source", min_width=10)
    table.add_column("Title", min_width=25)
    table.add_column("Company", min_width=20)
    table.add_column("Status", min_width=10)
    table.add_column("Applied At", min_width=20)

    status_styles = {
        'applied': 'green',
        'pending': 'cyan',
        'failed':  'red',
        'skipped': 'yellow',
    }

    for app in applications:
        style = status_styles.get(app.status, 'white')
        table.add_row(
            app.id,
            app.source,
            app.title,
            app.company,
            Text(app.status, style=style),
            app.applied_at or '—',
        )

    console.print(table)


if __name__ == '__main__':
    cli()
