import re
import html
from urllib.parse import urlparse, urlunparse

def clean_whitespace(text: str | None) -> str | None:
    if not text:
        return text
    text = str(text)
    # Replace unicode whitespace and collapse multiple spaces
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

def normalize_title(title: str) -> str:
    cleaned = clean_whitespace(title)
    return cleaned if cleaned else ""

def normalize_location(location: str | None) -> str | None:
    return clean_whitespace(location)

def normalize_job_type(job_type: str | None) -> str | None:
    if not job_type:
        return job_type
    return clean_whitespace(job_type).lower()

def normalize_url(url: str | None) -> str | None:
    if not url:
        return url
    url = str(url).strip()
    parsed = urlparse(url)
    # Remove trailing slash from path if it's not the root
    path = parsed.path
    if len(path) > 1 and path.endswith('/'):
        path = path.rstrip('/')
    
    # Reconstruct url
    return urlunparse((
        parsed.scheme,
        parsed.netloc.lower(),
        path,
        parsed.params,
        parsed.query,
        parsed.fragment
    ))

def normalize_description(html_desc: str | None) -> str | None:
    if not html_desc:
        return html_desc
    # Unescape HTML entities
    text = html.unescape(html_desc)
    # Remove HTML tags using a basic regex
    text = re.sub(r'<[^>]+>', ' ', text)
    # Clean up whitespace
    return clean_whitespace(text)

def normalize_source(source: str) -> str:
    cleaned = clean_whitespace(source)
    return cleaned.lower() if cleaned else "unknown"
