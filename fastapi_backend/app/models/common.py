from datetime import datetime
from typing import Optional, Any
from bson import ObjectId
from pydantic import BaseModel, ConfigDict, EmailStr, field_serializer
from pydantic_core import core_schema


class PyObjectId(ObjectId):
    @classmethod
    def __get_pydantic_core_schema__(
        cls, source_type: Any, handler: Any
    ) -> core_schema.CoreSchema:
        return core_schema.no_info_plain_validator_function(cls.validate)

    @classmethod
    def validate(cls, v: Any) -> ObjectId:
        if isinstance(v, ObjectId):
            return v
        if isinstance(v, str):
            try:
                return ObjectId(v)
            except Exception:
                raise ValueError(f"Invalid ObjectId: {v}")
        raise ValueError(f"Cannot convert {type(v)} to ObjectId")


class MongoModel(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True)

    id: Optional[PyObjectId] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    @field_serializer("id")
    def serialize_id(self, v: Optional[PyObjectId]) -> Optional[str]:
        return str(v) if v is not None else None


