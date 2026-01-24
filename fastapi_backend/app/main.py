from typing import List, Optional
from contextlib import asynccontextmanager

from bson import ObjectId
from fastapi import Depends, FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorDatabase

from .config import get_settings
from .db import get_database
from .models.company import CompanyPublic
from .models.question import QuestionWithSolved
from .routers import auth, companies, ping, questions, questions_standalone, questions_smart_random, users, chats, patterns, tutor, tutor_v2, admin
from .routers.admin_errors import register_admin_error_handlers
from .init_db import create_indexes
from .middleware import CSRFMiddleware, RateLimitMiddleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager.
    Handles startup and shutdown events.
    """
    # Startup: Create MongoDB indexes
    db = get_database()
    await create_indexes(db)
    
    yield
    
    # Shutdown: cleanup if needed
    pass


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="LeetCode Tracker FastAPI Backend",
        lifespan=lifespan
    )

    # CORS - parse frontend_origins from comma-separated string
    origins = settings.frontend_origins_list
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # Rate Limit Middleware (before CSRF for early rejection)
    app.add_middleware(RateLimitMiddleware)
    
    # CSRF Protection Middleware
    app.add_middleware(CSRFMiddleware)
    
    # Register error handlers for admin routes
    register_admin_error_handlers(app)

    # Routers
    app.include_router(ping.router)
    app.include_router(auth.router)
    app.include_router(users.router)
    app.include_router(companies.router)
    app.include_router(questions.router)
    app.include_router(questions_standalone.router)  # Standalone /questions/{id}/solve routes
    app.include_router(questions_smart_random.router)  # Smart random question selection
    app.include_router(chats.router)
    app.include_router(patterns.router)
    app.include_router(tutor.router)
    app.include_router(tutor_v2.router)  # Enhanced tutor endpoints
    app.include_router(admin.router)  # Admin routes

    @app.get("/health")
    async def health(db: AsyncIOMotorDatabase = Depends(get_database)):
        # Simple check that we can talk to Mongo
        await db.command("ping")
        return {"status": "ok"}

    @app.get("/companies.json", response_model=List[CompanyPublic])
    async def list_companies_json(db: AsyncIOMotorDatabase = Depends(get_database)):
        """Alias for /companies with .json extension for frontend compatibility"""
        cursor = db["companies"].find({}, sort=[("name", 1)])
        results: list[CompanyPublic] = []
        async for doc in cursor:
            doc["id"] = str(doc["_id"])
            results.append(CompanyPublic(**doc))
        return results

    @app.get("/companies/{company_id}/questions.json", response_model=List[QuestionWithSolved])
    async def list_questions_json(
        company_id: str,
        timeframe: Optional[str] = Query(default=None),
        difficulty: Optional[str] = Query(default=None),
        topics: Optional[str] = Query(default=None),
        user_id: Optional[str] = Query(default=None),
        db: AsyncIOMotorDatabase = Depends(get_database),
    ):
        """Alias for /companies/{company_id}/questions with .json extension for frontend compatibility"""
        from bson import ObjectId
        
        # Helper function to get solved question IDs
        async def get_solved_ids(user_id: Optional[str]) -> set:
            if not user_id:
                return set()
            try:
                user_obj_id = ObjectId(user_id)
            except Exception:
                return set()
            cursor = db["user_questions"].find(
                {"user_id": user_obj_id, "solved": True}, {"question_id": 1}
            )
            return {doc["question_id"] async for doc in cursor}
        
        # Helper function to build topic filters
        def build_topic_filters(topics_param: str) -> list[dict]:
            filters: list[dict] = []
            for topic in topics_param.split(","):
                topic = topic.strip()
                if not topic:
                    continue
                filters.append({"topics": {"$regex": topic, "$options": "i"}})
            return filters
        
        company_obj_id = ObjectId(company_id)
        query: dict = {"company_id": company_obj_id}
        if timeframe:
            query["timeframe"] = timeframe

        if difficulty:
            query["difficulty"] = difficulty.upper()

        if topics:
            topic_filters = build_topic_filters(topics)
            if topic_filters:
                query["$or"] = topic_filters

        solved_ids = await get_solved_ids(user_id)

        cursor = db["questions"].find(
            query,
            sort=[("frequency", 1), ("updated_at", 1)],
        )
        results: list[QuestionWithSolved] = []
        async for doc in cursor:
            # Check if solved before converting ObjectIds
            is_solved = doc["_id"] in solved_ids
            # Convert all ObjectId fields to strings for serialization
            # Create a new dict to avoid modifying the original
            clean_doc = {}
            for key, value in doc.items():
                if key == "_id":
                    clean_doc["id"] = str(value)
                elif isinstance(value, ObjectId):
                    clean_doc[key] = str(value)
                else:
                    clean_doc[key] = value
            q = QuestionWithSolved(**clean_doc, solved=is_solved)
            results.append(q)
        return results

    return app


app = create_app()


