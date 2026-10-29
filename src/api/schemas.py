"""Pydantic schemas for API request/response models."""

from datetime import datetime
from typing import Any, List, Literal, Optional

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
    image_url: Optional[str] = None
    image_data: Optional[str] = None


class PropertyCreate(PropertyBase):
    """Schema for creating a property."""

    email_id: int


class PropertyResponse(PropertyBase):
    """Property response schema."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    first_seen_at: Optional[datetime] = None
    last_seen_at: Optional[datetime] = None
    missing_since: Optional[datetime] = None
    sold_at: Optional[datetime] = None
    status: str = "active"
    detail_status: str = "legacy"
    detail_updated_at: Optional[datetime] = None
    discard_reason: Optional[str] = None
    photos_count: int = 0
    created_at: datetime
    updated_at: datetime
    is_active: bool
    price_history_count: int = 0


class PropertyDetailResponse(PropertyResponse):
    """Property detail response with price history."""

    zone: Optional[str] = None
    address: Optional[str] = None
    discount_amount: int = 0
    discount_pct: float = 0.0
    price_per_m2: Optional[int] = None
    days_on_market: Optional[int] = None
    photos: List[str] = []
    price_history: List[PriceHistoryResponse] = []


PropertySortBy = Literal[
    "discount_desc",
    "days_desc",
    "price_asc",
    "price_desc",
    "m2_asc",
    "date_desc",
    "created_at",
]

PropertyStatus = Literal["active", "sold", "missing", "all"]


class PropertyItem(BaseModel):
    """Property listing item for catalog and analytics explorer."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    idealista_id: str
    title: str
    address: Optional[str] = None
    zone: str
    property_type: Optional[str] = None
    original_price: int
    current_price: int
    discount_amount: int = 0
    discount_pct: float = 0.0
    size_m2: Optional[int] = None
    price_per_m2: Optional[int] = None
    bedrooms: Optional[int] = None
    floor: Optional[str] = None
    has_elevator: Optional[bool] = None
    status: Literal["active", "sold", "missing"] = "active"
    first_seen_at: Optional[datetime] = None
    last_seen_at: Optional[datetime] = None
    sold_at: Optional[datetime] = None
    days_on_market: Optional[int] = None
    photos: List[str] = []
    property_url: str
    price_history_count: int = 0
    detail_status: Optional[str] = "legacy"
    discard_reason: Optional[str] = None


class PropertyListResponse(BaseModel):
    """Paginated property list response."""

    items: List[PropertyItem]
    total: int
    limit: int = Field(ge=1, le=1000)
    offset: int = Field(ge=0)


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
    image_url: Optional[str] = None
    image_data: Optional[str] = None
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
    missing_properties: int = 0
    sold_properties: int = 0
    avg_days_to_sell: Optional[float] = None
    properties_with_price_drops: int
    properties_with_price_history: int
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
    external_search_id: Optional[str] = None


class DetectMissingResponse(BaseModel):
    """Response schema for missing property detection."""

    missing_detected: int
    marked_as_missing: int
    properties: List[dict] = []


# ============= Crawl History Schemas =============


class CrawlHistoryEntry(BaseModel):
    """Single crawl history entry aggregated by date."""

    date: str
    new_properties: int = 0
    new_inactives: int = 0
    price_drops: int = 0
    price_increases: int = 0
    avg_drop_amount: Optional[float] = None
    avg_increase_amount: Optional[float] = None


class CrawlHistoryResponse(BaseModel):
    """Response schema for crawl history."""

    entries: List[CrawlHistoryEntry]


class CrawlHistoryPropertySummary(BaseModel):
    """Summary of a property in crawl history detail."""

    id: int
    idealista_id: str
    title: str
    location: str
    current_price: int
    status: str
    property_url: str


class CrawlHistoryPriceDropDetail(CrawlHistoryPropertySummary):
    """Property with a price drop on a specific date."""

    old_price: Optional[int] = None
    new_price: Optional[int] = None
    drop_amount: Optional[int] = None


class CrawlHistoryPriceIncreaseDetail(CrawlHistoryPropertySummary):
    """Property with a price increase on a specific date."""

    old_price: Optional[int] = None
    new_price: Optional[int] = None
    increase_amount: Optional[int] = None


class CrawlHistoryDetailResponse(BaseModel):
    """Response schema for crawl history detail on a specific date."""

    date: str
    new_properties: List[CrawlHistoryPropertySummary] = []
    price_drops: List[CrawlHistoryPriceDropDetail] = []
    price_increases: List[CrawlHistoryPriceIncreaseDetail] = []
    new_missing: List[CrawlHistoryPropertySummary] = []
    new_sold: List[CrawlHistoryPropertySummary] = []


# ============= Detail Crawler Schemas (006-full-property-crawl) =============


