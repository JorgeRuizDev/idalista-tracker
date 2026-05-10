"""FastAPI dependencies."""
from typing import Generator

from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from src.database.session import get_db


# Re-export get_db for convenience
__all__ = ["get_db", "get_db_session_dep"]


def get_db_session_dep(db: Session = Depends(get_db)) -> Generator[Session, None, None]:
    """Dependency for getting a database session.

    Args:
        db: Database session from get_db.

    Yields:
        SQLAlchemy Session.
    """
    yield db
