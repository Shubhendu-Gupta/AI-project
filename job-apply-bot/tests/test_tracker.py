"""Unit tests for ApplicationDB."""
import pathlib
import pytest

from src.tracker.db import Application, ApplicationDB


@pytest.fixture()
def db(tmp_path: pathlib.Path) -> ApplicationDB:
    """Return an ApplicationDB backed by a temporary file."""
    return ApplicationDB(db_path=tmp_path / 'test_applications.db')


def _make_app(n: int = 1) -> Application:
    return Application(
        id=f'testid{n:03d}',
        source='test',
        title=f'Engineer {n}',
        company=f'Company {n}',
        url=f'https://example.com/job/{n}',
    )


class TestUpsert:
    def test_upsert_creates_row(self, db: ApplicationDB) -> None:
        app = _make_app(1)
        db.upsert(app)
        rows = db.get_all()
        assert len(rows) == 1
        row = rows[0]
        assert row.id == app.id
        assert row.title == app.title
        assert row.company == app.company
        assert row.url == app.url
        assert row.status == 'pending'

    def test_upsert_replaces_existing(self, db: ApplicationDB) -> None:
        app = _make_app(1)
        db.upsert(app)
        # Upsert same id with updated title
        updated = Application(
            id=app.id,
            source='test',
            title='Updated Title',
            company=app.company,
            url=app.url,
            status='pending',
        )
        db.upsert(updated)
        rows = db.get_all()
        assert len(rows) == 1
        assert rows[0].title == 'Updated Title'

    def test_upsert_multiple_rows(self, db: ApplicationDB) -> None:
        for i in range(1, 4):
            db.upsert(_make_app(i))
        rows = db.get_all()
        assert len(rows) == 3


class TestAlreadySeen:
    def test_returns_false_for_unknown_url(self, db: ApplicationDB) -> None:
        assert db.already_seen('https://unknown.example.com/job/99') is False

    def test_returns_true_after_upsert(self, db: ApplicationDB) -> None:
        app = _make_app(1)
        db.upsert(app)
        assert db.already_seen(app.url) is True

    def test_returns_false_for_different_url(self, db: ApplicationDB) -> None:
        app = _make_app(1)
        db.upsert(app)
        assert db.already_seen('https://example.com/job/999') is False


class TestMarkApplied:
    def test_mark_applied_updates_status(self, db: ApplicationDB) -> None:
        app = _make_app(1)
        db.upsert(app)
        db.mark_applied(app.id, screenshot_path='/tmp/shot.png')
        rows = db.get_all()
        assert rows[0].status == 'applied'
        assert rows[0].screenshot_path == '/tmp/shot.png'
        assert rows[0].applied_at is not None

    def test_mark_applied_without_screenshot(self, db: ApplicationDB) -> None:
        app = _make_app(1)
        db.upsert(app)
        db.mark_applied(app.id)
        rows = db.get_all()
        assert rows[0].status == 'applied'

    def test_mark_failed(self, db: ApplicationDB) -> None:
        app = _make_app(1)
        db.upsert(app)
        db.mark_failed(app.id, notes='timed out')
        rows = db.get_all()
        assert rows[0].status == 'failed'
        assert rows[0].notes == 'timed out'

    def test_mark_skipped(self, db: ApplicationDB) -> None:
        app = _make_app(1)
        db.upsert(app)
        db.mark_skipped(app.id, notes='dry-run')
        rows = db.get_all()
        assert rows[0].status == 'skipped'
        assert rows[0].notes == 'dry-run'


class TestStats:
    def test_empty_db_all_zeros(self, db: ApplicationDB) -> None:
        stats = db.stats()
        assert stats == {'total': 0, 'applied': 0, 'failed': 0, 'skipped': 0, 'pending': 0}

    def test_stats_counts_correctly(self, db: ApplicationDB) -> None:
        # Insert 4 jobs with mixed statuses
        app1 = _make_app(1)
        app2 = _make_app(2)
        app3 = _make_app(3)
        app4 = _make_app(4)
        for app in (app1, app2, app3, app4):
            db.upsert(app)

        db.mark_applied(app1.id)
        db.mark_applied(app2.id)
        db.mark_failed(app3.id)
        # app4 remains pending

        stats = db.stats()
        assert stats['total'] == 4
        assert stats['applied'] == 2
        assert stats['failed'] == 1
        assert stats['skipped'] == 0
        assert stats['pending'] == 1

    def test_stats_after_upsert_and_update(self, db: ApplicationDB) -> None:
        app = _make_app(1)
        db.upsert(app)
        assert db.stats()['pending'] == 1
        db.mark_skipped(app.id)
        stats = db.stats()
        assert stats['pending'] == 0
        assert stats['skipped'] == 1


class TestGetAll:
    def test_get_all_no_filter(self, db: ApplicationDB) -> None:
        for i in range(1, 4):
            db.upsert(_make_app(i))
        db.mark_applied(_make_app(1).id)
        rows = db.get_all()
        assert len(rows) == 3

    def test_get_all_filtered_by_status(self, db: ApplicationDB) -> None:
        for i in range(1, 4):
            db.upsert(_make_app(i))
        db.mark_applied(_make_app(1).id)
        db.mark_failed(_make_app(2).id)

        applied = db.get_all(status='applied')
        assert len(applied) == 1
        assert applied[0].status == 'applied'

        pending = db.get_all(status='pending')
        assert len(pending) == 1
        assert pending[0].status == 'pending'
