import sqlite3
import pathlib
import contextlib
from dataclasses import dataclass, field
from typing import Optional
from datetime import datetime, timezone

DB_PATH = pathlib.Path(__file__).parent.parent.parent / 'data' / 'applications.db'


@dataclass
class Application:
    id: str
    source: str
    title: str
    company: str
    url: str
    status: str = 'pending'
    applied_at: Optional[str] = None
    screenshot_path: Optional[str] = None
    notes: Optional[str] = None


class ApplicationDB:
    def __init__(self, db_path: pathlib.Path = DB_PATH):
        self.db_path = pathlib.Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_schema()

    @contextlib.contextmanager
    def _connect(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

    def _init_schema(self) -> None:
        with self._connect() as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS applications (
                    id              TEXT PRIMARY KEY,
                    source          TEXT NOT NULL,
                    title           TEXT NOT NULL,
                    company         TEXT NOT NULL,
                    url             TEXT UNIQUE NOT NULL,
                    status          TEXT NOT NULL DEFAULT 'pending',
                    applied_at      TEXT,
                    screenshot_path TEXT,
                    notes           TEXT
                )
            """)

    def upsert(self, app: Application) -> None:
        with self._connect() as conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO applications
                    (id, source, title, company, url, status, applied_at, screenshot_path, notes)
                VALUES
                    (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    app.id,
                    app.source,
                    app.title,
                    app.company,
                    app.url,
                    app.status,
                    app.applied_at,
                    app.screenshot_path,
                    app.notes,
                ),
            )

    def mark_applied(self, app_id: str, screenshot_path: str = None) -> None:
        now = datetime.now(timezone.utc).isoformat()
        with self._connect() as conn:
            conn.execute(
                """
                UPDATE applications
                SET status = 'applied', applied_at = ?, screenshot_path = ?
                WHERE id = ?
                """,
                (now, screenshot_path, app_id),
            )

    def mark_failed(self, app_id: str, notes: str = '') -> None:
        with self._connect() as conn:
            conn.execute(
                "UPDATE applications SET status = 'failed', notes = ? WHERE id = ?",
                (notes, app_id),
            )

    def mark_skipped(self, app_id: str, notes: str = '') -> None:
        with self._connect() as conn:
            conn.execute(
                "UPDATE applications SET status = 'skipped', notes = ? WHERE id = ?",
                (notes, app_id),
            )

    def already_seen(self, url: str) -> bool:
        with self._connect() as conn:
            row = conn.execute(
                "SELECT 1 FROM applications WHERE url = ? LIMIT 1", (url,)
            ).fetchone()
        return row is not None

    def get_all(self, status: str = None) -> list[Application]:
        with self._connect() as conn:
            if status is not None:
                rows = conn.execute(
                    "SELECT * FROM applications WHERE status = ? ORDER BY rowid DESC",
                    (status,),
                ).fetchall()
            else:
                rows = conn.execute(
                    "SELECT * FROM applications ORDER BY rowid DESC"
                ).fetchall()
        return [
            Application(
                id=row['id'],
                source=row['source'],
                title=row['title'],
                company=row['company'],
                url=row['url'],
                status=row['status'],
                applied_at=row['applied_at'],
                screenshot_path=row['screenshot_path'],
                notes=row['notes'],
            )
            for row in rows
        ]

    def stats(self) -> dict:
        with self._connect() as conn:
            rows = conn.execute(
                "SELECT status, COUNT(*) AS cnt FROM applications GROUP BY status"
            ).fetchall()

        counts = {row['status']: row['cnt'] for row in rows}
        total = sum(counts.values())
        return {
            'total': total,
            'applied': counts.get('applied', 0),
            'failed': counts.get('failed', 0),
            'skipped': counts.get('skipped', 0),
            'pending': counts.get('pending', 0),
        }
