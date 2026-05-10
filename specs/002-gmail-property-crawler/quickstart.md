# Quick Start Guide

**Feature**: Gmail Property Crawler  
**Prerequisites**: Python 3.11+, [UV](https://docs.astral.sh/uv/), Gmail account with App Password

## Installation

### 1. Clone and Setup

```bash
# Navigate to project directory
cd idalista-tracker

# Install dependencies using UV
uv sync

# For development (includes test dependencies)
uv sync --extra dev
```

**Note**: UV automatically manages the virtual environment. No need to manually activate it.

### 2. Configure Environment

Create a `.env` file in the project root:

```env
# Gmail Configuration
GMAIL_EMAIL=your.email@gmail.com
GMAIL_APP_PASSWORD=your-app-password-here

# Database Configuration
DATABASE_URL=sqlite:///./idealista_properties.db

# Crawler Configuration
CRAWL_INTERVAL_HOURS=1

# API Configuration
API_HOST=0.0.0.0
API_PORT=8000
```

**Getting a Gmail App Password**:
1. Go to Google Account Settings
2. Security → 2-Step Verification → App passwords
3. Select "Mail" and your device
4. Copy the 16-character password

### 3. Initialize Database

```bash
uv run src/database/init.py
```

This creates the SQLite database with all required tables.

### 4. Run the Application

```bash
# Option 1: Run main.py directly (recommended)
uv run src/main.py

# Option 2: Run with uvicorn explicitly
uv run uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload
```

The API will be available at `http://localhost:8000`

## Usage

### View API Documentation

Open in browser:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

### Manual Crawl Trigger

```bash
curl -X POST http://localhost:8000/api/v1/crawl/trigger
```

### Query Properties

```bash
# Get all properties
curl http://localhost:8000/api/v1/properties

# Filter by price range
curl "http://localhost:8000/api/v1/properties?min_price=150000&max_price=250000"

# Get properties with price drops
curl "http://localhost:8000/api/v1/properties?has_price_drop=true"

# Get specific property
curl http://localhost:8000/api/v1/properties/109446213
```

### Check System Status

```bash
# Crawl status
curl http://localhost:8000/api/v1/crawl/status

# Overall statistics
curl http://localhost:8000/api/v1/stats
```

## Project Structure

```
idalista-tracker/
├── src/
│   ├── __init__.py
│   ├── main.py                 # FastAPI app entry point
│   ├── config.py               # Configuration management
│   ├── database/
│   │   ├── __init__.py
│   │   ├── models.py           # SQLAlchemy models
│   │   ├── init.py             # Database initialization
│   │   └── session.py          # Database session management
│   ├── crawler/
│   │   ├── __init__.py
│   │   ├── imap_client.py      # Gmail IMAP connection
│   │   ├── parser.py           # Email content parser
│   │   ├── scheduler.py        # APScheduler setup
│   │   └── service.py          # Crawl orchestration
│   ├── api/
│   │   ├── __init__.py
│   │   ├── routes/
│   │   │   ├── __init__.py
│   │   │   ├── properties.py   # Property endpoints
│   │   │   ├── crawl.py        # Crawl control endpoints
│   │   │   └── stats.py        # Statistics endpoints
│   │   └── schemas.py          # Pydantic models
│   └── services/
│       ├── __init__.py
│       └── property_service.py # Business logic
├── tests/
│   ├── __init__.py
│   ├── test_parser.py
│   ├── test_crawler.py
│   └── test_api.py
├── .env                        # Environment variables
├── pyproject.toml              # Project dependencies (UV)
└── README.md
```

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

### Database Migrations (Future)

When schema changes are needed:

```bash
# Generate migration
uv run alembic revision --autogenerate -m "Description"

# Apply migration
uv run alembic upgrade head
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
| `uv add <package>` | Add a dependency to pyproject.toml |
| `uv add --dev <package>` | Add a dev dependency |
| `uv lock` | Update the uv.lock file |
| `uv venv` | Create virtual environment |

## Troubleshooting

### IMAP Connection Issues

**Problem**: "Authentication failed"  
**Solution**: Ensure you're using an App Password, not your regular Gmail password

**Problem**: "IMAP access not enabled"  
**Solution**: Enable IMAP in Gmail Settings → Forwarding and POP/IMAP → IMAP Access

### Database Locked

**Problem**: "database is locked" error  
**Solution**: Only one process can write to SQLite at a time. Stop any running instances first.

### No Emails Found

**Problem**: Crawl runs but finds no properties  
**Solution**: 
- Check that emails from `noresponder@idealista.com` exist in your inbox
- Verify the `GMAIL_EMAIL` is correct
- Check logs for filtering issues

### Port Already in Use

**Problem**: "Address already in use" when starting API  
**Solution**: 
```bash
# Find and kill process using port 8000
# Windows:
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# macOS/Linux:
lsof -ti:8000 | xargs kill -9
```

## Configuration Reference

| Variable | Default | Description |
|----------|---------|-------------|
| `GMAIL_EMAIL` | (required) | Your Gmail address |
| `GMAIL_APP_PASSWORD` | (required) | Gmail App Password |
| `DATABASE_URL` | `sqlite:///./idealista_properties.db` | Database connection string |
| `CRAWL_INTERVAL_HOURS` | `1` | Hours between automatic crawls |
| `API_HOST` | `0.0.0.0` | API bind address |
| `API_PORT` | `8000` | API port |
| `LOG_LEVEL` | `INFO` | Logging level (DEBUG, INFO, WARNING, ERROR) |

## Next Steps

1. **Review the API**: Visit `/docs` to explore all available endpoints
2. **Monitor Logs**: Check console output for crawl progress
3. **Set up Alerts**: (Future) Configure notifications for price drops
4. **Export Data**: Use API to export properties to CSV/Excel
