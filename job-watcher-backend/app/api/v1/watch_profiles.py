from uuid import UUID
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
