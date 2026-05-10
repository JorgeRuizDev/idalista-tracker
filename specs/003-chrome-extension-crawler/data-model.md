# Data Model: Chrome Extension Property Crawler

**Date**: 2026-05-10  
**Feature**: Chrome Extension Property Crawler  
**Branch**: 003-chrome-extension-crawler

---

## Overview

This document describes the database schema modifications needed for the Chrome extension crawler feature. The existing database uses **SQLAlchemy with SQLite** (not MongoDB as initially assumed).

### Existing Models (from Gmail crawler)
- `EmailSource` - Emails from Gmail
- `Property` - Real estate listings
- `PriceHistory` - Price change tracking

### New Models (for Extension crawler)
- `CrawlSession` - Crawl session tracking
- `SavedSearch` - Idealista saved searches
- `PropertyVisibility` - When properties are seen/missing
- `PropertyChange` - Track all attribute changes (not just price)

---

## Modified Existing Models

### 1. Property (Modified)

**Additions to existing model**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `status` | Enum | Yes | `active`, `missing`, `sold` (default: `active`) |
| `first_seen_at` | DateTime | Yes | When property was first discovered |
| `last_seen_at` | DateTime | Yes | When property was last seen |
| `missing_since` | DateTime | No | When property was marked missing |

**Existing fields to keep**:
- `id`, `idealista_id`, `title`, `location`, `original_price`, `current_price`
- `size_m2`, `bedrooms`, `floor`, `has_elevator`, `property_url`, `image_url`
- `created_at`, `updated_at`, `is_active`
- Relationship: `price_history`

**New Relationships**:
```python
# In Property model:
visibility_history: Mapped[List["PropertyVisibility"]]
attribute_changes: Mapped[List["PropertyChange"]]
crawl_sessions: Mapped[List["CrawlSession"]]  # Many-to-many via association
```

### 2. PriceHistory (Keep As-Is)

Continues to track price changes specifically. The new `PropertyChange` model will track other attribute changes.

---

## New Models

### 3. CrawlSession

Represents a single crawling operation.

```python
class CrawlSession(Base):
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
        secondary="crawl_session_property",
        back_populates="crawl_sessions"
    )
    visibility_events: Mapped[List["PropertyVisibility"]] = relationship(
        back_populates="crawl_session"
    )
    attribute_changes: Mapped[List["PropertyChange"]] = relationship(
        back_populates="crawl_session"
    )
```

**Association table** for many-to-many relationship:
```python
crawl_session_property = Table(
    "crawl_session_property",
    Base.metadata,
    Column("crawl_session_id", ForeignKey("crawl_session.id"), primary_key=True),
    Column("property_id", ForeignKey("property.id"), primary_key=True),
)
```

**State Transitions**:
```
RUNNING ──pause──> PAUSED ──resume──> RUNNING
   │                    │
   └──complete──> COMPLETED
   │
   └──fail──────> FAILED
```

---

### 4. SavedSearch

Represents a saved search/filter from Idealista.

```python
class SavedSearch(Base):
    __tablename__ = "saved_search"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    
    # External ID from Idealista
    external_search_id: Mapped[str] = mapped_column(
        String(50), unique=True, nullable=False, index=True
    )
    
    # Search details
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    url_path: Mapped[str] = mapped_column(String(500), nullable=False)  # e.g., /venta-viviendas/briviesca-burgos/
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
        back_populates="saved_search"
    )
```

---

### 5. PropertyVisibility

Tracks when properties are seen or go missing in searches.

```python
class PropertyVisibility(Base):
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
```

**Indexes**:
- `(property_id, timestamp)` - For property history queries
- `(crawl_session_id)` - For session reports
- `(saved_search_id, timestamp)` - For search-specific history

---

### 6. PropertyChange

Tracks changes to any property attribute (not just price).

```python
class PropertyChange(Base):
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
```

**Trackable Attributes**:
- `title` - Property title
- `size_m2` - Square meters
- `bedrooms` - Number of bedrooms
- `floor` - Floor information
- `has_elevator` - Elevator flag
- `location` - Location string
- `description` - Property description
- `image_url` - Primary image

---

