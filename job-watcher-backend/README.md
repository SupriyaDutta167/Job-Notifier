# Job Watcher Backend

This is the foundational backend for the Job Watcher platform, designed as a modular monolith.

## Setup Instructions

1.  **Python Version**: Requires Python 3.12+
2.  **Database**: Requires PostgreSQL

### Installation

```bash
python -m venv .venv
# On Windows
.venv\Scripts\activate
# On Unix
# source .venv/bin/activate

pip install -r requirements.txt
```

### Configuration

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

### Database Setup

1. **PostgreSQL** is required for local database integration tests and development.
2. The **DATABASE_URL** environment variable configures the database connection.
3. **Alembic** is used to manage database schema migrations. The application does not automatically create tables (`create_all` is not used).
4. You can use a local PostgreSQL instance or a hosted provider like **Supabase**. Just supply the appropriate `DATABASE_URL`.
5. **NEVER** commit your `.env` file containing real credentials.

To prepare the database:
```bash
alembic upgrade head
```

### Running the Server

```bash
uvicorn app.main:app --reload
```

### Running Tests

```bash
pytest
```

### Database Migrations

```bash
alembic upgrade head
```

## Live Persistence Test

You can manually run a real end-to-end integration test against a live company board (e.g. Figma) that persists data into your database.

Requirements:
1. Ensure .env contains a valid DATABASE_URL pointing to your real Supabase or local PostgreSQL instance.
2. Ensure you have run database migrations (lembic upgrade head).

Run the test manually:
\\ash
python scripts/live_test_persistence.py
\
*Note: This script makes real external HTTP requests and creates real \Job\ records in your database.*
