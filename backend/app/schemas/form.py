from pydantic import BaseModel
from typing import Any, Optional
from datetime import datetime


class FormFieldOption(BaseModel):
    label: str
    value: str


class FormField(BaseModel):
    id: str
    type: str  # text | email | phone | textarea | select | checkbox | number | date
    label: str
    placeholder: Optional[str] = ""
    required: bool = False
    options: Optional[list[FormFieldOption]] = []


class FormCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    fields: list[FormField]
    submit_button_text: Optional[str] = "Submit"
    success_message: Optional[str] = "Thank you! Your response has been submitted."


class FormUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    fields: Optional[list[FormField]] = None
    submit_button_text: Optional[str] = None
    success_message: Optional[str] = None
    is_active: Optional[bool] = None


class FormSubmissionCreate(BaseModel):
    data: dict[str, Any]


class FormSubmissionOut(BaseModel):
    id: int
    form_id: int
    data: dict[str, Any]
    submitter_ip: Optional[str]
    contact_created: bool
    contact_id: Optional[Any]
    created_at: datetime

    class Config:
        from_attributes = True


class FormOut(BaseModel):
    id: int
    user_id: Any
    name: str
    description: Optional[str]
    fields: list[dict]
    is_active: bool
    submit_button_text: str
    success_message: str
    created_at: datetime
    updated_at: datetime
    submission_count: Optional[int] = 0

    class Config:
        from_attributes = True