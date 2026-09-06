from app.db.models.job import Job
from app.db.models.watch_rule import WatchRule
from app.services.matching.text_normalization import normalize_text, normalize_keyword, contains_keyword
from app.services.matching.scoring import MatchResult, calculate_score

def evaluate_match(job: Job, rule: WatchRule) -> MatchResult:
    # 1. Normalize
    norm_title = normalize_text(job.title)
    norm_location = normalize_text(job.location)
    norm_desc = normalize_text(job.description)
    norm_job_type = normalize_text(job.job_type)
    
    # 2. Hard Exclusions (Title only for MVP to reduce false positives)
    excluded_keywords_found = []
    if rule.exclude_keywords:
        for kw in rule.exclude_keywords:
            norm_kw = normalize_keyword(kw)
            if contains_keyword(norm_title, norm_kw):
                excluded_keywords_found.append(kw)
                
    if excluded_keywords_found:
        return MatchResult(
            matched=False,
            score=0.0,
            match_reason=f"Rejected because job title contains excluded keyword '{excluded_keywords_found[0]}'.",
            excluded_keywords_found=excluded_keywords_found
        )
        
    # 3. Job Type Check
    job_type_match = False
    requires_job_type = bool(rule.job_type)
    if requires_job_type:
        norm_rule_job_type = normalize_keyword(rule.job_type)
        if norm_rule_job_type and norm_job_type and norm_rule_job_type == norm_job_type:
            job_type_match = True
            
    if requires_job_type and not job_type_match:
        return MatchResult(
            matched=False,
            score=0.0,
            match_reason=f"Rejected because job type '{job.job_type}' does not match required type '{rule.job_type}'.",
            job_type_match=False
        )

    # 4. Role Matching
    matched_role_keywords = []
    requires_role = bool(rule.role_keywords and len(rule.role_keywords) > 0)
    if requires_role:
        for kw in rule.role_keywords:
            if contains_keyword(norm_title, normalize_keyword(kw)):
                matched_role_keywords.append(kw)
                
    if requires_role and not matched_role_keywords:
        return MatchResult(
            matched=False,
            score=0.0,
            match_reason="Rejected because job title does not contain any required role keywords."
        )

    # 5. Location Matching
    matched_location_keywords = []
    requires_location = bool(rule.location_keywords and len(rule.location_keywords) > 0)
    if requires_location:
        for kw in rule.location_keywords:
            if contains_keyword(norm_location, normalize_keyword(kw)):
                matched_location_keywords.append(kw)
                
    if requires_location and not matched_location_keywords:
        return MatchResult(
            matched=False,
            score=0.0,
            match_reason="Rejected because job location does not contain any required location keywords."
        )

    # 6. Include-keyword Evaluation
    # Search in both title and description
    matched_include_keywords = []
    requires_include = bool(rule.include_keywords and len(rule.include_keywords) > 0)
    if requires_include:
        for kw in rule.include_keywords:
            norm_kw = normalize_keyword(kw)
            if contains_keyword(norm_title, norm_kw) or contains_keyword(norm_desc, norm_kw):
                matched_include_keywords.append(kw)
                
    if requires_include and not matched_include_keywords:
        return MatchResult(
            matched=False,
            score=0.0,
            match_reason="Rejected because job does not contain any requested include keywords in title or description."
        )

    # 7. Score
    score = calculate_score(
        job_type_matched=job_type_match,
        role_matched=bool(matched_role_keywords),
        location_matched=bool(matched_location_keywords),
        include_matched=bool(matched_include_keywords),
        requires_job_type=requires_job_type,
        requires_role=requires_role,
        requires_location=requires_location,
        requires_include=requires_include
    )
    
    # Generate reason
    reasons = []
    if requires_job_type:
        reasons.append(f"job type '{rule.job_type}'")
    if requires_role:
        reasons.append(f"role keyword '{matched_role_keywords[0]}'")
    if requires_location:
        reasons.append(f"location keyword '{matched_location_keywords[0]}'")
    if requires_include:
        reasons.append(f"include keyword '{matched_include_keywords[0]}'")
        
    reason_str = "Matched " + ", ".join(reasons) + ". No excluded terms found." if reasons else "Matched all criteria (no specific restrictions configured)."
    
    return MatchResult(
        matched=True,
        score=score,
        match_reason=reason_str,
        matched_role_keywords=matched_role_keywords,
        matched_location_keywords=matched_location_keywords,
        matched_include_keywords=matched_include_keywords,
        job_type_match=job_type_match
    )
