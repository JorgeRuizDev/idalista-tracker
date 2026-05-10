"""SQLAlchemy models for the Gmail Property Crawler."""
from datetime import datetime
from typing import List, Optional

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    create_engine,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship, sessionmaker

from src.config import settings


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy models."""

    pass


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
    """Represents a real estate listing discovered from idealista emails."""

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
    email_id: Mapped[int] = mapped_column(
        ForeignKey("email_source.id"), nullable=False
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

    # Relationships
    email: Mapped["EmailSource"] = relationship(back_populates="properties")
    price_history: Mapped[List["PriceHistory"]] = relationship(
        back_populates="property",
        order_by="desc(PriceHistory.change_date)",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<Property(id={self.id}, idealista_id={self.idealista_id}, title={self.title[:30]}...)>"


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