## Entity Relationships

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  CrawlSession    │<───>│     Property     │<────│  EmailSource     │
├──────────────────┤     ├──────────────────┤     ├──────────────────┤
│ started_at       │     │ idealista_id     │     │ (existing)       │
│ status           │     │ title            │     └──────────────────┘
│ total_properties │     │ current_price    │
└────────┬─────────┘     │ status (NEW)     │     ┌──────────────────┐
         │               │ first_seen_at    │<────│ PriceHistory     │
         │               │ last_seen_at     │     │ (existing)       │
         v               └────────┬─────────┘     └──────────────────┘
┌──────────────────┐             │
│ PropertyVisibility│            │                ┌──────────────────┐
├──────────────────┤             └───────────────>│ PropertyChange   │
│ event_type       │                              │ (NEW)            │
│ timestamp        │                              ├──────────────────┤
│ page_number      │                              │ attribute_name   │
└────────┬─────────┘                              │ old/new_value    │
         │                                        └──────────────────┘
         v
┌──────────────────┐
│  SavedSearch     │
├──────────────────┤
│ external_search_id
│ name             │
│ url_path         │
└──────────────────┘
```

---

## Status Logic

### Property Status Transitions

| Current Status | Event | New Status | Condition |
|----------------|-------|------------|-----------|
| `active` | Not seen in search | `missing` | Not found in any saved search during crawl |
| `missing` | Seen again | `active` | Found in any saved search |
| `missing` | 30 days elapsed | `sold` | `missing_since` > 30 days ago |
| `sold` | Seen again | `active` | Found in any saved search (reactivated) |

### Missing Property Detection Algorithm

```python
def detect_missing_properties(search_id: int, session_id: int, current_property_ids: Set[int]):
    """Mark properties as missing after a search crawl."""
    
    # Get properties previously seen in this search
    previous_properties = (
        db.query(PropertyVisibility.property_id)
        .filter(PropertyVisibility.saved_search_id == search_id)
        .filter(PropertyVisibility.event_type == "seen")
        .distinct()
        .all()
    )
    previous_ids = {p[0] for p in previous_properties}
    
    # Find missing properties
    missing_ids = previous_ids - current_property_ids
    
    for prop_id in missing_ids:
        # Create visibility event
        visibility = PropertyVisibility(
            event_type="missing",
            property_id=prop_id,
            crawl_session_id=session_id,
            saved_search_id=search_id,
        )
        db.add(visibility)
        
        # Check if property exists in ANY other search
        other_searches = (
            db.query(PropertyVisibility)
            .filter(PropertyVisibility.property_id == prop_id)
            .filter(PropertyVisibility.saved_search_id != search_id)
            .filter(PropertyVisibility.event_type == "seen")
            .filter(
                PropertyVisibility.timestamp > (
                    datetime.utcnow() - timedelta(days=30)
                )
            )
            .first()
        )
        
        if not other_searches:
            # Mark as missing globally
            prop = db.query(Property).get(prop_id)
            if prop.status == "active":
                prop.status = "missing"
                prop.missing_since = datetime.utcnow()
        
        # Check for sold status (missing > 30 days)
        if prop.missing_since and (datetime.utcnow() - prop.missing_since).days > 30:
            prop.status = "sold"
    
    db.commit()
