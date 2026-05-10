"""Pydantic schemas for API request/response models."""
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


# ============= Price History Schemas =============


class PriceHistoryBase(BaseModel):
    """Base schema for price history."""

    old_price: Optional[int] = None
    new_price: int
    change_type: str  # "initial", "update", "drop"


class PriceHistoryResponse(PriceHistoryBase):
    """Price history response schema."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    change_date: datetime


# ============= Property Schemas =============


class PropertyBase(BaseModel):
    """Base schema for property."""

    idealista_id: str
    title: str
    property_type: Optional[str] = None
    location: str
    original_price: int
    current_price: int
    price_drop_percentage: Optional[float] = None
    size_m2: Optional[int] = None
    bedrooms: Optional[int] = None
    floor: Optional[str] = None
    has_elevator: Optional[bool] = None
    property_url: str


class PropertyCreate(PropertyBase):
    """Schema for creating a property."""

    email_id: int


class PropertyResponse(PropertyBase):
    """Property response schema."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime
    is_active: bool


class PropertyDetailResponse(PropertyResponse):
    """Property detail response with price history."""

    price_history: List[PriceHistoryResponse] = []


class PropertyListResponse(BaseModel):
    """Paginated property list response."""

    items: List[PropertyResponse]
    total: int
    limit: int
    offset: int


class PropertyPriceDropResponse(BaseModel):
    """Property price drop response (minimal fields)."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    idealista_id: str
    title: str
    location: str
    original_price: int
    current_price: int
    price_drop_percentage: Optional[float]
    property_url: str
    updated_at: datetime


class PropertyPriceDropListResponse(BaseModel):
    """Paginated price drop list response."""

    items: List[PropertyPriceDropResponse]
    total: int
    limit: int
    offset: int


# ============= Email Source Schemas =============


class EmailSourceBase(BaseModel):
    """Base schema for email source."""

    message_id: str
    sender: str
    subject: str
    received_at: datetime


class EmailSourceCreate(EmailSourceBase):
    """Schema for creating an email source."""

    pass


class EmailSourceResponse(EmailSourceBase):
    """Email source response schema."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    processed_at: Optional[datetime] = None
    status: str
    properties_count: int
    error_message: Optional[str] = None


# ============= Crawl Schemas =============


class CrawlTriggerRequest(BaseModel):
    """Request schema for triggering a crawl."""

    full_sync: bool = Field(default=False, description="Re-process all historical emails")


class CrawlTriggerResponse(BaseModel):
    """Response schema for crawl trigger."""

    job_id: str
    status: str
    started_at: datetime
    estimated_completion: datetime


class CrawlStatusResponse(BaseModel):
    """Response schema for crawl status."""

    job_id: Optional[str] = None
    status: str  # "running", "completed", "failed", "idle"
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    emails_processed: int = 0
    properties_found: int = 0
    new_properties: int = 0
    price_updates: int = 0
    errors: int = 0
    next_scheduled_crawl: Optional[datetime] = None


# ============= Stats Schemas =============


class PriceRange(BaseModel):
    """Price range schema."""

    min: int
    max: int


class LastCrawl(BaseModel):
    """Last crawl information schema."""

    completed_at: Optional[datetime] = None
    emails_processed: int = 0
    properties_found: int = 0


class StatsResponse(BaseModel):
    """Statistics response schema."""

    total_properties: int
    active_properties: int
    properties_with_price_drops: int
    average_price: float
    price_range: PriceRange
    last_crawl: LastCrawl
    properties_by_type: dict[str, int]


# ============= Error Schemas =============


class ErrorResponse(BaseModel):
    """Error response schema."""

    error: str
    message: str
    details: dict = {}
    timestamp: datetime
