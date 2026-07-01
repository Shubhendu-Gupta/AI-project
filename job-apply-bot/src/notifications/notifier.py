import logging

from rich.console import Console
from rich.table import Table
from rich.text import Text

from src.tracker.db import Application

logger = logging.getLogger(__name__)

console = Console()


class Notifier:
    def job_found(self, app: Application) -> None:
        console.print(
            f"[bold cyan]FOUND[/bold cyan]  "
            f"[white]{app.title}[/white] at [green]{app.company}[/green]  "
            f"[dim]{app.url}[/dim]"
        )

    def applied(self, app: Application) -> None:
        console.print(
            f"[bold green]APPLIED[/bold green] "
            f"[white]{app.title}[/white] at [green]{app.company}[/green]  "
            f"[dim]{app.url}[/dim]"
        )

    def failed(self, app: Application, reason: str) -> None:
        console.print(
            f"[bold red]FAILED[/bold red]  "
            f"[white]{app.title}[/white] at [green]{app.company}[/green]  "
            f"[dim]{reason}[/dim]"
        )

    def skipped(self, app: Application, reason: str) -> None:
        console.print(
            f"[bold yellow]SKIPPED[/bold yellow] "
            f"[white]{app.title}[/white] at [green]{app.company}[/green]  "
            f"[dim]{reason}[/dim]"
        )

    def summary(self, stats: dict) -> None:
        """Print a rich Table with status counts."""
        table = Table(title="Application Summary", show_header=True, header_style="bold magenta")
        table.add_column("Status", style="bold", min_width=10)
        table.add_column("Count", justify="right", min_width=8)

        status_styles = {
            'total':   ('Total',   'white'),
            'applied': ('Applied', 'green'),
            'pending': ('Pending', 'cyan'),
            'failed':  ('Failed',  'red'),
            'skipped': ('Skipped', 'yellow'),
        }

        for key, (label, style) in status_styles.items():
            count = stats.get(key, 0)
            table.add_row(
                Text(label, style=style),
                Text(str(count), style=style),
            )

        console.print(table)
