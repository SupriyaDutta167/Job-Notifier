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
1. Ensure `.env` contains a valid `DATABASE_URL` pointing to your real Supabase or local PostgreSQL instance.
2. Ensure you have run database migrations (`alembic upgrade head`).

Run the test manually:
```bash
python scripts/live_test_persistence.py
```
*Note: This script makes real external HTTP requests and creates real `Job` records in your database.*

## Deterministic Matching Engine

The Job Watcher uses a pure deterministic matching engine (no LLM, no AI) to compare jobs against a user's WatchProfile. 
The pipeline operates strictly in memory before updating PostgreSQL:

1. **Normalization:** Job fields and user keywords are stripped of punctuation (excluding `+`, `#`, `.`) and lowercased.
2. **Hard Filters:** Any keyword in `exclude_keywords` found within the job title results in an immediate rejection (e.g., rejecting 'Senior Software Engineer' if 'senior' is excluded).
3. **Job Type:** Case-insensitive string match on `job_type` if configured.
4. **Role Match:** Bounded whole-word/phrase check for `role_keywords` in the job title.
5. **Location Match:** Bounded whole-word/phrase check for `location_keywords` in the job location.
6. **Include Match:** Bounded whole-word/phrase check for `include_keywords` across both title and description.
7. **Scoring:** Deterministic weighted distribution:
    - Job Type: 30%
    - Role: 35%
    - Location: 20%
    - Include: 15%
    Total matching score is between 0.0 and 1.0. 
8. **Match Reason:** A testable reason string is generated justifying why a job matched or failed.

## Telegram Notifications

The platform supports alerting users of job matches via Telegram.

### Setup
1. Create a bot using [@BotFather](https://t.me/botfather) on Telegram.
2. Obtain your bot token.
3. Obtain your personal Telegram Chat ID (e.g. from [@userinfobot](https://t.me/userinfobot)).
4. Add these to your `.env` file:
```env
TELEGRAM_BOT_TOKEN=your_token_here
TELEGRAM_CHAT_ID=your_chat_id_here
```
**Security Warning:** Never commit your Telegram bot token to source control!

### Testing Notifications
You can manually verify that your configuration works by running:
```bash
python scripts/test_telegram.py
```

## Scheduled Scans

Job Watcher is designed to automatically scan monitored company boards and send notifications for any newly discovered matching jobs.

**Architecture:**
- **GitHub Actions** acts as the automated scheduler, triggering a one-shot scan run approximately every two hours via cron (`0 */2 * * *`). 
- **workflow_dispatch** is supported, allowing manual triggering of scans directly from the GitHub Actions UI.
- The Python worker script (`app/worker/scan.py`) handles the execution. It orchestrates the crawler, persistence deduplication, matching, and notification, and then immediately safely closes the DB connection and exits.
- No always-on background scheduler process (like Celery or Redis) is required.
- The database safely enforces idempotency (no duplicate notifications for the same job, even if the worker runs twice concurrently).

**GitHub Secrets Required:**
To enable the scheduled scans, the following variables MUST be added to your repository's **Settings -> Secrets and variables -> Actions**:
- `DATABASE_URL`: Your Supabase connection string.
- `TELEGRAM_BOT_TOKEN`: The API token for your Telegram Bot.
- `TELEGRAM_CHAT_ID`: The recipient's Chat ID.

*Note: Never include these credentials in your source code, workflow YAML, or commit history.*

**Important Limitations:**
GitHub Actions scheduled workflows are subject to GitHub runner availability. Executions may be delayed during peak times. The product guarantee is "approximately every two hours" rather than exactly to the minute. No paid infrastructure was introduced.

**Local Worker Execution:**
You can manually run a complete live scan worker locally using your `.env` configuration:

```bash
python -m app.worker.scan
```
This performs a full live crawl, persistence, matching, and notification dispatch run across all active configured Watch Profiles.

## Supported ATS Platforms

Job Watcher detects and seamlessly parses data from the following Applicant Tracking Systems.

- **Greenhouse**
- **Lever**
- **Ashby**
- **Workday** (Public career pages)

### Workday Integration Details
Support for Workday relies on the public career-site endpoints (typically found on *.myworkdayjobs.com domains) using standard HTTP POST requests (/wday/cxs/{tenant}/{site}/jobs).

**Important Limitations:**
- **No Authenticated APIs:** This integration uses public endpoints only. No OAuth tokens or HR integration credentials are required or supported.
- **Bot Protection:** If a specific company enables aggressive anti-bot protection (e.g., Cloudflare, CAPTCHA, or HTTP 403 blocks), the crawl will safely fail and skip the company. No anti-bot bypass logic (e.g., Playwright/Selenium) is implemented.
- **Supported URLs:** Expected format is https://<tenant>.wd<N>.myworkdayjobs.com/<site> (locales like /en-US/ are supported).
- **Multiple Locations:** If a job lists multiple locations, they are extracted as a single comma-separated string based on Workday's list representation.

**Live Workday Test:**
To verify a Workday endpoint without modifying the database, run:
`ash
python scripts/live_test_workday.py https://nvidia.wd5.myworkdayjobs.com/NVIDIAExternalCareerSite
`
