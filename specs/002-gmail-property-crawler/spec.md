# Feature Specification: Gmail Property Crawler

**Feature Branch**: `002-gmail-property-crawler`  
**Created**: 2026-05-10  
**Status**: Draft  
**Input**: User description: "Add the functionality to crawl my GMAIL to add the latest properties. The properties have to be scrapped from the mails (each mail is a property but there are mails that might be multiple houses). The newer mails should be added to a local SQLAlchemy database (only sqlite at the moment). The basic fields should be scrapped from the the mail itself, so you will have to implement a basic connection + scrape before planing. This crawl process should be able to update existing properteis (as the price might change). A price drop is also a new mail!  The mail connection should use IMAP. The final implementation must be exposed in a REST API and that api will crawl the mail every hour automatically. In a future, the api will expose the database."

## Clarifications

### Session 2026-05-10

- **Q**: How should the system identify that an email refers to the same property as an existing record?  
  **A**: Extract the property ID from the URL of the property link in the email
  
- **Q**: How should the system identify which emails to process?  
  **A**: Filter emails by sender address `noresponder@idealista.com`
  
- **Q**: Should the system provide any notification or highlighting mechanism for price drops?  
  **A**: No notifications needed, just track the prices in the database

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Automatic Property Discovery (Priority: P1)

As a property seeker, I want the system to automatically check my Gmail for new property listings every hour, so that I don't miss any opportunities without manually checking my email.

**Why this priority**: This is the core value proposition of the feature - automating the tedious task of monitoring property emails. Without this, users would need to manually check and extract property data from emails, which is time-consuming and error-prone.

**Independent Test**: Can be fully tested by configuring Gmail IMAP credentials, triggering a crawl, and verifying that new property emails from `noresponder@idealista.com` are detected and stored in the database with correct basic fields (title, price, location, description).

**Acceptance Scenarios**:

1. **Given** the system is configured with valid Gmail IMAP credentials and the database is empty, **When** the crawl process runs and finds 5 new property emails from `noresponder@idealista.com`, **Then** 5 property records are created in the database with extracted basic fields (title, price, location, description, source email ID, idealista property ID from URL).

2. **Given** the crawl process has run before and stored some properties, **When** a new property email arrives from `noresponder@idealista.com`, **Then** on the next hourly crawl, that property is added to the database without duplicates.

3. **Given** an email contains information about multiple properties, **When** the crawl process extracts data, **Then** each property is stored as a separate record with its own unique identifier extracted from the property URL.

---

### User Story 2 - Price Change Tracking (Priority: P2)

As a property seeker, I want the system to detect when a property's price changes in subsequent emails and update the existing record, so that I always have the latest pricing information and can identify good deals.

**Why this priority**: Price changes (especially drops) are critical signals for property buyers. This feature provides value by highlighting opportunities and maintaining data accuracy. It's a natural extension of the core discovery feature but can function independently.

**Independent Test**: Can be fully tested by manually inserting a property record with a specific price and idealista ID, then simulating a price drop email for the same property (same URL/ID) and verifying the record is updated with the new price while preserving historical data.

**Acceptance Scenarios**:

1. **Given** a property exists in the database with price $500,000 and idealista ID "12345678", **When** a new email arrives for the same property (same URL/ID) with price $450,000, **Then** the existing record is updated to $450,000 and the price drop is recorded in history.

2. **Given** a property has had multiple price changes over time, **When** viewing the property details, **Then** I can see the complete price history chronologically.

3. **Given** a price drop email is processed, **When** the update occurs, **Then** the price history is updated to reflect the change.

---

### User Story 3 - REST API Access (Priority: P3)

As a property seeker, I want to access the stored property data through a REST API, so that I can view, filter, and integrate property information with other tools or interfaces.

**Why this priority**: While the data collection happens automatically, users need a way to actually view and work with the collected data. The REST API provides this interface. This is the presentation layer that makes the backend data useful.

**Independent Test**: Can be fully tested by making HTTP requests to the API endpoints and verifying that property data is returned in the expected format, with support for filtering by price range, location, and date added.

**Acceptance Scenarios**:

1. **Given** properties exist in the database, **When** I make a GET request to the properties endpoint, **Then** I receive a JSON response with a list of all properties including their basic fields and current status.

2. **Given** I want to find properties under $400,000 in a specific location, **When** I make a GET request with query parameters for max price and location, **Then** only matching properties are returned.

3. **Given** I want to see recently added properties, **When** I make a GET request sorted by date added, **Then** properties are returned in reverse chronological order with the newest first.

---

### Edge Cases

