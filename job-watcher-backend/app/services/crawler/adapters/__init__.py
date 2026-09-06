from app.services.crawler.adapters.greenhouse import GreenhouseAdapter
from app.services.crawler.adapters.lever import LeverAdapter
from app.services.crawler.adapters.workday import WorkdayAdapter
from app.services.crawler.adapters.ashby import AshbyAdapter
from app.services.crawler.adapters.generic_html import GenericHtmlAdapter
from app.services.crawler.interfaces import CrawlerAdapter
from app.services.crawler.adapters.base import UnsupportedSourceError

class AdapterRegistry:
    _adapters = {
        "greenhouse": GreenhouseAdapter,
        "lever": LeverAdapter,
        "workday": WorkdayAdapter,
        "ashby": AshbyAdapter,
        "generic_html": GenericHtmlAdapter,
    }
    
    @classmethod
    def get_adapter(cls, source: str) -> CrawlerAdapter:
        adapter_cls = cls._adapters.get(source)
        if not adapter_cls:
            raise UnsupportedSourceError(f"No crawler adapter found for source: {source}")
        return adapter_cls()