```

---

## Change Detection

### Batch Processing Logic

```python
def process_property_batch(properties_data: List[dict], session_id: int, search_id: int):
    """Process a batch of properties from the extension."""
    
    for prop_data in properties_data:
        # Check if property exists
        existing = (
            db.query(Property)
            .filter(Property.idealista_id == prop_data["external_id"])
            .first()
        )
        
        if not existing:
            # Create new property
            prop = Property(
                idealista_id=prop_data["external_id"],
                title=prop_data["title"],
                location=prop_data["location"],
                original_price=prop_data["price"],
                current_price=prop_data["price"],
                size_m2=prop_data.get("square_meters"),
                bedrooms=prop_data.get("bedrooms"),
                floor=parse_floor(prop_data.get("floor_info")),
                has_elevator=parse_elevator(prop_data.get("floor_info")),
                property_url=prop_data["url"],
                image_url=prop_data["photos"][0] if prop_data.get("photos") else None,
                first_seen_at=datetime.utcnow(),
                last_seen_at=datetime.utcnow(),
                status="active",
            )
            db.add(prop)
            db.flush()  # Get prop.id
            
            # Record all attributes as "created"
            for attr, value in prop_data.items():
                if attr in TRACKABLE_ATTRIBUTES and value:
                    change = PropertyChange(
                        property_id=prop.id,
                        crawl_session_id=session_id,
                        attribute_name=attr,
                        old_value=None,
                        new_value=str(value),
                        change_type="created",
                    )
                    db.add(change)
        
        else:
            # Update existing property
            existing.last_seen_at = datetime.utcnow()
            
            if existing.status in ("missing", "sold"):
                # Reactivated
                existing.status = "active"
                existing.missing_since = None
            
            # Check for changes
            changes = detect_changes(existing, prop_data)
            for attr, old_val, new_val in changes:
                # Update property
                setattr(existing, ATTR_MAP[attr], new_val)
                
                # Record change
                change = PropertyChange(
                    property_id=existing.id,
                    crawl_session_id=session_id,
                    attribute_name=attr,
                    old_value=str(old_val) if old_val else None,
                    new_value=str(new_val),
                    change_type="updated",
                )
                db.add(change)
                
                # Also record in PriceHistory if it's a price change
                if attr == "price" and old_val != new_val:
                    price_hist = PriceHistory(
                        property_id=existing.id,
                        old_price=old_val,
                        new_price=new_val,
                        change_type="update" if new_val < old_val else "increase",
                        email_id=None,  # From extension, not email
                    )
                    db.add(price_hist)
                    
                    # Update price drop percentage
                    if old_val > 0:
                        existing.price_drop_percentage = (
                            (old_val - new_val) / old_val * 100
                        )
        
        # Record visibility event
        visibility = PropertyVisibility(
            event_type="seen",
            property_id=prop.id if not existing else existing.id,
            crawl_session_id=session_id,
            saved_search_id=search_id,
            page_number=prop_data.get("page"),
        )
        db.add(visibility)
    
    db.commit()
