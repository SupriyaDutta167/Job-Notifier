from fastapi import FastAPI
from app.core.config import settings
from app.api.router import api_router

def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.APP_NAME,
        debug=settings.DEBUG,
    )
    
    app.include_router(api_router, prefix="/api")
    
    return app

app = create_app()
