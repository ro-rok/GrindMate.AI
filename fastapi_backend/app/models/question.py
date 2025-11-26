from typing import Optional
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


class QuestionWithSolved(QuestionPublic):
    solved: bool = False


