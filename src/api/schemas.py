"""Pydantic schemas for API request/response models."""
from datetime import datetime
from typing import Any, List, Optional

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


# ============= Extension Crawler Schemas =============


class SavedSearchBase(BaseModel):
    """Base schema for saved search."""

    external_search_id: str
    name: str
    url_path: str
    full_url: str
    description: Optional[str] = None
    result_count: Optional[int] = None


class SavedSearchCreate(SavedSearchBase):
    """Schema for creating a saved search."""

    pass


class SavedSearchUpdate(BaseModel):
    """Schema for updating a saved search."""

    name: Optional[str] = None
    result_count: Optional[int] = None
    is_active: Optional[bool] = None
    crawl_enabled: Optional[bool] = None


class SavedSearchResponse(SavedSearchBase):
    """Saved search response schema."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    is_active: bool
    crawl_enabled: bool
    created_at: datetime
    last_crawled_at: Optional[datetime] = None


class SavedSearchSyncRequest(BaseModel):
    """Request schema for syncing saved searches from extension."""

    searches: List[SavedSearchCreate]


class SavedSearchSyncResponse(BaseModel):
    """Response schema for saved search sync."""

    synced: int
    created: int
    updated: int


class CrawlSessionBase(BaseModel):
    """Base schema for crawl session."""

    server_url: str
    human_like_enabled: bool = True
    extension_version: str


class CrawlSessionCreate(CrawlSessionBase):
    """Schema for creating a crawl session."""

    selected_search_ids: List[int] = []


class CrawlSessionResponse(CrawlSessionBase):
    """Crawl session response schema."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    status: str  # "running", "completed", "paused", "failed"
    started_at: datetime
    ended_at: Optional[datetime] = None
    total_properties: int = 0
    pages_processed: int = 0
    searches_crawled: int = 0
    errors_count: int = 0
    created_at: datetime


class CrawlSessionCompleteRequest(BaseModel):
    """Request schema for completing a crawl session."""

    total_properties: int
    pages_processed: int
    searches_crawled: int


class PropertyVisibilityResponse(BaseModel):
    """Property visibility event response schema."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    event_type: str  # "seen" or "missing"
    timestamp: datetime
    page_number: Optional[int] = None
    property_id: int
    crawl_session_id: int
    saved_search_id: int


class PropertyChangeResponse(BaseModel):
    """Property change event response schema."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    attribute_name: str
    old_value: Optional[str] = None
    new_value: str
    change_type: str  # "created" or "updated"
    timestamp: datetime
    property_id: int
    crawl_session_id: int


# ============= Batch Ingestion Schemas =============


class PropertyData(BaseModel):
    """Property data from extension batch ingestion."""

    external_id: str
    title: str
    price: int = Field(ge=0)
    currency: str = "EUR"
    location: str
    url: str
    square_meters: Optional[int] = Field(default=None, ge=0)
    bedrooms: Optional[int] = Field(default=None, ge=0)
    floor_info: Optional[str] = None
    description: Optional[str] = Field(default=None, max_length=2000)
    photos: List[str] = []


class BatchIngestionMetadata(BaseModel):
    """Metadata for batch ingestion."""

    crawled_at: datetime
    extension_version: str
    human_like_used: bool


class BatchIngestionRequest(BaseModel):
    """Request schema for batch property ingestion."""

    session_id: int
    search_id: int
    external_search_id: str
    page: int = Field(ge=1)
    properties: List[PropertyData]
    metadata: BatchIngestionMetadata


class PropertyChangeInfo(BaseModel):
    """Property change information in batch response."""

    attribute: str
    old_value: Optional[Any] = None
    new_value: Optional[Any] = None


class PropertyResult(BaseModel):
    """Individual property result from batch processing."""

    external_id: str
    action: str  # "created", "updated", "seen", "error"
    property_id: Optional[int] = None
    changes: List[PropertyChangeInfo] = []


class PropertyError(BaseModel):
    """Property error information."""

    external_id: Optional[str] = None
    index: int
    code: str
    message: str
    field: Optional[str] = None


class BatchIngestionSummary(BaseModel):
    """Summary of batch ingestion operations."""

    total_received: int
    created: int
    updated: int
    seen: int
    invalid: int


class BatchIngestionMeta(BaseModel):
    """Processing metadata for batch ingestion."""

    processed_at: datetime
    processing_time_ms: int
    api_version: str


class BatchIngestionResponse(BaseModel):
    """Response schema for batch property ingestion."""

    success: bool
    summary: BatchIngestionSummary
    results: List[PropertyResult]
    errors: List[PropertyError]
    meta: BatchIngestionMeta


class DetectMissingRequest(BaseModel):
    """Request schema for detecting missing properties."""

    current_property_external_ids: List[str]


class DetectMissingResponse(BaseModel):
    """Response schema for missing property detection."""

    missing_detected: int
    marked_as_missing: int
    properties: List[dict] = []
