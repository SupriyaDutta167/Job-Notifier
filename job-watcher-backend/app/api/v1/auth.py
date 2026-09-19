from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.models.user import User
from app.db.session import get_db
from app.core.auth.dependencies import get_current_user
from app.schemas.user import UserResponse, UserUpdate
from app.schemas.notification import TelegramTestResponse
from app.api.v1.notifications import get_notification_service
from app.services.notifications.notification_service import NotificationService
from app.core.exceptions import BadRequestError

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

@router.post("/me/telegram/test", response_model=TelegramTestResponse)
def test_telegram_me(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    service: NotificationService = Depends(get_notification_service),
):
    try:
        return service.test_telegram(db, current_user.id)
    except BadRequestError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
