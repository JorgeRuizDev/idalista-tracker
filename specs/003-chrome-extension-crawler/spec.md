# Feature Specification: Chrome Extension Property Crawler

**Feature Branch**: `[003-chrome-extension-crawler]`  
**Created**: 2026-05-10  
**Status**: Draft  
**Input**: User description: "Okey, i found a great limitation crawling the emails. Now i nedd:

A) An API to add new properties from a Chrome extension, this endpoints should allow BATCH ingest
B) A configurable extension that follows the following hierarchy:
Search -> Pages -> List of properties. 

The extension should detect all the saved searches (filters) in idealista and witch a checkbox you should be able to select which ones you want to crawl.

For each search, the extension should navigate each page and crawl all the results in each page. 

The extension should have  a configuration part where you can point to the crawl server. 

The extension must fake the behaviour, random sleep times for each page, fake scroll, a random sleep between page changes, etc. 

C) After a crawl session. The API must annotate the missing properties w/ missing + tiemestamp. I want full history of updates (When was an ad last seen or last missing), so the DB must change to support this. This allows me to detect when a property has been sold. 

Maybe it's a good idea to add a history of crawls to the property. Sometime the meters or the description changes, so lets do it."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Configure and Start Crawl Session (Priority: P1)

As a property investor using the Chrome extension, I want to configure which saved searches to crawl and start a crawling session that systematically navigates through all pages and properties, so that I can collect comprehensive property data from Idealista.

**Why this priority**: This is the core functionality that enables automated data collection. Without this, the system cannot gather property information.

**Independent Test**: Can be fully tested by installing the Chrome extension, configuring the crawl server URL, selecting saved searches, and initiating a crawl. The extension should navigate through pages and properties without manual intervention and send data to the configured server.

**Acceptance Scenarios**:

1. **Given** the Chrome extension is installed, **When** the user opens the configuration panel and enters a valid crawl server URL, **Then** the extension saves the configuration and shows a confirmation.
2. **Given** the extension popup is open, **When** the user views the connection status section, **Then** the extension displays a visual indicator (green dot for connected, red for offline) showing whether the backend server is reachable.
3. **Given** the extension has a configured server URL, **When** the user clicks the "Test" button, **Then** the extension attempts to connect to the backend and displays the connection result (success or error message).
4. **Given** the user is on the Idealista saved searches page, **When** they open the extension popup, **Then** the extension displays all detected saved searches with checkboxes for selection.
5. **Given** the user has selected one or more saved searches and the backend is connected, **When** they click "Start Crawl", **Then** the extension begins crawling by navigating to the first selected search and loading its results page.
6. **Given** a crawl is in progress or has been attempted, **When** the user views the activity log section, **Then** they see a chronological log of all actions (connections, crawl starts, errors) with timestamps and severity levels (info, success, warning, error).
4. **Given** a crawl is in progress, **When** the extension loads a search results page, **Then** it extracts all property listings on that page and sends them in a batch to the crawl server.
5. **Given** a crawl is processing a search results page, **When** there are more pages in the pagination, **Then** the extension navigates to the next page after a random delay and continues crawling.
6. **Given** the extension is crawling, **When** it loads any page, **Then** it performs human-like behavior including random sleep times (2-8 seconds) and fake scrolling before extracting data.

---

### User Story 2 - Batch Ingest Properties via API (Priority: P1)

As a developer integrating the crawl server, I want an API endpoint that accepts batch property data from the Chrome extension, so that properties can be efficiently stored and tracked in the database.

**Why this priority**: The API is essential for receiving data from the extension. Without it, the crawling process would have no destination for collected data.

**Independent Test**: Can be fully tested by sending HTTP POST requests with batches of property data to the API endpoint and verifying that properties are stored in the database with proper tracking metadata.

**Acceptance Scenarios**:

1. **Given** the API server is running, **When** the extension sends a POST request with a batch of property objects including required fields (id, title, price, location, url), **Then** the API accepts the request and stores all properties.
2. **Given** a batch of properties is being ingested, **When** some properties already exist in the database, **Then** the API updates the existing records and records the current timestamp as "last_seen".
3. **Given** a batch ingestion is complete, **When** the API processes the batch, **Then** it returns a response with the count of created properties, updated properties, and any errors.
4. **Given** the API receives a batch with invalid data, **When** processing the batch, **Then** it rejects invalid entries, returns error details, but still processes valid entries in the same batch.

---

### User Story 3 - Track Property History and Detect Missing Properties (Priority: P2)

As a property investor, I want the system to maintain a complete history of when each property was seen or went missing, so that I can identify properties that have been sold or taken off the market.

**Why this priority**: This feature provides critical business intelligence about market activity (sold properties). It's secondary to basic crawling but essential for the full value proposition.

**Independent Test**: Can be fully tested by running multiple crawl sessions and verifying that the system correctly tracks which properties were seen in each session and marks properties as missing when they no longer appear in search results.

**Acceptance Scenarios**:

