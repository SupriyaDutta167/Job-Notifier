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

## Deterministic Matching Engine

The Job Watcher uses a pure deterministic matching engine (no LLM, no AI) to compare jobs against a user's WatchProfile. 
The pipeline operates strictly in memory before updating PostgreSQL:

1. **Normalization:** Job fields and user keywords are stripped of punctuation (excluding \+\, \#\, \.\) and lowercased.
2. **Hard Filters:** Any keyword in \exclude_keywords\ found within the job title results in an immediate rejection (e.g., rejecting 'Senior Software Engineer' if 'senior' is excluded).
3. **Job Type:** Case-insensitive string match on \job_type\ if configured.
4. **Role Match:** Bounded whole-word/phrase check for ole_keywords\ in the job title.
5. **Location Match:** Bounded whole-word/phrase check for \location_keywords\ in the job location.
6. **Include Match:** Bounded whole-word/phrase check for \include_keywords\ across both title and description.
7. **Scoring:** Deterministic weighted distribution:
    - Job Type: 30%
    - Role: 35%
    - Location: 20%
    - Include: 15%
    Total matching score is between 0.0 and 1.0. 
8. **Match Reason:** A testable reason string is generated justifying why a job matched or failed.
