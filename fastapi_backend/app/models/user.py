from typing import Optional
from pydantic import BaseModel, EmailStr
from .common import MongoModel, PyObjectId


class UserInCreate(BaseModel):
    email: EmailStr
    password: str


class UserInLogin(BaseModel):
    email: EmailStr
    password: str


class UserPublic(MongoModel):
    email: EmailStr
    legacy_id: Optional[int] = None


class UserInDB(MongoModel):
    email: EmailStr
    encrypted_password: str
    legacy_id: Optional[int] = None


