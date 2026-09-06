import pytest
from app.db.models.job import Job
from app.db.models.watch_rule import WatchRule
from app.services.matching.matcher import evaluate_match
from app.services.matching.text_normalization import contains_keyword, normalize_text

def test_normalization():
    assert normalize_text("C++") == "c++"
    assert normalize_text("C#") == "c#"
    assert normalize_text(".NET Developer") == ".net developer"
    assert normalize_text("Senior   Software\tEngineer") == "senior software engineer"
    assert normalize_text("Software Engineer (Intern)") == "software engineer intern"
    
def test_contains_keyword():
    assert contains_keyword(normalize_text("Senior Software Engineer"), normalize_text("Software Engineer")) is True
    assert contains_keyword(normalize_text("Software Engineering Manager"), normalize_text("Software Engineer")) is False
    assert contains_keyword(normalize_text("C++ Developer"), normalize_text("C++")) is True

def test_matching_exact_role():
    job = Job(title="Software Engineer", location="Bangalore", job_type="FullTime", description="")
    rule = WatchRule(role_keywords=["software engineer"], location_keywords=[], exclude_keywords=[], include_keywords=[])
    
    result = evaluate_match(job, rule)
    assert result.matched is True
    assert result.score == 1.0
    
def test_matching_case_insensitive_role():
    job = Job(title="SOFTWARE Engineer", location="Bangalore", job_type="FullTime", description="")
    rule = WatchRule(role_keywords=["software engineer"], location_keywords=[], exclude_keywords=[], include_keywords=[])
    
    result = evaluate_match(job, rule)
    assert result.matched is True
    
def test_matching_one_of_many_roles():
    job = Job(title="SDE", location="Bangalore", job_type="FullTime", description="")
    rule = WatchRule(role_keywords=["software engineer", "sde", "swe"], location_keywords=[], exclude_keywords=[], include_keywords=[])
    
    result = evaluate_match(job, rule)
    assert result.matched is True
    assert "sde" in result.matched_role_keywords
    
def test_matching_no_role_match():
    job = Job(title="Product Manager", location="Bangalore", job_type="FullTime", description="")
    rule = WatchRule(role_keywords=["software engineer", "sde", "swe"], location_keywords=[], exclude_keywords=[], include_keywords=[])
    
    result = evaluate_match(job, rule)
    assert result.matched is False

def test_matching_empty_role_list():
    job = Job(title="Product Manager", location="Bangalore", job_type="FullTime", description="")
    rule = WatchRule(role_keywords=[], location_keywords=[], exclude_keywords=[], include_keywords=[])
    
    result = evaluate_match(job, rule)
    assert result.matched is True # No restriction

def test_matching_token_boundary():
    job = Job(title="Software Engineering Manager", location="Bangalore", job_type="FullTime", description="")
    rule = WatchRule(role_keywords=["software engineer"], location_keywords=[], exclude_keywords=[], include_keywords=[])
    
    result = evaluate_match(job, rule)
    assert result.matched is False
    
def test_technology_names():
    job = Job(title="C++ Developer", location="Bangalore", job_type="FullTime", description="")
    rule = WatchRule(role_keywords=["C++"], location_keywords=[], exclude_keywords=[], include_keywords=[])
    
    result = evaluate_match(job, rule)
    assert result.matched is True
    
def test_location_exact():
    job = Job(title="Software Engineer", location="Bengaluru, Karnataka, India", job_type="FullTime", description="")
    rule = WatchRule(role_keywords=[], location_keywords=["Bengaluru"], exclude_keywords=[], include_keywords=[])
    
    result = evaluate_match(job, rule)
    assert result.matched is True
    
def test_location_missing():
    job = Job(title="Software Engineer", location=None, job_type="FullTime", description="")
    rule = WatchRule(role_keywords=[], location_keywords=["Bengaluru"], exclude_keywords=[], include_keywords=[])
    
    result = evaluate_match(job, rule)
    assert result.matched is False
    
def test_job_type():
    job = Job(title="Software Engineer", location="Bangalore", job_type="Internship", description="")
    rule = WatchRule(role_keywords=[], location_keywords=[], exclude_keywords=[], include_keywords=[], job_type="internship")
    
    result = evaluate_match(job, rule)
    assert result.matched is True

    job2 = Job(title="Software Engineer Intern", location="Bangalore", job_type=None, description="")
    result2 = evaluate_match(job2, rule)
    assert result2.matched is False # No semantic inference

def test_exclusion_senior():
    job = Job(title="Senior Software Engineer", location="Bangalore", job_type="FullTime", description="")
    rule = WatchRule(role_keywords=["software engineer"], location_keywords=[], exclude_keywords=["senior"], include_keywords=[])
    
    result = evaluate_match(job, rule)
    assert result.matched is False
    assert "senior" in result.excluded_keywords_found
    
def test_include_keywords():
    job = Job(title="Software Engineer", location="Bangalore", job_type="FullTime", description="We use distributed systems and kubernetes.")
    rule = WatchRule(role_keywords=["software engineer"], location_keywords=[], exclude_keywords=[], include_keywords=["distributed systems"])
    
    result = evaluate_match(job, rule)
    assert result.matched is True
    
def test_include_missing():
    job = Job(title="Software Engineer", location="Bangalore", job_type="FullTime", description="We use react.")
    rule = WatchRule(role_keywords=["software engineer"], location_keywords=[], exclude_keywords=[], include_keywords=["distributed systems"])
    
    result = evaluate_match(job, rule)
    assert result.matched is False

def test_exclusion_beats_high_match():
    job = Job(title="Senior Software Engineer", location="Bangalore", job_type="Internship", description="distributed systems")
    rule = WatchRule(role_keywords=["software engineer"], location_keywords=["Bangalore"], exclude_keywords=["senior"], include_keywords=["distributed systems"], job_type="internship")
    
    result = evaluate_match(job, rule)
    assert result.matched is False # Excluded despite high score otherwise!
