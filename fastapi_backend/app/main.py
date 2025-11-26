from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorDatabase

from .config import get_settings
from .db import get_database
from .routers import auth, companies, ping, questions, users, chats


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="LeetCode Tracker FastAPI Backend")

    # CORS - frontend_origins is already a list from the validator
    origins = settings.frontend_origins if isinstance(settings.frontend_origins, list) else [
        "http://localhost:5173",
        "http://localhost:3000",
        "https://grindmate-ai.vercel.app"
    ]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Routers
    app.include_router(ping.router)
    app.include_router(auth.router)
    app.include_router(users.router)
    app.include_router(companies.router)
    app.include_router(questions.router)
    app.include_router(chats.router)

    @app.get("/health")
    async def health(db: AsyncIOMotorDatabase = Depends(get_database)):
        # Simple check that we can talk to Mongo
        await db.command("ping")
        return {"status": "ok"}

    return app


app = create_app()


