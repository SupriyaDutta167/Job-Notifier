from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from app.core.config import settings

# Engine configuration
# pool_pre_ping=True helps gracefully handle disconnected connections
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    # Avoid creating excessive connections for now
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db() -> Generator[Session, None, None]:
    """
    Dependency to provide a database session for a single request/task.
    Yields the session and ensures it is closed afterwards.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def check_database_connection() -> bool:
    """
    Checks if the database is reachable.
    Returns True if reachable, False otherwise.
    """
    import logging
    from sqlalchemy import text
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception as e:
        logging.error(f"Database connection failed: {type(e).__name__}")
        return False
