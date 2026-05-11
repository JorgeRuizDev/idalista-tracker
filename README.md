# Gmail Property Crawler

A Python-based system that connects to Gmail via IMAP, automatically crawls emails from `noresponder@idealista.com` every hour, extracts property data using regex pattern matching, stores it in a local SQLite database with SQLAlchemy, tracks price changes, and exposes the data through a FastAPI REST API.

## Features

- **Automatic Email Crawling**: Connects to Gmail via IMAP and fetches property emails every hour
- **Chrome Extension**: Browser extension to crawl saved searches directly from Idealista website
- **Property Extraction**: Parses idealista emails and web pages to extract property details
- **Price Change Tracking**: Detects price changes and maintains a complete price history
- **Missing Property Detection**: Identifies properties no longer listed (potential sales)
- **REST API**: FastAPI-based API for querying properties with filtering and sorting
- **SQLite Storage**: Zero-configuration local database using SQLAlchemy ORM

## Prerequisites

- Python 3.11+
- [UV](https://docs.astral.sh/uv/) - Fast Python package installer and resolver
- Gmail account with App Password enabled

## Installation

1. Clone the repository and navigate to the project directory

2. Install dependencies using UV:
   ```bash
   uv sync
   ```

   For development (includes test dependencies):
   ```bash
   uv sync --extra dev
   ```

3. Configure environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your Gmail credentials
   ```

4. Initialize the database:
   ```bash
   uv run src/database/init.py
   ```

5. Run the application:
   ```bash
   # Option 1: Run main.py directly (recommended)
   uv run src/main.py

   # Option 2: Run with uvicorn explicitly
   uv run uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload
   ```

The API will be available at `http://localhost:8000`

## API Documentation

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Chrome Extension

The project includes a Chrome extension for crawling Idealista saved searches directly from the browser.

### Quick Setup

1. **Build the extension**:
   ```bash
   cd extension
   npm install
   npm run build
   ```

2. **Load in Chrome**:
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `extension/dist` folder

3. **Configure and use**:
   - Click the extension icon
   - Set Server URL to `http://localhost:8000`
   - Visit Idealista saved searches page
   - Select searches and start crawling

📖 **Detailed Extension Documentation**: See [extension/README.md](extension/README.md)

## API Endpoints

### Properties
- `GET /api/v1/properties` - List all properties with filters
- `GET /api/v1/properties/{idealista_id}` - Get single property with price history
- `GET /api/v1/properties/price-drops` - Properties with price drops
- `POST /api/v1/properties/batch` - Ingest property batch from extension

### Saved Searches (Extension)
- `GET /api/v1/searches` - List all saved searches
- `POST /api/v1/searches/sync` - Sync searches from extension

### Crawl Sessions (Extension)
- `POST /api/v1/crawl/sessions` - Create new crawl session
- `GET /api/v1/crawl/sessions/{id}` - Get crawl session
- `POST /api/v1/crawl/sessions/{id}/complete` - Complete crawl session
- `POST /api/v1/crawl/sessions/{id}/searches/{search_id}/detect-missing` - Detect missing properties

### Legacy Crawl (Email)
- `POST /api/v1/crawl/trigger` - Manually trigger email crawl
- `GET /api/v1/crawl/status` - Get email crawl status

### Statistics
- `GET /api/v1/stats` - Get property statistics

## Development

### Running Tests

```bash
# Run all tests
uv run pytest

# Run with coverage
uv run pytest --cov=src --cov-report=html

# Run specific test file
uv run pytest tests/test_parser.py -v
```

### Code Quality

```bash
# Format code
uv run black src tests

# Lint
uv run flake8 src tests

# Type check
uv run mypy src
```

### Adding Dependencies

```bash
# Add production dependency
uv add <package>

# Add development dependency
uv add --dev <package>

# Update lock file
uv lock
```

## UV Commands Reference

| Command | Description |
|---------|-------------|
| `uv sync` | Install dependencies from lock file |
| `uv sync --extra dev` | Install with dev dependencies |
| `uv run <script>` | Run a script with dependencies |
| `uv add <package>` | Add a dependency |
| `uv add --dev <package>` | Add a dev dependency |
| `uv lock` | Update the lock file |
| `uv venv` | Create virtual environment |

## License

MIT
