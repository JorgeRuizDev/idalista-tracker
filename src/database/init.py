"""Database initialization script."""
import logging

from src.database.models import Base, engine

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def init_database() -> None:
    """Initialize the database by creating all tables."""
    logger.info("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables created successfully.")


if __name__ == "__main__":
    init_database()