- What happens when the Gmail IMAP connection fails or credentials are invalid?
- How does the system handle emails that don't contain property information?
- What happens when an email contains a property URL that cannot be parsed?
- How does the system handle properties without a price mentioned?
- What happens when the database is temporarily locked during a crawl operation?
- How does the system handle emails from `noresponder@idealista.com` that don't contain property links?
- What happens when an email contains corrupted or incomplete property data?
- How does the system handle Gmail's rate limiting or temporary service unavailability?
- What happens when the SQLite database file grows too large?
- How does the system handle time zone differences between email timestamps and local system time?
- What happens when a property URL contains an ID that doesn't match the expected format?
- How does the system handle duplicate emails from `noresponder@idealista.com` with identical content?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST connect to Gmail using the IMAP protocol to access emails.
- **FR-002**: System MUST automatically crawl Gmail for property emails every hour without manual intervention.
- **FR-003**: System MUST filter emails by sender address `noresponder@idealista.com` to identify property listings.
- **FR-004**: System MUST extract basic property fields from emails including: title, price, location/address, description, idealista property ID (extracted from property URL), and source email metadata (message ID, received date, sender).
- **FR-005**: System MUST handle emails containing multiple properties by extracting and storing each property as a separate record with its own idealista ID.
- **FR-006**: System MUST identify when an email represents a property already in the database by matching on the idealista property ID extracted from the property URL.
- **FR-007**: System MUST update existing property records when price changes are detected in new emails for the same idealista ID, preserving price history.
- **FR-008**: System MUST store all property data in a local SQLite database using SQLAlchemy ORM.
- **FR-009**: System MUST expose a REST API endpoint to retrieve all properties with support for filtering and sorting.
- **FR-010**: System MUST expose a REST API endpoint to retrieve a single property by its idealista ID.
- **FR-011**: System MUST track and store the timestamp of when each property was first discovered and last updated.
- **FR-012**: System MUST handle IMAP connection failures gracefully with appropriate error logging and retry logic.
- **FR-013**: System MUST deduplicate emails to avoid processing the same email multiple times.
- **FR-014**: System MUST extract and store the property URL from emails to enable future reference and deduplication.

### Key Entities *(include if feature involves data)*

- **Property**: Represents a real estate listing discovered from emails. Contains: internal unique identifier, idealista property ID (extracted from URL), title, price, location/address, description, property type, bedroom/bathroom counts (if available), square footage (if available), property URL, source email reference, creation timestamp, last updated timestamp, and current status (active/removed).
- **PriceHistory**: Tracks price changes for a property over time. Contains: property reference, old price, new price, change date, change type (initial, update, drop), and source email reference.
- **EmailSource**: Represents an email from which properties were extracted. Contains: message ID, sender (always `noresponder@idealista.com`), subject, received date, processed timestamp, processing status (pending/processed/failed), and raw content reference.
- **CrawlJob**: Tracks individual crawl operations. Contains: start time, end time, status (running/completed/failed), emails found count, properties extracted count, errors encountered, and next scheduled crawl time.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: System successfully discovers and stores at least 95% of property emails received from `noresponder@idealista.com` within one hour of arrival.
- **SC-002**: Users can retrieve the complete property list via API with response time under 2 seconds for up to 1000 properties.
- **SC-003**: Price changes are detected and reflected in the database within one hour of the price drop email being received.
- **SC-004**: Zero duplicate property records are created for the same idealista property (measured by idealista ID matching).
- **SC-005**: System maintains 99% uptime for the hourly crawl process over a 30-day period (allowing for Gmail/IMAP service interruptions).
- **SC-006**: API endpoints return properly formatted JSON responses with appropriate HTTP status codes (200 for success, 400 for bad requests, 500 for server errors).
- **SC-007**: Property data extraction correctly identifies at least 90% of price values from email content (measured against manually verified samples).
- **SC-008**: Property URLs are correctly parsed to extract idealista IDs with 100% accuracy for standard idealista URL formats.

## Assumptions

- Users will provide valid Gmail IMAP credentials with appropriate permissions to access their inbox.
- Property emails are exclusively from `noresponder@idealista.com` and contain property listings with extractable URLs.
- Idealista property URLs contain a unique property ID that can be reliably extracted via pattern matching.
- The system will only process emails from `noresponder@idealista.com`, ignoring all other senders.
- Property emails from `noresponder@idealista.com` contain either single or multiple property listings with valid URLs.
- The local SQLite database file will be stored on the same machine running the application with sufficient disk space.
- Gmail's IMAP service is available and accessible from the deployment environment.
- Price information is included in the email body in a parseable format.
- The system will run continuously to maintain the hourly crawl schedule.
- Only one instance of the crawler will run at a time to avoid database conflicts.
- Users will configure the system with their Gmail App Password or OAuth2 credentials (not regular password) for security.
- No notification system (email, push, etc.) is required - price tracking is for historical/reference purposes only.
- The REST API will be accessible on localhost for initial implementation.
- Idealista URL format follows a predictable pattern allowing ID extraction (e.g., `https://www.idealista.com/inmueble/12345678/`).
