from urllib.parse import urlparse
from pydantic import BaseModel

class DetectedSource(BaseModel):
    source: str
    confidence: str
    reason: str

def detect_source(career_url: str) -> DetectedSource:
    try:
        parsed = urlparse(career_url)
        hostname = parsed.hostname or ""
        hostname = hostname.lower()
        
        if "boards.greenhouse.io" in hostname:
            return DetectedSource(source="greenhouse", confidence="high", reason="Known Greenhouse hostname")
            
        if "jobs.lever.co" in hostname:
            return DetectedSource(source="lever", confidence="high", reason="Known Lever hostname")
            
        if "myworkdayjobs.com" in hostname:
            return DetectedSource(source="workday", confidence="high", reason="Known Workday hostname")
            
        if "jobs.ashbyhq.com" in hostname:
            return DetectedSource(source="ashby", confidence="high", reason="Known Ashby hostname")
            
        return DetectedSource(source="generic_html", confidence="low", reason="No known ATS pattern matched, falling back to generic HTML")
    except Exception:
        return DetectedSource(source="generic_html", confidence="low", reason="URL parsing failed, falling back to generic HTML")
