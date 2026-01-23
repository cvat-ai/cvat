from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any, Union
from datetime import datetime


class ModelInfo(BaseModel):
    id: str
    name: str
    framework: Optional[str] = None
    uri: Optional[str] = None
    created: Optional[str] = None


class TaskBase(BaseModel):
    id: str
    name: str
    type: str
    status: Optional[str] = None
    project: Optional[str] = None
    created: Optional[str] = None
    started: Optional[str] = None
    last_updated: Optional[str] = None
    comment: Optional[str] = None
    active_duration: Optional[int] = None
    input_models: Optional[Dict[str, Union[str, ModelInfo]]] = None
    output_models: Optional[Dict[str, Union[str, ModelInfo]]] = None
    tags: Optional[List[str]] = None
    system_tags: Optional[List[str]] = None


class TasksResponse(BaseModel):
    tasks: List[TaskBase]


class TaskDetailResponse(BaseModel):
    task: TaskBase
    parameters: Optional[Dict[str, Any]] = None
    configuration: Optional[Dict[str, Any]] = None
    artifacts: Optional[List[Dict[str, Any]]] = None


class ModelBase(BaseModel):
    id: str
    name: str
    project: Optional[str] = None
    task: Optional[str] = None
    framework: Optional[str] = None
    tags: Optional[List[str]] = None
    created: Optional[str] = None
    last_update: Optional[str] = None


class ModelsResponse(BaseModel):
    models: List[ModelBase]


class HealthResponse(BaseModel):
    status: str
    message: str
    projects_count: int


class CreateTaskRequest(BaseModel):
    task_name: str = Field(..., description="Name of the task to create")
    task_type: str = Field("training", description="Type of the task (training, testing, inference, etc)")


class CreateTaskResponse(BaseModel):
    id: str
    name: str
    project: str
    type: str
    created: str


class ArtifactBase(BaseModel):
    name: str
    type: str
    mode: str
    uri: str
    hash: Optional[str] = None
    size: Optional[int] = None
    timestamp: Optional[str] = None
    preview: Optional[str] = None
    content_type: Optional[str] = None
    model_id: Optional[str] = None
    framework: Optional[str] = None
    tags: Optional[List[str]] = None


class ArtifactsResponse(BaseModel):
    artifacts: List[ArtifactBase]


class ProjectBase(BaseModel):
    id: str
    name: str
    basename: str
    description: Optional[str] = None
    user: Optional[str] = None
    company: Optional[str] = None
    created: Optional[str] = None
    tags: Optional[List[str]] = None
    system_tags: Optional[List[str]] = None
    last_update: Optional[str] = None


class ProjectsResponse(BaseModel):
    projects: List[ProjectBase]
