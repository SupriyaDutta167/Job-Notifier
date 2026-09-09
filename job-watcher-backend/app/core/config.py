from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    APP_NAME: str = "job-watcher"
    APP_ENV: str = "development"
    DEBUG: bool = True
    DATABASE_URL: str = "postgresql+psycopg://postgres:password@localhost:5432/job_watcher"
    LOG_LEVEL: str = "INFO"
    
    TELEGRAM_BOT_TOKEN: Optional[str] = None
    TELEGRAM_CHAT_ID: Optional[str] = None
    TELEGRAM_API_BASE_URL: str = "https://api.telegram.org"
    
    SUPABASE_JWT_SECRET: Optional[str] = None
    
    CRAWLER_REQUEST_TIMEOUT_SECONDS: int = 15
    CRAWLER_MAX_RETRIES: int = 2
    CRAWLER_MAX_REQUESTS_PER_CRAWL: int = 150
    CRAWLER_MAX_DURATION_SECONDS: int = 120
    CRAWLER_MAX_CONCURRENCY: int = 3
    PLAYWRIGHT_MAX_CONCURRENCY: int = 1
    MAX_SCAN_DURATION_SECONDS: int = 3600  # 1 hour max for whole scan

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

settings = Settings()
