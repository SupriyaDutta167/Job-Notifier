from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.auth.dependencies import get_current_user
from app.db.models.user import User
from app.schemas.notification import NotificationResponse, TelegramTestResponse
from app.services.notifications.notification_service import NotificationService
from app.services.notifications.telegram import TelegramNotificationProvider
from app.core.exceptions import NotFoundError, BadRequestError

router = APIRouter()

def get_notification_service() -> NotificationService:
    return NotificationService(provider=TelegramNotificationProvider())

@router.get("", response_model=list[NotificationResponse])
def list_notifications(
    status: str | None = Query(None, description="Filter notifications by status (e.g. sent, pending, failed)"),
    channel: str | None = Query(None, description="Filter notifications by channel (e.g. telegram)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    service: NotificationService = Depends(get_notification_service),
):
    return service.list_notifications(db, current_user.id, status=status, channel=channel)

@router.get("/{notification_id}", response_model=NotificationResponse)
def get_notification(
    notification_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    service: NotificationService = Depends(get_notification_service),
):
    try:
        return service.get_notification(db, current_user.id, notification_id)
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

@router.post("/{notification_id}/retry", response_model=NotificationResponse)
def retry_notification(
    notification_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    service: NotificationService = Depends(get_notification_service),
):
    try:
        return service.retry_notification(db, current_user.id, notification_id)
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except BadRequestError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.post("/telegram/test", response_model=TelegramTestResponse)
def test_telegram_notification(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    service: NotificationService = Depends(get_notification_service),
):
    try:
        return service.test_telegram(db, current_user.id)
    except BadRequestError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
