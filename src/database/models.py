"""SQLAlchemy models for the Gmail Property Crawler."""
from datetime import datetime
from typing import List, Optional

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Table,
    Text,
    create_engine,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship, sessionmaker

from src.config import settings


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy models."""

    pass


# Association table for many-to-many relationship between CrawlSession and Property
crawl_session_property = Table(
    "crawl_session_property",
    Base.metadata,
    Column("crawl_session_id", ForeignKey("crawl_session.id"), primary_key=True),
    Column("property_id", ForeignKey("property.id"), primary_key=True),
)


class EmailSource(Base):
    """Represents an email from which properties were extracted."""

    __tablename__ = "email_source"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    message_id: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    sender: Mapped[str] = mapped_column(String(255), nullable=False)
    subject: Mapped[str] = mapped_column(String(500), nullable=False)
    received_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    processed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    properties_count: Mapped[int] = mapped_column(Integer, default=0)
    raw_content: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    properties: Mapped[List["Property"]] = relationship(
        back_populates="email", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<EmailSource(id={self.id}, message_id={self.message_id[:20]}..., status={self.status})>"


class Property(Base):
    """Represents a real estate listing discovered from idealista emails or extension crawler."""

    __tablename__ = "property"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    idealista_id: Mapped[str] = mapped_column(
        String(20), unique=True, index=True, nullable=False
    )
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    property_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    location: Mapped[str] = mapped_column(String(500), nullable=False)
    original_price: Mapped[int] = mapped_column(Integer, nullable=False)
    current_price: Mapped[int] = mapped_column(Integer, nullable=False)
    price_drop_percentage: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    size_m2: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    bedrooms: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    floor: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    has_elevator: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    property_url: Mapped[str] = mapped_column(String(500), nullable=False)
    image_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    email_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("email_source.id"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, index=True, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Extension crawler fields
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="active"
    )  # "active", "missing", "sold"
    first_seen_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
    last_seen_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
    missing_since: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Relationships
    email: Mapped[Optional["EmailSource"]] = relationship(back_populates="properties")
    price_history: Mapped[List["PriceHistory"]] = relationship(
        back_populates="property",
        order_by="desc(PriceHistory.change_date)",
        cascade="all, delete-orphan",
    )
    visibility_history: Mapped[List["PropertyVisibility"]] = relationship(
        back_populates="property",
        order_by="desc(PropertyVisibility.timestamp)",
        cascade="all, delete-orphan",
    )
    attribute_changes: Mapped[List["PropertyChange"]] = relationship(
        back_populates="property",
        order_by="desc(PropertyChange.timestamp)",
        cascade="all, delete-orphan",
    )
    crawl_sessions: Mapped[List["CrawlSession"]] = relationship(
        secondary=crawl_session_property,
        back_populates="properties",
    )

    def __repr__(self) -> str:
        return f"<Property(id={self.id}, idealista_id={self.idealista_id}, title={self.title[:30]}...)>"


class CrawlSession(Base):
    """Represents a single crawling operation."""

    __tablename__ = "crawl_session"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # Session timing
    started_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    ended_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Status: running, completed, paused, failed
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="running")

    # Configuration used
    server_url: Mapped[str] = mapped_column(String(500), nullable=False)
    human_like_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    extension_version: Mapped[str] = mapped_column(String(20), nullable=False)

    # Statistics
    total_properties: Mapped[int] = mapped_column(Integer, default=0)
    pages_processed: Mapped[int] = mapped_column(Integer, default=0)
    searches_crawled: Mapped[int] = mapped_column(Integer, default=0)
    errors_count: Mapped[int] = mapped_column(Integer, default=0)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    properties: Mapped[List["Property"]] = relationship(
        secondary=crawl_session_property,
        back_populates="crawl_sessions",
    )
    visibility_events: Mapped[List["PropertyVisibility"]] = relationship(
        back_populates="crawl_session",
        cascade="all, delete-orphan",
    )
    attribute_changes: Mapped[List["PropertyChange"]] = relationship(
        back_populates="crawl_session",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<CrawlSession(id={self.id}, status={self.status}, started_at={self.started_at})>"


class SavedSearch(Base):
    """Represents a saved search/filter from Idealista."""

    __tablename__ = "saved_search"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # External ID from Idealista
    external_search_id: Mapped[str] = mapped_column(
        String(50), unique=True, nullable=False, index=True
    )

    # Search details
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    url_path: Mapped[str] = mapped_column(String(500), nullable=False)
    full_url: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # Tracking
    result_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    crawl_enabled: Mapped[bool] = mapped_column(Boolean, default=False)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    last_crawled_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Relationships
    visibility_events: Mapped[List["PropertyVisibility"]] = relationship(
        back_populates="saved_search",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<SavedSearch(id={self.id}, external_id={self.external_search_id}, name={self.name[:30]}...)>"


class PropertyVisibility(Base):
    """Tracks when properties are seen or go missing in searches."""

    __tablename__ = "property_visibility"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # Event details
    event_type: Mapped[str] = mapped_column(
        String(20), nullable=False
    )  # "seen" or "missing"

    timestamp: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )

    # Page number when seen (null when missing)
    page_number: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Foreign keys
    property_id: Mapped[int] = mapped_column(
        ForeignKey("property.id"), nullable=False, index=True
    )
    crawl_session_id: Mapped[int] = mapped_column(
        ForeignKey("crawl_session.id"), nullable=False, index=True
    )
    saved_search_id: Mapped[int] = mapped_column(
        ForeignKey("saved_search.id"), nullable=False, index=True
    )

    # Relationships
    property: Mapped["Property"] = relationship(back_populates="visibility_history")
    crawl_session: Mapped["CrawlSession"] = relationship(
        back_populates="visibility_events"
    )
    saved_search: Mapped["SavedSearch"] = relationship(
        back_populates="visibility_events"
    )

    def __repr__(self) -> str:
        return f"<PropertyVisibility(id={self.id}, event_type={self.event_type}, property_id={self.property_id})>"


class PropertyChange(Base):
    """Tracks changes to any property attribute (not just price)."""

    __tablename__ = "property_change"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # What changed
    attribute_name: Mapped[str] = mapped_column(
        String(50), nullable=False
    )  # "title", "size_m2", "bedrooms", "floor", "has_elevator", "description"

    old_value: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    new_value: Mapped[str] = mapped_column(Text, nullable=False)

    # Change type: created, updated
    change_type: Mapped[str] = mapped_column(
        String(20), nullable=False, default="updated"
    )

    timestamp: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )

    # Foreign keys
    property_id: Mapped[int] = mapped_column(
        ForeignKey("property.id"), nullable=False, index=True
    )
    crawl_session_id: Mapped[int] = mapped_column(
        ForeignKey("crawl_session.id"), nullable=False, index=True
    )

    # Relationships
    property: Mapped["Property"] = relationship(back_populates="attribute_changes")
    crawl_session: Mapped["CrawlSession"] = relationship(
        back_populates="attribute_changes"
    )

    def __repr__(self) -> str:
        return f"<PropertyChange(id={self.id}, attribute={self.attribute_name}, property_id={self.property_id})>"


class PriceHistory(Base):
    """Tracks all price changes for a property."""

    __tablename__ = "price_history"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    property_id: Mapped[int] = mapped_column(
        ForeignKey("property.id"), nullable=False
    )
    old_price: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    new_price: Mapped[int] = mapped_column(Integer, nullable=False)
    change_date: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
    change_type: Mapped[str] = mapped_column(
        String(20), nullable=False
    )  # "initial", "update", "drop"
    email_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("email_source.id"), nullable=True
    )

    # Relationships
    property: Mapped["Property"] = relationship(back_populates="price_history")
    email: Mapped[Optional["EmailSource"]] = relationship(
        foreign_keys=[email_id]
    )

    def __repr__(self) -> str:
        return (
            f"<PriceHistory(id={self.id}, property_id={self.property_id}, "
            f"change_type={self.change_type}, new_price={self.new_price})>"
        )


# Create engine
engine = create_engine(
    settings.DATABASE_URL,
    connect_args=settings.database_connection_args,
    echo=settings.LOG_LEVEL == "DEBUG",
)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
