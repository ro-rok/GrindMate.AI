from typing import Optional, List
from bson import ObjectId
from pydantic import field_serializer
from .common import MongoModel, PyObjectId


class QuestionPublic(MongoModel):
    title: str
    link: str
    difficulty: str
    frequency: int
    acceptance_rate: float
    timeframe: Optional[str] = None
    topics: Optional[str] = None
    company_id: Optional[PyObjectId] = None
    patterns: List[str] = []
    removed: bool = False

    @field_serializer("company_id")
    def serialize_company_id(self, v: Optional[PyObjectId]) -> Optional[str]:
        if v is None:
            return None
        if isinstance(v, ObjectId):
            return str(v)
        if isinstance(v, str):
            return v
        return str(v)


class QuestionWithSolved(QuestionPublic):
    solved: bool = False
    priority_score: Optional[float] = None


