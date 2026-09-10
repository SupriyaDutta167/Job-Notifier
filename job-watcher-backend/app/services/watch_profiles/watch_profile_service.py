from uuid import UUID
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
        
    wpc_data = data.model_dump()
    if wpc_data.get('career_url'):
        wpc_data['career_url'] = str(wpc_data['career_url'])
        
    wpc = WatchProfileCompany(**wpc_data, watch_profile_id=profile_id)
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
    if 'career_url' in update_data and update_data['career_url']:
        update_data['career_url'] = str(update_data['career_url'])
        
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
