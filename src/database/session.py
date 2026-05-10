"""Database session management."""
from contextlib import contextmanager
from typing import Generator

from sqlalchemy.orm import Session

from src.database.models import SessionLocal


@contextmanager
def get_db_session() -> Generator[Session, None, None]:
    """Get a database session as a context manager.

    Yields:
        SQLAlchemy Session object.

    Example:
        with get_db_session() as db:
            db.query(Property).all()
    """
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def get_db() -> Generator[Session, None, None]:
    """Get a database session for FastAPI dependency injection.

    Yields:
        SQLAlchemy Session object.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
