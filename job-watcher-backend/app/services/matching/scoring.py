from dataclasses import dataclass, field
from pydantic import BaseModel

class MatchResult(BaseModel):
    matched: bool
    score: float
    match_reason: str
    matched_role_keywords: list[str] = []
    matched_location_keywords: list[str] = []
    matched_include_keywords: list[str] = []
    excluded_keywords_found: list[str] = []
    job_type_match: bool = False

# Weights for deterministic scoring
SCORE_WEIGHTS = {
    "job_type": 0.30,
    "role": 0.35,
    "location": 0.20,
    "include": 0.15
}

def calculate_score(
    job_type_matched: bool,
    role_matched: bool,
    location_matched: bool,
    include_matched: bool,
    requires_job_type: bool,
    requires_role: bool,
    requires_location: bool,
    requires_include: bool
) -> float:
    """
    Calculates a deterministic score based on what was required and what matched.
    If a field is not required (e.g. no role keywords configured), we can either:
    1. Distribute its weight to other categories.
    2. Just grant the points so it acts as a "match".
    For simplicity, if a category is not required, we grant the points.
    """
    score = 0.0
    
    if not requires_job_type or job_type_matched:
        score += SCORE_WEIGHTS["job_type"]
        
    if not requires_role or role_matched:
        score += SCORE_WEIGHTS["role"]
        
    if not requires_location or location_matched:
        score += SCORE_WEIGHTS["location"]
        
    if not requires_include or include_matched:
        score += SCORE_WEIGHTS["include"]
        
    return round(score, 2)