1. **Given** a crawl session has completed for a saved search, **When** the system compares current properties with previously seen properties, **Then** it marks properties not found in the current session as "missing" with the current timestamp.
2. **Given** a property was previously marked as missing, **When** it appears again in a subsequent crawl session, **Then** the system updates its status to "active" and records a new "last_seen" timestamp.
3. **Given** a user views a property's details, **When** they check the property history, **Then** they can see all crawl sessions where the property was observed, when it went missing, and when it reappeared.
4. **Given** the system has tracked multiple crawl sessions, **When** a property has been missing for more than 30 days, **Then** it is flagged as potentially sold and included in a "sold properties" report.

---

### User Story 4 - Track Property Changes Over Time (Priority: P2)

As a property investor, I want the system to track changes to property details (price, square meters, description) across crawl sessions, so that I can identify price reductions and other significant changes.

**Why this priority**: Tracking property changes provides valuable market intelligence (price drops, description updates). It complements the missing property detection feature.

**Independent Test**: Can be fully tested by crawling the same property multiple times with different values and verifying that the system records each change with timestamps.

**Acceptance Scenarios**:

1. **Given** a property exists in the database from a previous crawl, **When** the same property is crawled again with a different price, **Then** the system records the price change in the property's history with the crawl session timestamp.
2. **Given** a property has multiple tracked attributes, **When** any attribute changes (square meters, description, price, photos), **Then** the system stores the previous value, new value, and timestamp of the change.
3. **Given** a user views a property's change history, **When** they review the history, **Then** they can see a chronological list of all attribute changes with before/after values and dates.
4. **Given** a property's price has decreased, **When** the system detects this change, **Then** the price reduction amount and percentage are calculated and stored for reporting.

---

### User Story 5 - Human-Like Crawling Behavior (Priority: P3)

As a user of the Chrome extension, I want the crawling process to mimic human browsing behavior with random delays and scrolling, so that the crawling activity is less likely to be detected and blocked by Idealista.

**Why this priority**: This is a protective feature that improves reliability. While important for production use, the system can function without it during initial testing.

**Independent Test**: Can be fully tested by running a crawl session and verifying through browser DevTools or logs that random delays and scrolling occur.

**Acceptance Scenarios**:

1. **Given** a crawl is in progress, **When** the extension loads a new page, **Then** it waits for a random duration between 2 and 8 seconds before extracting data.
2. **Given** the extension is on a search results page, **When** it begins data extraction, **Then** it first performs a fake scroll action to simulate user reading behavior.
3. **Given** the extension has finished crawling one page, **When** it navigates to the next page, **Then** it waits for a random duration between 5 and 15 seconds before initiating navigation.
4. **Given** the extension is configured, **When** the user can adjust behavior settings, **Then** they can enable/disable human-like behavior and set minimum/maximum delay ranges.

---

### Edge Cases

1. **What happens when the crawl server is unreachable?**
   - The extension should queue the data locally and retry with exponential backoff. After 5 failed attempts, it should notify the user and pause the crawl.

2. **How does the system handle duplicate property IDs in the same batch?**
   - The API should deduplicate based on property ID within a batch, keeping the last occurrence and logging a warning.

3. **What happens when Idealista changes its page structure?**
   - The extension should detect when expected elements are not found and log an error. After 3 consecutive page parse failures, the crawl should pause and alert the user.

4. **How does the system handle extremely large search results (100+ pages)?**
   - The extension should support resumable crawls, saving progress periodically. Users should be able to pause and resume long-running crawls.

5. **What happens when a property is missing from one search but appears in another search?**
   - The property should only be marked as missing when it's absent from ALL saved searches that previously contained it, not just one.

6. **How does the system handle rate limiting from Idealista?**
   - If the extension detects a rate limit response (429 status or CAPTCHA), it should pause for 5 minutes, then resume. After 3 rate limit events, it should stop and notify the user.

7. **What happens when the Chrome extension is closed or the browser crashes during a crawl?**
   - The extension should persist crawl state (current search, current page, remaining searches) to Chrome storage and offer to resume when reopened.

8. **What happens when the backend server is offline when the user tries to start a crawl?**
   - The extension should display a clear offline status indicator, disable the "Start Crawl" button, show an error message explaining the connection issue, and log the failed connection attempt in the activity log.

9. **How does the system handle intermittent backend connectivity during a crawl?**
   - The extension should detect connection failures, log the error, pause the crawl, retry the connection with exponential backoff, and either resume automatically when connectivity is restored or prompt the user if retries are exhausted.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The Chrome extension MUST detect all saved searches (filters) on the Idealista saved searches page and display them with selectable checkboxes.
