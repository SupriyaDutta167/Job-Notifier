import os

base_dir = r".""

files = {
    "app/services/companies/company_service.py": """from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from app.db.models.company import Company
from app.db.models.watch_profile_company import WatchProfileCompany
from app.schemas.company import CompanyCreate, CompanyUpdate
from app.core.exceptions import NotFoundError, ConflictError

def create_company(db: Session, data: CompanyCreate) -> Company:
    company = Company(**data.model_dump())
    db.add(company)
    try:
        db.commit()
        db.refresh(company)
        return company
    except IntegrityError:
        db.rollback()
        raise ConflictError(f"Company with slug '{data.slug}' already exists.")

def get_company(db: Session, company_id: UUID) -> Company:
    company = db.execute(select(Company).where(Company.id == company_id)).scalars().first()
    if not company:
        raise NotFoundError("Company not found")
    return company

def list_companies(db: Session) -> list[Company]:
    return list(db.execute(select(Company).order_by(Company.created_at.desc())).scalars().all())

def update_company(db: Session, company_id: UUID, data: CompanyUpdate) -> Company:
    company = get_company(db, company_id)
    update_data = data.model_dump(exclude_unset=True)
    
    for key, value in update_data.items():
        setattr(company, key, value)
        
    try:
        db.commit()
        db.refresh(company)
        return company
    except IntegrityError:
        db.rollback()
        raise ConflictError("Company update failed due to a constraint conflict (e.g., duplicate slug).")

def delete_company(db: Session, company_id: UUID) -> None:
    company = get_company(db, company_id)
    
    # Check for dependent relationships (WatchProfileCompany)
    deps = db.execute(select(WatchProfileCompany).where(WatchProfileCompany.company_id == company_id)).scalars().first()
    if deps:
        raise ConflictError("Cannot delete company because it is being monitored by one or more watch profiles.")
        
    db.delete(company)
    db.commit()
""",
    "app/services/watch_profiles/watch_profile_service.py": """from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from app.db.models.watch_profile import WatchProfile
from app.db.models.watch_profile_company import WatchProfileCompany
from app.db.models.watch_rule import WatchRule
from app.db.models.company import Company
from app.schemas.watch_profile import WatchProfileCreate, WatchProfileUpdate
from app.schemas.watch_profile_company import WatchProfileCompanyCreate, WatchProfileCompanyUpdate
from app.schemas.watch_rule import WatchRuleCreate, WatchRuleUpdate
from app.core.exceptions import NotFoundError, ConflictError

# --- Watch Profile ---
def create_watch_profile(db: Session, user_id: UUID, data: WatchProfileCreate) -> WatchProfile:
    profile = WatchProfile(**data.model_dump(), user_id=user_id)
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile

def get_watch_profile(db: Session, user_id: UUID, profile_id: UUID) -> WatchProfile:
    profile = db.execute(
        select(WatchProfile).where(WatchProfile.id == profile_id, WatchProfile.user_id == user_id)
    ).scalars().first()
    if not profile:
        raise NotFoundError("Watch profile not found or access denied")
    return profile

def list_watch_profiles(db: Session, user_id: UUID) -> list[WatchProfile]:
    return list(db.execute(
        select(WatchProfile).where(WatchProfile.user_id == user_id).order_by(WatchProfile.created_at.desc())
    ).scalars().all())

def update_watch_profile(db: Session, user_id: UUID, profile_id: UUID, data: WatchProfileUpdate) -> WatchProfile:
    profile = get_watch_profile(db, user_id, profile_id)
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(profile, key, value)
    db.commit()
    db.refresh(profile)
    return profile

def delete_watch_profile(db: Session, user_id: UUID, profile_id: UUID) -> None:
    profile = get_watch_profile(db, user_id, profile_id)
    db.delete(profile)
    db.commit()

# --- Watch Profile Companies ---
def add_company_to_watch_profile(db: Session, user_id: UUID, profile_id: UUID, data: WatchProfileCompanyCreate) -> WatchProfileCompany:
    # Verify profile exists and belongs to user
    get_watch_profile(db, user_id, profile_id)
    
    # Verify company exists
    company = db.execute(select(Company).where(Company.id == data.company_id)).scalars().first()
    if not company:
        raise NotFoundError("Company not found")
        
    wpc = WatchProfileCompany(**data.model_dump(), watch_profile_id=profile_id)
    db.add(wpc)
    try:
        db.commit()
        db.refresh(wpc)
        return wpc
    except IntegrityError:
        db.rollback()
        raise ConflictError("This company career URL is already being monitored by this watch profile.")

def list_watch_profile_companies(db: Session, user_id: UUID, profile_id: UUID) -> list[WatchProfileCompany]:
    get_watch_profile(db, user_id, profile_id)
    return list(db.execute(
        select(WatchProfileCompany).where(WatchProfileCompany.watch_profile_id == profile_id)
    ).scalars().all())

def update_watch_profile_company(db: Session, user_id: UUID, profile_id: UUID, relationship_id: UUID, data: WatchProfileCompanyUpdate) -> WatchProfileCompany:
    get_watch_profile(db, user_id, profile_id)
    wpc = db.execute(
        select(WatchProfileCompany).where(WatchProfileCompany.id == relationship_id, WatchProfileCompany.watch_profile_id == profile_id)
    ).scalars().first()
    if not wpc:
        raise NotFoundError("Watch profile company relationship not found")
        
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(wpc, key, value)
    db.commit()
    db.refresh(wpc)
    return wpc

def remove_company_from_watch_profile(db: Session, user_id: UUID, profile_id: UUID, relationship_id: UUID) -> None:
    get_watch_profile(db, user_id, profile_id)
    wpc = db.execute(
        select(WatchProfileCompany).where(WatchProfileCompany.id == relationship_id, WatchProfileCompany.watch_profile_id == profile_id)
    ).scalars().first()
    if not wpc:
        raise NotFoundError("Watch profile company relationship not found")
    db.delete(wpc)
    db.commit()

# --- Watch Rules ---
def create_watch_rule(db: Session, user_id: UUID, profile_id: UUID, data: WatchRuleCreate) -> WatchRule:
    get_watch_profile(db, user_id, profile_id)
    rule = WatchRule(**data.model_dump(), watch_profile_id=profile_id)
    db.add(rule)
    try:
        db.commit()
        db.refresh(rule)
        return rule
    except IntegrityError:
        db.rollback()
        raise ConflictError("A watch rule already exists for this profile.")

def get_watch_rule(db: Session, user_id: UUID, profile_id: UUID) -> WatchRule:
    get_watch_profile(db, user_id, profile_id)
    rule = db.execute(select(WatchRule).where(WatchRule.watch_profile_id == profile_id)).scalars().first()
    if not rule:
        raise NotFoundError("Watch rule not found for this profile")
    return rule

def update_watch_rule(db: Session, user_id: UUID, profile_id: UUID, data: WatchRuleUpdate) -> WatchRule:
    rule = get_watch_rule(db, user_id, profile_id)
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(rule, key, value)
    db.commit()
    db.refresh(rule)
    return rule

def delete_watch_rule(db: Session, user_id: UUID, profile_id: UUID) -> None:
    rule = get_watch_rule(db, user_id, profile_id)
    db.delete(rule)
    db.commit()
""",
    "app/api/v1/companies.py": """from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.company import CompanyCreate, CompanyUpdate, CompanyResponse
from app.services.companies import company_service
from app.core.exceptions import NotFoundError, ConflictError

router = APIRouter()

@router.post("", response_model=CompanyResponse, status_code=status.HTTP_201_CREATED)
def create_company(data: CompanyCreate, db: Session = Depends(get_db)):
    try:
        return company_service.create_company(db, data)
    except ConflictError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))

@router.get("", response_model=list[CompanyResponse])
def list_companies(db: Session = Depends(get_db)):
    return company_service.list_companies(db)

@router.get("/{company_id}", response_model=CompanyResponse)
def get_company(company_id: UUID, db: Session = Depends(get_db)):
    try:
        return company_service.get_company(db, company_id)
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

@router.patch("/{company_id}", response_model=CompanyResponse)
def update_company(company_id: UUID, data: CompanyUpdate, db: Session = Depends(get_db)):
    try:
        return company_service.update_company(db, company_id, data)
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ConflictError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))

@router.delete("/{company_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_company(company_id: UUID, db: Session = Depends(get_db)):
    try:
        company_service.delete_company(db, company_id)
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ConflictError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
""",
    "app/api/v1/watch_profiles.py": """from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.watch_profile import WatchProfileCreate, WatchProfileUpdate, WatchProfileResponse
from app.schemas.watch_profile_company import WatchProfileCompanyCreate, WatchProfileCompanyUpdate, WatchProfileCompanyResponse
from app.schemas.watch_rule import WatchRuleCreate, WatchRuleUpdate, WatchRuleResponse
from app.services.watch_profiles import watch_profile_service
from app.core.exceptions import NotFoundError, ConflictError

router = APIRouter()

# Dummy dependency to simulate an authenticated user context since auth is not implemented yet.
# We accept an x-user-id header to allow testing cross-user scoping properly.
def get_current_user_id(x_user_id: UUID = Header(..., description="Simulate authenticated user UUID")) -> UUID:
    return x_user_id

@router.post("", response_model=WatchProfileResponse, status_code=status.HTTP_201_CREATED)
def create_watch_profile(data: WatchProfileCreate, db: Session = Depends(get_db), user_id: UUID = Depends(get_current_user_id)):
    return watch_profile_service.create_watch_profile(db, user_id, data)

@router.get("", response_model=list[WatchProfileResponse])
def list_watch_profiles(db: Session = Depends(get_db), user_id: UUID = Depends(get_current_user_id)):
    return watch_profile_service.list_watch_profiles(db, user_id)

@router.get("/{profile_id}", response_model=WatchProfileResponse)
def get_watch_profile(profile_id: UUID, db: Session = Depends(get_db), user_id: UUID = Depends(get_current_user_id)):
    try:
        return watch_profile_service.get_watch_profile(db, user_id, profile_id)
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

@router.patch("/{profile_id}", response_model=WatchProfileResponse)
def update_watch_profile(profile_id: UUID, data: WatchProfileUpdate, db: Session = Depends(get_db), user_id: UUID = Depends(get_current_user_id)):
    try:
        return watch_profile_service.update_watch_profile(db, user_id, profile_id, data)
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

@router.delete("/{profile_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_watch_profile(profile_id: UUID, db: Session = Depends(get_db), user_id: UUID = Depends(get_current_user_id)):
    try:
        watch_profile_service.delete_watch_profile(db, user_id, profile_id)
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

# --- Watch Profile Companies ---

@router.post("/{profile_id}/companies", response_model=WatchProfileCompanyResponse, status_code=status.HTTP_201_CREATED)
def add_company(profile_id: UUID, data: WatchProfileCompanyCreate, db: Session = Depends(get_db), user_id: UUID = Depends(get_current_user_id)):
    try:
        return watch_profile_service.add_company_to_watch_profile(db, user_id, profile_id, data)
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ConflictError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))

@router.get("/{profile_id}/companies", response_model=list[WatchProfileCompanyResponse])
def list_companies(profile_id: UUID, db: Session = Depends(get_db), user_id: UUID = Depends(get_current_user_id)):
    try:
        return watch_profile_service.list_watch_profile_companies(db, user_id, profile_id)
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

@router.patch("/{profile_id}/companies/{relationship_id}", response_model=WatchProfileCompanyResponse)
def update_company(profile_id: UUID, relationship_id: UUID, data: WatchProfileCompanyUpdate, db: Session = Depends(get_db), user_id: UUID = Depends(get_current_user_id)):
    try:
        return watch_profile_service.update_watch_profile_company(db, user_id, profile_id, relationship_id, data)
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

@router.delete("/{profile_id}/companies/{relationship_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_company(profile_id: UUID, relationship_id: UUID, db: Session = Depends(get_db), user_id: UUID = Depends(get_current_user_id)):
    try:
        watch_profile_service.remove_company_from_watch_profile(db, user_id, profile_id, relationship_id)
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

# --- Watch Rules ---

@router.post("/{profile_id}/rules", response_model=WatchRuleResponse, status_code=status.HTTP_201_CREATED)
def create_rule(profile_id: UUID, data: WatchRuleCreate, db: Session = Depends(get_db), user_id: UUID = Depends(get_current_user_id)):
    try:
        return watch_profile_service.create_watch_rule(db, user_id, profile_id, data)
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ConflictError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))

@router.get("/{profile_id}/rules", response_model=WatchRuleResponse)
def get_rule(profile_id: UUID, db: Session = Depends(get_db), user_id: UUID = Depends(get_current_user_id)):
    try:
        return watch_profile_service.get_watch_rule(db, user_id, profile_id)
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

@router.patch("/{profile_id}/rules", response_model=WatchRuleResponse)
def update_rule(profile_id: UUID, data: WatchRuleUpdate, db: Session = Depends(get_db), user_id: UUID = Depends(get_current_user_id)):
    try:
        return watch_profile_service.update_watch_rule(db, user_id, profile_id, data)
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

@router.delete("/{profile_id}/rules", status_code=status.HTTP_204_NO_CONTENT)
def delete_rule(profile_id: UUID, db: Session = Depends(get_db), user_id: UUID = Depends(get_current_user_id)):
    try:
        watch_profile_service.delete_watch_rule(db, user_id, profile_id)
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
"""
}

for filepath, content in files.items():
    full_path = os.path.join(base_dir, filepath)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, "w", encoding="utf-8") as f:
        f.write(content)

open(os.path.join(base_dir, "app/services/companies/__init__.py"), "a").close()
open(os.path.join(base_dir, "app/services/watch_profiles/__init__.py"), "a").close()

print("Created Stage 5 services and routes")
