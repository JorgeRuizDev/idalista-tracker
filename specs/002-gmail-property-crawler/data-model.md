# Data Model: Gmail Property Crawler

**Generated**: 2026-05-10  
**Database**: SQLite with SQLAlchemy ORM

## Entity Relationship Diagram

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   EmailSource   │     │     Property     │     │  PriceHistory   │
├─────────────────┤     ├──────────────────┤     ├─────────────────┤
│ PK id           │────<│ FK email_id      │     │ PK id           │
│    message_id   │     │ PK id            │────>│ FK property_id  │
│    sender       │     │    idealista_id  │     │    old_price    │
│    subject      │     │    title         │     │    new_price    │
│    received_at  │     │    property_type │     │    change_date  │
│    processed_at │     │    location      │     │    change_type  │
│    status       │     │    original_price│     │    email_id     │
│    raw_content  │     │    current_price │     └─────────────────┘
└─────────────────┘     │    price_drop_pct│              │
                        │    size_m2       │              │
                        │    bedrooms      │              │
                        │    floor         │              │
                        │    has_elevator  │              │
                        │    property_url  │              │
                        │    created_at    │              │
                        │    updated_at    │              │
                        │    is_active     │              │
                        └──────────────────┘              │
                                   ▲                      │
                                   │                      │
                                   └──────────────────────┘
```

## Entities

### Property

Represents a real estate listing discovered from idealista emails.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | Integer | PK, Auto-increment | Internal unique identifier |
| idealista_id | String | Unique, Indexed | Property ID from idealista URL (e.g., "109446213") |
| title | String | Not null | Full property title from email |
| property_type | String | Nullable | Type: "Piso", "Casa", "Ático", etc. |
| location | String | Not null | Location/address string |
| original_price | Integer | Not null | First observed price in euros |
| current_price | Integer | Not null | Latest observed price in euros |
| price_drop_percentage | Float | Nullable | Calculated drop from original |
| size_m2 | Integer | Nullable | Property size in square meters |
| bedrooms | Integer | Nullable | Number of bedrooms |
| floor | String | Nullable | Floor description (e.g., "5ª planta") |
| has_elevator | Boolean | Nullable | Whether property has elevator access |
| property_url | String | Not null | Full idealista URL |
| email_id | Integer | FK → EmailSource | Source email reference |
| created_at | DateTime | Not null, Index | When first discovered |
| updated_at | DateTime | Not null | When last modified |
| is_active | Boolean | Default True | Whether still available |

**Indexes**:
- `idealista_id` (unique) - for deduplication and lookups
- `created_at` - for sorting recent properties
- `current_price` - for price filtering
- `location` - for location searches

### PriceHistory

Tracks all price changes for a property.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | Integer | PK, Auto-increment | Internal unique identifier |
| property_id | Integer | FK → Property, Not null | Reference to property |
| old_price | Integer | Nullable | Previous price (null for initial) |
| new_price | Integer | Not null | New price |
| change_date | DateTime | Not null | When change was observed |
| change_type | String | Not null | "initial", "update", "drop" |
| email_id | Integer | FK → EmailSource | Source email reference |

**Indexes**:
- `property_id` + `change_date` - for chronological history

### EmailSource

Represents an email from which properties were extracted.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | Integer | PK, Auto-increment | Internal unique identifier |
| message_id | String | Unique | Gmail message ID |
| sender | String | Not null | Sender email (noresponder@idealista.com) |
| subject | String | Not null | Email subject |
| received_at | DateTime | Not null | When email was received |
| processed_at | DateTime | Nullable | When system processed it |
| status | String | Not null | "pending", "processed", "failed" |
| error_message | String | Nullable | Error details if failed |
| properties_count | Integer | Default 0 | Number of properties extracted |
| raw_content | Text | Nullable | Full email content (for debugging) |

**Indexes**:
- `message_id` (unique) - for deduplication
- `status` - for finding unprocessed emails
- `received_at` - for chronological ordering

## State Transitions

### Property Lifecycle

```
[Discovered] → is_active=True, created_at=now, updated_at=now
      ↓
[Price Update] → current_price updated, updated_at=now, history entry added
      ↓
[Removed] → is_active=False, updated_at=now (future: detect removed listings)
```

### EmailSource Lifecycle

```
[Received] → status="pending", received_at=email_date
      ↓
[Processing] → Process email, extract properties
      ↓
[Success] → status="processed", processed_at=now, properties_count=N
      ↓
[Failure] → status="failed", error_message=details
```

## Validation Rules

### Property

1. `idealista_id` must be numeric string
2. `current_price` must be positive integer
3. `original_price` must be >= `current_price` (for drops)
4. `price_drop_percentage` calculated as: `((original - current) / original) * 100`
5. `size_m2` must be positive if present
6. `bedrooms` must be non-negative if present

### PriceHistory

1. `change_type` must be one of: "initial", "update", "drop"
2. `change_date` must not be in future
3. For "initial" type, `old_price` must be null
4. For "drop" type, `new_price` must be < `old_price`

### EmailSource

1. `sender` must match `noresponder@idealista.com`
2. `status` must be one of: "pending", "processed", "failed"
3. `received_at` must not be in future

## SQLAlchemy Model Definitions (Conceptual)

```python
# Property model fields
id: Mapped[int] = mapped_column(primary_key=True)
idealista_id: Mapped[str] = mapped_column(String(20), unique=True, index=True)
title: Mapped[str] = mapped_column(String(500))
property_type: Mapped[Optional[str]] = mapped_column(String(50))
location: Mapped[str] = mapped_column(String(500))
original_price: Mapped[int]
current_price: Mapped[int]
price_drop_percentage: Mapped[Optional[float]]
size_m2: Mapped[Optional[int]]
bedrooms: Mapped[Optional[int]]
floor: Mapped[Optional[str]] = mapped_column(String(50))
has_elevator: Mapped[Optional[bool]]
property_url: Mapped[str] = mapped_column(String(500))
email_id: Mapped[int] = mapped_column(ForeignKey("email_source.id"))
created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
is_active: Mapped[bool] = mapped_column(default=True)

# Relationships
email: Mapped["EmailSource"] = relationship(back_populates="properties")
price_history: Mapped[List["PriceHistory"]] = relationship(back_populates="property", order_by="desc(PriceHistory.change_date)")
```

## Query Patterns

1. **Find property by idealista ID**:
   ```sql
   SELECT * FROM property WHERE idealista_id = ?
   ```

2. **Get recent properties**:
   ```sql
   SELECT * FROM property ORDER BY created_at DESC LIMIT ?
   ```

3. **Get properties with price drops**:
   ```sql
   SELECT * FROM property WHERE price_drop_percentage > 0 ORDER BY price_drop_percentage DESC
   ```

4. **Get price history for property**:
   ```sql
   SELECT * FROM price_history WHERE property_id = ? ORDER BY change_date DESC
   ```

5. **Find unprocessed emails**:
   ```sql
   SELECT * FROM email_source WHERE status = 'pending' ORDER BY received_at
   ```