- **FR-002**: The Chrome extension MUST allow users to configure the crawl server URL through a configuration panel.
- **FR-003**: The Chrome extension MUST crawl properties following the hierarchy: Search -> Pages -> List of Properties.
- **FR-004**: The Chrome extension MUST extract the following property data for each listing: property ID, title, price, location, URL, square meters (if available), description (if available), and photos (if available).
- **FR-005**: The Chrome extension MUST implement human-like behavior including random sleep times (2-8 seconds per page), fake scrolling, and random delays (5-15 seconds) between page navigations.
- **FR-006**: The Chrome extension MUST send property data in batches to the configured crawl server API endpoint.
- **FR-007**: The API MUST expose an endpoint that accepts batch property ingestion requests containing multiple property objects.
- **FR-008**: The API MUST validate incoming property data and return a response indicating created count, updated count, and any errors.
- **FR-009**: The API MUST update the "last_seen" timestamp for properties that already exist when they are re-crawled.
- **FR-010**: The API MUST mark properties as "missing" with a timestamp when they are not present in a completed crawl session for a saved search.
- **FR-011**: The API MUST track a complete history of when each property was seen or went missing.
- **FR-012**: The API MUST detect and record changes to property attributes (price, square meters, description) between crawl sessions.
- **FR-013**: The API MUST store historical values of changed attributes with timestamps for each change.
- **FR-014**: The API MUST flag properties as potentially sold when they have been missing for more than 30 days.
- **FR-015**: The Chrome extension MUST support pausing and resuming crawl sessions, persisting state to Chrome storage.
- **FR-016**: The Chrome extension MUST handle network errors with retry logic (exponential backoff, max 5 retries).
- **FR-017**: The Chrome extension MUST detect rate limiting or blocking and pause the crawl with user notification.
- **FR-018**: The API MUST only mark a property as missing if it is absent from ALL saved searches that previously contained it, not just one.
- **FR-019**: The Chrome extension MUST display a visual server status indicator (green for connected, red for offline) that checks backend connectivity on popup open and provides a manual "Test" button for verification.
- **FR-020**: The Chrome extension MUST expose an activity log window in the popup that displays chronological events (connection attempts, crawl actions, errors) with timestamps and severity levels (info, success, warning, error).
- **FR-021**: The Chrome extension MUST disable the "Start Crawl" button when the backend server is offline or unreachable, preventing crawl initiation without a valid connection.

### Key Entities *(include if feature involves data)*

- **Property**: Represents a real estate listing from Idealista. Key attributes: unique property ID, title, price, location, URL, square meters, description, photos, current status (active/missing/sold), last_seen timestamp, first_seen timestamp.
- **PropertyHistory**: Records the complete visibility history of a property. Key attributes: property ID reference, timestamp, event type (seen/missing), crawl session ID.
- **PropertyChange**: Records specific attribute changes to a property over time. Key attributes: property ID reference, attribute name, old value, new value, timestamp, crawl session ID.
- **CrawlSession**: Represents a single crawling operation. Key attributes: session ID, start time, end time, status (running/completed/failed), saved searches crawled, total properties processed, server URL used.
- **SavedSearch**: Represents a saved search/filter configuration from Idealista. Key attributes: search ID, name, URL, date added, last crawled timestamp.
- **CrawlConfiguration**: User settings for the Chrome extension. Key attributes: server URL, enable human-like behavior, min/max delay ranges, retry settings.
- **ActivityLog**: In-extension log of user-visible events. Key attributes: timestamp, message, severity level (info/success/warning/error), optional error details.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can configure the Chrome extension and initiate a crawl session in under 3 minutes.
- **SC-002**: The Chrome extension successfully crawls 95% of properties from a saved search without errors.
- **SC-003**: The batch API ingests 1000 properties in under 30 seconds.
- **SC-004**: The system correctly identifies 100% of properties that have been missing for 30+ consecutive days.
- **SC-005**: The system captures and stores 100% of attribute changes (price, description, square meters) detected between crawl sessions.
- **SC-006**: The Chrome extension maintains human-like behavior with random delays averaging 5 seconds per page and 10 seconds between pages.
- **SC-007**: The system can resume an interrupted crawl session without data loss, restoring from the exact point of interruption.
- **SC-008**: Users can view a complete history timeline for any property showing all seen/missing events and attribute changes.
- **SC-009**: The batch API handles duplicate property IDs in a single batch without creating duplicate database entries.
- **SC-010**: The Chrome extension detects and handles rate limiting events, pausing for 5 minutes and resuming automatically (up to 3 times before requiring user intervention).
- **SC-011**: The Chrome extension accurately displays backend connection status within 3 seconds of opening the popup, with a success rate of 100% for valid server URLs.
- **SC-012**: The activity log displays all significant events (connections, crawl starts/stops, errors) in chronological order with 100% accuracy, retaining the last 50 log entries.
- **SC-013**: Users can verify backend connectivity and view connection error details before attempting to start a crawl, reducing failed crawl attempts due to configuration errors by 90%.

## Assumptions

- Users have a valid Idealista account with saved searches configured.
- The crawl server will be hosted by the user and accessible from their Chrome browser.
- Chrome extension Manifest V3 will be used for modern Chrome compatibility.
- The Idealista website structure remains stable; significant changes may require extension updates.
- Users understand that aggressive crawling (short delays, many pages) may result in temporary IP blocking.
- The database will be MongoDB (consistent with the existing project) to support flexible schema for property history tracking.
- Property IDs from Idealista are globally unique and stable across time.
- Users will run crawl sessions periodically (daily/weekly) to maintain accurate missing property detection.