```

---

## Database Migration

### Alembic Migration Script

```python
"""Add extension crawler models

Revision ID: xxx
Create Date: 2026-05-10
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import sqlite

# revision identifiers
revision = 'xxx'
down_revision = 'previous_revision'


def upgrade():
    # Create crawl_session table
    op.create_table(
        'crawl_session',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('started_at', sa.DateTime(), nullable=False),
        sa.Column('ended_at', sa.DateTime(), nullable=True),
        sa.Column('status', sa.String(20), nullable=False, default='running'),
        sa.Column('server_url', sa.String(500), nullable=False),
        sa.Column('human_like_enabled', sa.Boolean(), default=True),
        sa.Column('extension_version', sa.String(20), nullable=False),
        sa.Column('total_properties', sa.Integer(), default=0),
        sa.Column('pages_processed', sa.Integer(), default=0),
        sa.Column('searches_crawled', sa.Integer(), default=0),
        sa.Column('errors_count', sa.Integer(), default=0),
        sa.Column('created_at', sa.DateTime(), default=sa.func.now()),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create saved_search table
    op.create_table(
        'saved_search',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('external_search_id', sa.String(50), nullable=False),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('url_path', sa.String(500), nullable=False),
        sa.Column('full_url', sa.String(500), nullable=False),
        sa.Column('description', sa.String(500), nullable=True),
        sa.Column('result_count', sa.Integer(), nullable=True),
        sa.Column('is_active', sa.Boolean(), default=True),
        sa.Column('crawl_enabled', sa.Boolean(), default=False),
        sa.Column('created_at', sa.DateTime(), default=sa.func.now()),
        sa.Column('last_crawled_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('external_search_id')
    )
    op.create_index('ix_saved_search_external_id', 'saved_search', ['external_search_id'])
    
    # Create crawl_session_property association table
    op.create_table(
        'crawl_session_property',
        sa.Column('crawl_session_id', sa.Integer(), nullable=False),
        sa.Column('property_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['crawl_session_id'], ['crawl_session.id']),
        sa.ForeignKeyConstraint(['property_id'], ['property.id']),
        sa.PrimaryKeyConstraint('crawl_session_id', 'property_id')
    )
    
    # Create property_visibility table
    op.create_table(
        'property_visibility',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('event_type', sa.String(20), nullable=False),
        sa.Column('timestamp', sa.DateTime(), default=sa.func.now()),
        sa.Column('page_number', sa.Integer(), nullable=True),
        sa.Column('property_id', sa.Integer(), nullable=False),
        sa.Column('crawl_session_id', sa.Integer(), nullable=False),
        sa.Column('saved_search_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['property_id'], ['property.id']),
        sa.ForeignKeyConstraint(['crawl_session_id'], ['crawl_session.id']),
        sa.ForeignKeyConstraint(['saved_search_id'], ['saved_search.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_visibility_property', 'property_visibility', ['property_id', 'timestamp'])
    op.create_index('ix_visibility_session', 'property_visibility', ['crawl_session_id'])
    op.create_index('ix_visibility_search', 'property_visibility', ['saved_search_id', 'timestamp'])
    
    # Create property_change table
    op.create_table(
        'property_change',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('attribute_name', sa.String(50), nullable=False),
        sa.Column('old_value', sa.Text(), nullable=True),
        sa.Column('new_value', sa.Text(), nullable=False),
        sa.Column('change_type', sa.String(20), default='updated'),
        sa.Column('timestamp', sa.DateTime(), default=sa.func.now()),
        sa.Column('property_id', sa.Integer(), nullable=False),
        sa.Column('crawl_session_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['property_id'], ['property.id']),
        sa.ForeignKeyConstraint(['crawl_session_id'], ['crawl_session.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_change_property', 'property_change', ['property_id', 'timestamp'])
    op.create_index('ix_change_session', 'property_change', ['crawl_session_id'])
    
    # Modify existing property table
    op.add_column('property', sa.Column('status', sa.String(20), default='active'))
    op.add_column('property', sa.Column('first_seen_at', sa.DateTime(), nullable=True))
    op.add_column('property', sa.Column('last_seen_at', sa.DateTime(), nullable=True))
    op.add_column('property', sa.Column('missing_since', sa.DateTime(), nullable=True))
    
    # Backfill first_seen_at and last_seen_at from created_at
    op.execute("UPDATE property SET first_seen_at = created_at, last_seen_at = updated_at, status = 'active'")
    
    # Make first_seen_at and last_seen_at non-nullable after backfill
    op.alter_column('property', 'first_seen_at', nullable=False)
    op.alter_column('property', 'last_seen_at', nullable=False)


def downgrade():
    op.drop_table('property_change')
    op.drop_table('property_visibility')
    op.drop_table('crawl_session_property')
    op.drop_table('saved_search')
    op.drop_table('crawl_session')
    op.drop_column('property', 'status')
    op.drop_column('property', 'first_seen_at')
    op.drop_column('property', 'last_seen_at')
    op.drop_column('property', 'missing_since')
```

---

## Indexes Summary

| Table | Index | Purpose |
|-------|-------|---------|
| Property | `idealista_id` (unique) | Fast lookup by external ID |
| Property | `status` | Filter by status (active/missing/sold) |
| Property | `last_seen_at` | Find stale properties |
| SavedSearch | `external_search_id` (unique) | Fast lookup by Idealista ID |
| PropertyVisibility | `(property_id, timestamp)` | Property history queries |
| PropertyVisibility | `crawl_session_id` | Session reports |
| PropertyVisibility | `(saved_search_id, timestamp)` | Search-specific history |
| PropertyChange | `(property_id, timestamp)` | Change history queries |
| PropertyChange | `crawl_session_id` | Session change reports |
| CrawlSession | `status` | Find active sessions |

---

## Queries

### Get Property with Complete History

```python
property = (
    db.query(Property)
    .filter(Property.idealista_id == "109363171")
    .options(
        joinedload(Property.price_history),
        joinedload(Property.visibility_history).joinedload(PropertyVisibility.saved_search),
        joinedload(Property.attribute_changes),
    )
    .first()
)
```

### Find Properties Missing for >30 Days

```python
threshold = datetime.utcnow() - timedelta(days=30)
missing_properties = (
    db.query(Property)
    .filter(Property.status == "missing")
    .filter(Property.missing_since < threshold)
    .all()
)
```

### Get Crawl Session Report

```python
session = (
    db.query(CrawlSession)
    .filter(CrawlSession.id == session_id)
    .options(
        joinedload(CrawlSession.visibility_events),
        joinedload(CrawlSession.attribute_changes),
    )
    .first()
)
```
