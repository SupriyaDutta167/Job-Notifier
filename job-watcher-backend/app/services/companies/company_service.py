from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
import re

from app.db.models.company import Company
from app.db.models.watch_profile_company import WatchProfileCompany
from app.schemas.company import CompanyCreate, CompanyUpdate
from app.core.exceptions import NotFoundError, ConflictError

def create_company(db: Session, data: CompanyCreate) -> Company:
    company_data = data.model_dump()
    if 'slug' not in company_data or not company_data.get('slug'):
        # Generate slug from name
        slug = re.sub(r'[^a-z0-9]+', '-', company_data['name'].lower()).strip('-')
        company_data['slug'] = slug
        
    if company_data.get('website_url'):
        company_data['website_url'] = str(company_data['website_url'])
        
    company = Company(**company_data)
    db.add(company)
    try:
        db.commit()
        db.refresh(company)
        return company
    except IntegrityError:
        db.rollback()
        raise ConflictError(f"Company with slug '{company_data['slug']}' already exists.")

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
    if 'website_url' in update_data and update_data['website_url']:
        update_data['website_url'] = str(update_data['website_url'])
    
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
