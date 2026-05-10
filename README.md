# Gmail Property Crawler

A Python-based system that connects to Gmail via IMAP, automatically crawls emails from `noresponder@idealista.com` every hour, extracts property data using regex pattern matching, stores it in a local SQLite database with SQLAlchemy, tracks price changes, and exposes the data through a FastAPI REST API.

## Features

- **Automatic Email Crawling**: Connects to Gmail via IMAP and fetches property emails every hour
- **Property Extraction**: Parses idealista emails using regex patterns to extract property details
- **Price Change Tracking**: Detects price changes and maintains a complete price history
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

## API Endpoints

- `GET /api/v1/properties` - List all properties with filters
- `GET /api/v1/properties/{idealista_id}` - Get single property with price history
- `GET /api/v1/properties/price-drops` - Properties with price drops
- `POST /api/v1/crawl/trigger` - Manually trigger a crawl
- `GET /api/v1/crawl/status` - Get crawl status
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
