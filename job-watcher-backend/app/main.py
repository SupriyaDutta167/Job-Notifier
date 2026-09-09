from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from app.core.config import settings
from app.api.router import api_router
from app.core.exceptions import UnauthorizedError, ForbiddenError

def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.APP_NAME,
        debug=settings.DEBUG,
    )
    
    @app.exception_handler(UnauthorizedError)
    async def unauthorized_exception_handler(request: Request, exc: UnauthorizedError):
        return JSONResponse(
            status_code=401,
            content={"detail": exc.detail},
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    @app.exception_handler(ForbiddenError)
    async def forbidden_exception_handler(request: Request, exc: ForbiddenError):
        return JSONResponse(
            status_code=403,
            content={"detail": exc.detail},
        )
    
    app.include_router(api_router, prefix="/api")
    
    return app

app = create_app()
