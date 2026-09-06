from uuid import UUID
from app.services.crawler.adapters.base import BaseAdapter
from app.services.crawler.interfaces import CrawlerResult

class GenericHtmlAdapter(BaseAdapter):
    source_name = "generic_html"
    
    def discover_jobs(self, career_url: str, company_id: UUID) -> CrawlerResult:
        # Skeleton implementation for Stage 7
        # Generic HTML crawling is inherently unreliable; conservative fallback
        try:
            return self.create_success_result([])
        except Exception as e:
            return self.create_error_result(e)
