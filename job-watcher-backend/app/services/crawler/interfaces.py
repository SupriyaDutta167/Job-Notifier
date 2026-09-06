from abc import ABC, abstractmethod
from typing import List, Optional
from pydantic import BaseModel
from app.schemas.job import DiscoveredJob
from uuid import UUID

class CrawlerResult(BaseModel):
    jobs: List[DiscoveredJob]
    source: str
    success: bool
    error: Optional[str] = None
    
class CrawlerAdapter(ABC):
    @abstractmethod
    def discover_jobs(self, career_url: str, company_id: UUID) -> CrawlerResult:
        pass
