import pytest
import uuid
from app.services.crawler.detector import detect_source
from app.services.crawler.adapters import AdapterRegistry
from app.services.crawler.adapters.base import UnsupportedSourceError
from app.services.crawler.adapters.greenhouse import GreenhouseAdapter
from app.services.crawler.orchestrator import execute_crawl

def test_source_detection_greenhouse():
    detected = detect_source("https://boards.greenhouse.io/example")
    assert detected.source == "greenhouse"
    assert detected.confidence == "high"

def test_source_detection_lever():
    detected = detect_source("https://jobs.lever.co/example")
    assert detected.source == "lever"

def test_source_detection_workday():
    detected = detect_source("https://company.myworkdayjobs.com/en-US/careers")
    assert detected.source == "workday"

def test_source_detection_ashby():
    detected = detect_source("https://jobs.ashbyhq.com/example")
    assert detected.source == "ashby"

def test_source_detection_unknown():
    detected = detect_source("https://random-company.com/careers")
    assert detected.source == "generic_html"
    assert detected.confidence == "low"

def test_source_detection_invalid_url():
    detected = detect_source("not-a-url")
    assert detected.source == "generic_html"
    assert detected.confidence == "low"

def test_adapter_registry():
    adapter = AdapterRegistry.get_adapter("greenhouse")
    assert isinstance(adapter, GreenhouseAdapter)
    
    with pytest.raises(UnsupportedSourceError):
        AdapterRegistry.get_adapter("invalid_source")

def test_adapter_contract():
    adapter = AdapterRegistry.get_adapter("greenhouse")
    assert hasattr(adapter, "discover_jobs")
    
    # Verify the result structure without making HTTP requests
    result = adapter.discover_jobs("https://boards.greenhouse.io/test", uuid.uuid4())
    assert result.success is True
    assert result.source == "greenhouse"
    assert isinstance(result.jobs, list)

def test_orchestrator_success():
    company_id = uuid.uuid4()
    # It should correctly identify greenhouse, grab the adapter, and execute without crashing
    result = execute_crawl("https://boards.greenhouse.io/test", company_id)
    assert result.success is True
    assert result.source == "greenhouse"

def test_orchestrator_adapter_failure(monkeypatch):
    company_id = uuid.uuid4()
    
    # Mock the adapter to throw an unexpected exception
    def mock_discover_jobs(self, url, cid):
        raise Exception("Mocked catastrophic adapter failure")
        
    monkeypatch.setattr(GreenhouseAdapter, "discover_jobs", mock_discover_jobs)
    
    result = execute_crawl("https://boards.greenhouse.io/test", company_id)
    assert result.success is False
    assert result.jobs == []
    assert "Mocked catastrophic adapter failure" in result.error
