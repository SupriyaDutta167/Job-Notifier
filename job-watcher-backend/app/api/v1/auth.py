from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.models.user import User
from app.db.session import get_db
from app.core.auth.dependencies import get_current_user
from app.schemas.user import UserResponse, UserUpdate

router = APIRouter()

@router.get("/me", response_model=UserResponse)
def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.patch("/me", response_model=UserResponse)
def update_user_me(data: UserUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(current_user, key, value)
    db.commit()
    db.refresh(current_user)
    return current_user
