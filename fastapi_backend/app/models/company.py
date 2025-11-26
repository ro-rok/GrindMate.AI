from typing import Optional
from .common import MongoModel


class CompanyPublic(MongoModel):
    name: str
    legacy_id: Optional[int] = None


