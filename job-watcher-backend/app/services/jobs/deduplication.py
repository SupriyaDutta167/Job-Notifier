import hashlib
from uuid import UUID

def generate_fingerprint(company_id: UUID, source: str, title: str, location: str | None, apply_url: str | None) -> str:
    """
    Generates a deterministic SHA-256 fingerprint for a job to prevent duplication.
    Identity fields: company_id, source, title, location, apply_url.
    """
    components = [
        str(company_id),
        str(source).strip().lower(),
        str(title).strip().lower(),
        str(location).strip().lower() if location else "",
        str(apply_url).strip().lower() if apply_url else ""
    ]
    
    raw_string = "|".join(components)
    return hashlib.sha256(raw_string.encode('utf-8')).hexdigest()