class PropertyPhotoResponse(BaseModel):
    """Property gallery photo metadata and access path."""

    model_config = ConfigDict(from_attributes=True)

    id: Optional[int] = None
    sequence_index: int = 0
    local_url: Optional[str] = None
    original_url: Optional[str] = None
    caption: Optional[str] = None
    file_size_bytes: Optional[int] = None
    content_type: Optional[str] = "image/jpeg"


class PropertySnapshotData(BaseModel):
    """Detailed snapshot attributes extracted from property listing page."""

    model_config = ConfigDict(from_attributes=True)

    crawled_at: datetime
    source_engine: str
    full_description: str
    neighborhood: Optional[str] = None
    district: Optional[str] = None
    city: Optional[str] = None
    province: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    features: Optional[dict] = None
    photos: List[PropertyPhotoResponse] = []


class PropertySnapshotResponse(BaseModel):
    """Response schema for property snapshot retrieval endpoint."""

    property_id: int
    idealista_id: str
    detail_status: str
    detail_updated_at: Optional[datetime] = None
    snapshot: Optional[PropertySnapshotData] = None


class PendingDetailItem(BaseModel):
    """Listing pending detail crawl item for extension queue."""

    property_id: int
    idealista_id: str
    property_url: str
    extension_attempts: int = 0


class PendingDetailsResponse(BaseModel):
    """Response schema for listings pending detail crawling."""

    pending_count: int
    items: List[PendingDetailItem]


class DetailPhotoSubmitItem(BaseModel):
    """Gallery photo item in submission payload."""

    original_url: str
    sequence_index: int = 0
    caption: Optional[str] = None


class DetailSnapshotSubmitRequest(BaseModel):
    """Payload submitted by backend crawler or extension with listing details."""

    source_engine: str = "chrome_extension"
    full_description: Optional[str] = ""
    neighborhood: Optional[str] = None
    district: Optional[str] = None
    city: Optional[str] = None
    province: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    features: Optional[dict] = None
    photos: List[DetailPhotoSubmitItem] = []
    delisted: Optional[bool] = False


class DetailSnapshotSubmitResponse(BaseModel):
    """Response schema after snapshot submission."""

    status: str = "success"
    property_id: int
    idealista_id: str
    detail_status: str
    photos_downloaded: int = 0


class DetailCrawlFailRequest(BaseModel):
    """Failure report submitted when extension crawl encounters an error."""

    source_engine: str = "chrome_extension"
    error_type: str = "bot_challenge"
    error_message: Optional[str] = None
    http_status: Optional[int] = None


class DetailCrawlFailResponse(BaseModel):
    """Response schema after crawl failure recorded."""

    status: str = "recorded"
    idealista_id: str
    current_attempts: int
    detail_status: str
    discard_reason: Optional[str] = None


class RequeueDetailResponse(BaseModel):
    """Response schema when resetting a listing back to pending."""

    property_id: int
    detail_status: str = "pending"
    backend_attempts: int = 0
    extension_attempts: int = 0
    discard_reason: Optional[str] = None


class DiscardDetailRequest(BaseModel):
    """Request schema for manually discarding a property detail crawl."""

    reason: str = "manual_discard"
    note: Optional[str] = None


class DiscardDetailResponse(BaseModel):
    """Response schema when manually discarding a property detail crawl."""

    property_id: int
    detail_status: str = "discarded"
    discard_reason: str = "manual_discard"


# ============= Canonical Zones & Analytics Schemas =============


class NormalizedZoneResponse(BaseModel):
    """Canonical zone census statistics schema."""

    zone: str
    total: int
    active: int
    sold: int
    missing: int
    avg_price: int
    avg_m2: int
    avg_days_to_sell: int
    avg_discount_pct: float


class IntervalZoneMetric(BaseModel):
    """Territorial breakdown metric for an audit interval."""

    zone: str
    inclusions: int
    sales: int
    avg_days_to_sell: int
    avg_discount_pct: float
    avg_sale_price: int
    avg_m2: int = 0


class IntervalAuditResponse(BaseModel):
    """Aggregated market indicators and zone breakdown for a time interval."""

    start_date: str
    end_date: str
    interval_label: str
    inclusions: int
    sales: int
    drops_count: int
    avg_drop_pct: float
    total_drop_amount: int
    increases_count: int
    avg_inc_pct: float
    avg_days_to_sell: int
    avg_m2: int = 0
    zone_breakdown: List[IntervalZoneMetric]


class MonthlyTrendItem(BaseModel):
    """Monthly market trend aggregate data point."""

    month: str
    label: str
    avg_price: int
    avg_m2: int
    properties_active: int
    properties_sold: int
    price_drops: int
    avg_drop_pct: float


class MarketTrendsResponse(BaseModel):
    """Monthly market trends time series response."""

    monthly: List[MonthlyTrendItem]
