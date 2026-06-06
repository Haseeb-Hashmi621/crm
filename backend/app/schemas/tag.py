from pydantic import BaseModel
from typing import Optional
from uuid import UUID


class TagCreate(BaseModel):
    name: str


class TagResponse(BaseModel):
    id: UUID
    name: str

    class Config:
        from_attributes = True