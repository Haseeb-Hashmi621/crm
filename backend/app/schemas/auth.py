from pydantic import BaseModel, EmailStr
from typing import Optional
from uuid import UUID


class UserSignup(BaseModel):
    email: EmailStr
    password: str
    full_name: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    email: Optional[str] = None


class UserResponse(BaseModel):
    id: UUID
    email: str
    full_name: str
    role: str   # 'admin' | 'employee'

    class Config:
        from_attributes = True