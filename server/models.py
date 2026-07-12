from pydantic import BaseModel, Field
from typing import Optional, List


class SoftwareSearchRequest(BaseModel):
    query: str
    platform: str = Field(default="auto", description="windows, macos, linux, or auto")


class SoftwareSearchResponse(BaseModel):
    software_name: str
    display_name: str
    versions: List[dict] = []
    platform: str


class GuideRequest(BaseModel):
    software_name: str
    version: str
    platform: str


class GuideResponse(BaseModel):
    id: int
    software_name: str
    display_name: str
    version: str
    platform: str
    markdown_content: str
    cached: bool = False


class FeedbackRequest(BaseModel):
    guide_id: Optional[int] = None
    software_name: str
    version: str
    platform: str
    is_helpful: Optional[bool] = None
    comment: Optional[str] = None


class AdminLoginRequest(BaseModel):
    password: str


class StatsResponse(BaseModel):
    total_guides: int
    total_feedback: int
    helpful_count: int
    unhelpful_count: int
    top_software: List[dict]
    selection_stats: List[dict]
