from typing import Optional
from .common import MongoModel


class CompanyPublic(MongoModel):
    name: str
    slug: Optional[str] = None
    legacy_id: Optional[int] = None


