import os
import clearml
from fastapi import FastAPI, HTTPException, Depends, Query, Body
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, List, Dict, Any
from clearml import Task
from models import (
    ProjectsResponse, TasksResponse, TaskDetailResponse, ModelsResponse,
    HealthResponse, CreateTaskRequest, CreateTaskResponse, ArtifactsResponse,
    DatasetsResponse, DatasetDetailResponse
)
from config import settings

# ClearML credentials from environment variables
print("Configuring ClearML with environment credentials")
try:
    # Set ClearML credentials from environment variables
    api_host = os.getenv("CLEARML_API_HOST")
    web_host = os.getenv("CLEARML_WEB_HOST")
    files_host = os.getenv("CLEARML_FILES_HOST")
    api_key = os.getenv("CLEARML_API_KEY")
    api_secret = os.getenv("CLEARML_API_SECRET")

    if not all([api_host, web_host, files_host, api_key, api_secret]):
        raise ValueError("Missing ClearML environment variables. Please set CLEARML_API_HOST, CLEARML_WEB_HOST, CLEARML_FILES_HOST, CLEARML_API_KEY, and CLEARML_API_SECRET")

    Task.set_credentials(
        api_host=api_host,
        web_host=web_host,
        files_host=files_host,
        key=api_key,
        secret=api_secret
    )
    print("ClearML credentials configured successfully")
except Exception as e:
    print(f"Error configuring ClearML: {e}")
    # Don't fail startup, but log the error
    import traceback
    traceback.print_exc()

# Initialize FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    description="API to interact with ClearML SDK",
    version=settings.API_VERSION,
    debug=settings.DEBUG
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=settings.CORS_METHODS,
    allow_headers=settings.CORS_HEADERS,
)


@app.get("/")
async def root():
    """Root endpoint that returns a welcome message."""
    return {"message": "Welcome to the ClearML API"}


@app.get("/projects", response_model=ProjectsResponse)
async def get_all_projects():
    """
    Get all projects from ClearML.

    Returns:
        List of projects with their IDs and names
    """
    try:
        # Ensure credentials are properly configured
        Task.set_credentials(
            api_host="http://192.168.0.220:8008",
            web_host="http://192.168.0.220:8080",
            files_host="http://192.168.0.220:8081",
            key="DFDQOY53OMXJUU2VV0G9",
            secret="EoXFbXkqjqcBQSFp85In1K4tWafmiPFUFnP4dvVLj9Qp1moaF3"
        )

        # Get all projects from ClearML - using Task.get_projects()
        projects = Task.get_projects()

        # Format projects data for response
        projects_data = []
        for project in projects:
            projects_data.append({
                "id": project.id,
                "name": project.name,
                "basename": project.basename,
                "description": project.description,
                "user": project.user,
                "company": project.company,
                "created": project.created.isoformat() if hasattr(project.created, 'isoformat') else str(project.created),
                "tags": project.tags,
                "system_tags": project.system_tags,
                "last_update": project.last_update.isoformat() if hasattr(project.last_update, 'isoformat') else str(project.last_update),
            })

        return {"projects": projects_data}
    except Exception as e:
        import traceback
        traceback.print_exc()
        error_message = f"Failed to get projects: {str(e)}"
        print(f"ERROR: {error_message}")
        raise HTTPException(status_code=500, detail=error_message)


@app.get("/projects/{project_name}/tasks", response_model=TasksResponse)
async def get_project_tasks(project_name: str, status: Optional[str] = Query(None, description="Filter tasks by status")):
    """
    Get tasks for a specific project, optionally filtered by status.

    Args:
        project_name: The name of the project
        status: Optional task status to filter by (e.g., 'completed', 'in_progress', 'failed')

    Returns:
        List of tasks with their details
    """
    try:
        # Get tasks for the project, optionally filtered by status
        task_filter = {}
        if status:
            task_filter["status"] = [status]
        # Only retrieves last 500 tasks!
        tasks = Task.get_tasks(project_name=project_name, task_filter=task_filter)
        # Format tasks data for response with more comprehensive information
        tasks_data = []
        for task in tasks:
            task_data = {
                "id": task.id,
                "name": task.name,
                "type": task.task_type,
                "status": task.status,
                "project": task.project,
            }
            # Handle date fields safely with hasattr checks and type checking
            if hasattr(task, 'created') and task.created and not callable(task.created):
                task_data["created"] = task.created.isoformat() if hasattr(task.created, 'isoformat') else str(task.created)

            if hasattr(task, 'started') and task.started and not callable(task.started):
                task_data["started"] = task.started.isoformat() if hasattr(task.started, 'isoformat') else str(task.started)

            if hasattr(task, 'last_updated') and task.last_updated and not callable(task.last_updated):
                task_data["last_updated"] = task.last_updated.isoformat() if hasattr(task.last_updated, 'isoformat') else str(task.last_updated)

            # Add optional fields if they exist
            if hasattr(task, 'comment'):
                task_data["comment"] = task.comment

            if hasattr(task, 'active_duration'):
                task_data["active_duration"] = task.active_duration

            # Add input/output models if they exist
            if hasattr(task, 'input_models_id') and task.input_models_id:
                task_data["input_models"] = task.input_models_id

            if hasattr(task, 'output_models_id') and task.output_models_id:
                task_data["output_models"] = task.output_models_id

            # Add tags if available
            if hasattr(task, 'tags') and task.tags:
                task_data["tags"] = task.tags

            if hasattr(task, 'system_tags') and task.system_tags:
                task_data["system_tags"] = task.system_tags

            tasks_data.append(task_data)

        return {"tasks": tasks_data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get tasks: {str(e)}")


@app.get("/projects/{project_name}/tasks/{task_id}", response_model=TaskDetailResponse)
async def get_task_details(project_name: str, task_id: str):
    """
    Get detailed information about a specific task.

    Args:
        project_name: The name of the project
        task_id: The ID of the task

    Returns:
        Detailed information about the task
    """
    try:
        # Get the task by ID
        task = Task.get_task(task_id=task_id)

        if not task:
            raise HTTPException(status_code=404, detail=f"Task {task_id} not found")

        # Note: Project validation is disabled to allow cross-project access
        # This can be enabled if stricter project isolation is needed
        # if task.project != project_name:
        #     raise HTTPException(status_code=400, detail=f"Task {task_id} does not belong to project {project_name}")

        # Get detailed information about the task
        task_data = {
            "id": task.id,
            "name": task.name,
            "type": task.task_type,
            "status": task.status,
            "project": task.project,
        }

        # Add timestamps - access task data properly
        # Try to get task data from the task's data structure
        try:
            # Get task data directly - ClearML tasks have a data attribute with the actual info
            task_info = task.data if hasattr(task, 'data') else None

            # Try to access timestamps from task.data or fallback to direct access
            if task_info:
                if hasattr(task_info, 'created') and task_info.created:
                    task_data["created"] = task_info.created.isoformat() if hasattr(task_info.created, 'isoformat') else str(task_info.created)

                if hasattr(task_info, 'started') and task_info.started:
                    task_data["started"] = task_info.started.isoformat() if hasattr(task_info.started, 'isoformat') else str(task_info.started)

                if hasattr(task_info, 'completed') and task_info.completed:
                    task_data["completed"] = task_info.completed.isoformat() if hasattr(task_info.completed, 'isoformat') else str(task_info.completed)

                if hasattr(task_info, 'last_update') and task_info.last_update:
                    task_data["last_update"] = task_info.last_update.isoformat() if hasattr(task_info.last_update, 'isoformat') else str(task_info.last_update)
            else:
                # Fallback to direct task access with safer handling
                if hasattr(task, 'created') and task.created and not callable(task.created):
                    task_data["created"] = task.created.isoformat() if hasattr(task.created, 'isoformat') else str(task.created)

                # For started, try various approaches
                started_val = None
                if hasattr(task, 'get_runtime_properties'):
                    try:
                        runtime = task.get_runtime_properties()
                        if 'started' in runtime:
                            started_val = runtime['started']
                    except:
                        pass

                if not started_val and hasattr(task, 'data') and hasattr(task.data, 'started'):
                    started_val = task.data.started

                if started_val and started_val != 0:
                    from datetime import datetime
                    if isinstance(started_val, (int, float)):
                        started_val = datetime.fromtimestamp(started_val)
                    task_data["started"] = started_val.isoformat() if hasattr(started_val, 'isoformat') else str(started_val)

                if hasattr(task, 'completed') and task.completed and not callable(task.completed):
                    task_data["completed"] = task.completed.isoformat() if hasattr(task.completed, 'isoformat') else str(task.completed)

                if hasattr(task, 'last_update') and task.last_update and not callable(task.last_update):
                    task_data["last_update"] = task.last_update.isoformat() if hasattr(task.last_update, 'isoformat') else str(task.last_update)
        except Exception as time_error:
            print(f"Warning: Could not extract timestamps for task {task_id}: {time_error}")

        # Get input and output models properly using multiple approaches
        input_models = {}
        output_models = {}

        print(f"Searching for models associated with task {task_id}")

        # Method 1: Get models directly from the task using get_models()
        try:
            from .models import ModelInfo
            current_task_models = task.get_models()
            print(f"Task.get_models() returned: {current_task_models}")

            if current_task_models and current_task_models.get('output'):
                print("Found output models in current task:")
                for model in current_task_models['output']:
                    try:
                        model_name = getattr(model, '_name', getattr(model, 'name', str(model)))
                        model_info = ModelInfo(
                            id=model.id,
                            name=model_name,
                            framework=getattr(model, 'framework', None),
                            uri=getattr(model, 'url', getattr(model, 'uri', None)),
                            created=str(getattr(model, 'created', '')) if getattr(model, 'created', None) else None,
                        )
                        output_models[model_name] = model_info
                        print(f"  Added output model: {model_name} (ID: {model.id})")
                    except Exception as model_parse_error:
                        print(f"  Error parsing output model: {model_parse_error}")

            if current_task_models and current_task_models.get('input'):
                print("Found input models in current task:")
                for model in current_task_models['input']:
                    try:
                        model_name = getattr(model, '_name', getattr(model, 'name', str(model)))
                        model_info = ModelInfo(
                            id=model.id,
                            name=model_name,
                            framework=getattr(model, 'framework', None),
                            uri=getattr(model, 'url', getattr(model, 'uri', None)),
                            created=str(getattr(model, 'created', '')) if getattr(model, 'created', None) else None,
                        )
                        input_models[model_name] = model_info
                        print(f"  Added input model: {model_name} (ID: {model.id})")
                    except Exception as model_parse_error:
                        print(f"  Error parsing input model: {model_parse_error}")
        except Exception as get_models_error:
            print(f"Warning: Could not get models using task.get_models() for task {task_id}: {get_models_error}")

        # Method 2: Get models by ID from the task output models dict
        try:
            from .models import ModelInfo
            from clearml import Model

            if hasattr(task, 'output_models_id') and task.output_models_id:
                print(f"Found output_models_id: {task.output_models_id}")
                for model_name, model_id in task.output_models_id.items():
                    try:
                        model = Model(model_id=model_id)
                        model_info = ModelInfo(
                            id=model.id,
                            name=getattr(model, '_name', model_name),
                            framework=getattr(model, 'framework', None),
                            uri=getattr(model, 'url', getattr(model, 'uri', None)),
                            created=str(getattr(model, 'created', '')) if getattr(model, 'created', None) else None,
                        )
                        output_models[model_name] = model_info
                        print(f"  Added output model from ID: {model_name} (ID: {model_id})")
                    except Exception as single_model_error:
                        print(f"  Error getting output model {model_name} (ID: {model_id}): {single_model_error}")

            if hasattr(task, 'input_models_id') and task.input_models_id:
                print(f"Found input_models_id: {task.input_models_id}")
                for model_name, model_id in task.input_models_id.items():
                    try:
                        model = Model(model_id=model_id)
                        model_info = ModelInfo(
                            id=model.id,
                            name=getattr(model, '_name', model_name),
                            framework=getattr(model, 'framework', None),
                            uri=getattr(model, 'url', getattr(model, 'uri', None)),
                            created=str(getattr(model, 'created', '')) if getattr(model, 'created', None) else None,
                        )
                        input_models[model_name] = model_info
                        print(f"  Added input model from ID: {model_name} (ID: {model_id})")
                    except Exception as single_model_error:
                        print(f"  Error getting input model {model_name} (ID: {model_id}): {single_model_error}")
        except Exception as models_id_error:
            print(f"Warning: Could not get models using models_id attributes for task {task_id}: {models_id_error}")

        # Method 3: Query models by task ID using Model.query_models
        try:
            from clearml import Model
            from .models import ModelInfo
            models = Model.query_models(task_ids=[task_id])
            print(f"Model.query_models found {len(models) if models else 0} models")

            if models:
                for model in models:
                    model_name = getattr(model, '_name', getattr(model, 'name', str(model)))
                    model_info = ModelInfo(
                        id=model.id,
                        name=model_name,
                        framework=getattr(model, 'framework', None),
                        uri=getattr(model, 'url', getattr(model, 'uri', None)),
                        created=str(getattr(model, 'created', '')) if getattr(model, 'created', None) else None,
                    )
                    # Add to output models if not already present
                    if model_name not in output_models:
                        output_models[model_name] = model_info
                        print(f"  Added model from query: {model_name} (ID: {model.id})")
        except Exception as query_error:
            print(f"Warning: Could not query models for task {task_id}: {query_error}")

        # Method 4: Try to get models from artifacts that are model types
        try:
            from .models import ModelInfo
            if hasattr(task, 'artifacts') and task.artifacts:
                print(f"Checking artifacts for models: {list(task.artifacts.keys())}")
                for artifact_name, artifact in task.artifacts.items():
                    artifact_type = getattr(artifact, 'type', '')
                    if 'model' in artifact_type.lower():
                        model_info = ModelInfo(
                            id=artifact_name,
                            name=artifact_name,
                            framework=getattr(artifact, 'framework', None),
                            uri=getattr(artifact, 'uri', None),
                        )
                        if artifact_name not in output_models:
                            output_models[artifact_name] = model_info
                            print(f"  Added model from artifact: {artifact_name}")
        except Exception as artifact_models_error:
            print(f"Warning: Could not fetch models from artifacts for task {task_id}: {artifact_models_error}")

        # Log summary of found models
        print(f"Total models found - Input: {len(input_models)}, Output: {len(output_models)}")
        if output_models:
            print(f"Output models: {list(output_models.keys())}")
        if input_models:
            print(f"Input models: {list(input_models.keys())}")

        # Add models to task data if found
        if input_models:
            task_data["input_models"] = input_models
        if output_models:
            task_data["output_models"] = output_models

        # Add task parameters and configuration
        parameters = {}
        try:
            if hasattr(task, 'get_parameters') and callable(task.get_parameters):
                parameters = task.get_parameters()
        except Exception as param_error:
            print(f"Warning: Could not fetch parameters for task {task_id}: {param_error}")

        # Add task artifacts if available
        artifacts_data = []
        try:
            if hasattr(task, 'artifacts') and task.artifacts:
                for artifact_name, artifact in task.artifacts.items():
                    artifacts_data.append({
                        "name": artifact_name,
                        "type": getattr(artifact, 'type', 'unknown'),
                        "mode": getattr(artifact, 'mode', 'unknown'),
                        "uri": getattr(artifact, 'uri', ''),
                    })
        except Exception as artifact_error:
            print(f"Warning: Could not fetch artifacts for task {task_id}: {artifact_error}")

        # Add additional optional fields
        if hasattr(task, 'comment') and task.comment:
            task_data["comment"] = task.comment

        if hasattr(task, 'tags') and task.tags:
            task_data["tags"] = task.tags

        if hasattr(task, 'system_tags') and task.system_tags:
            task_data["system_tags"] = task.system_tags

        response_data = {"task": task_data}

        if parameters:
            response_data["parameters"] = parameters
        if artifacts_data:
            response_data["artifacts"] = artifacts_data

        return response_data
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to get task details: {str(e)}")


@app.get("/models", response_model=ModelsResponse)
async def get_all_models():
    """
    Get all models from ClearML.

    Returns:
        List of models with their IDs and metadata
    """
    try:
        from clearml import Model

        # Get all models from ClearML
        models = Model.query_models()

        # Format models data for response
        models_data = []
        for model in models:
            model_data = {
                "id": model.id,
                "name": model.name,
                "project": model.project,
                "task": model.task,
                "framework": model.framework,
                "tags": model.tags,
            }

            if hasattr(model, 'created') and model.created:
                model_data["created"] = model.created.isoformat() if hasattr(model.created, 'isoformat') else str(model.created)

            if hasattr(model, 'last_update') and model.last_update:
                model_data["last_update"] = model.last_update.isoformat() if hasattr(model.last_update, 'isoformat') else str(model.last_update)

            models_data.append(model_data)

        return {"models": models_data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get models: {str(e)}")


@app.post("/projects/{project_name}/tasks/create", response_model=CreateTaskResponse)
async def create_task(
    project_name: str,
    task_request: CreateTaskRequest = Body(...)
):
    """
    Create a new task in ClearML.

    Args:
        project_name: The name of the project
        task_request: The details of the task to create

    Returns:
        Information about the created task
    """
    try:
        # Create a new task using the data from the request
        task = Task.create(
            project_name=project_name,
            task_name=task_request.task_name,
            task_type=task_request.task_type
        )

        # Return information about the created task
        return {
            "id": task.id,
            "name": task.name,
            "project": task.project,
            "type": task.task_type,
            "created": task.created.isoformat() if hasattr(task.created, 'isoformat') else str(task.created)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create task: {str(e)}")


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """
    Health check endpoint to verify the API is running and can connect to ClearML.

    Returns:
        Status of the API and connection to ClearML
    """
    try:
        # Make sure credentials are configured before checking health
        Task.set_credentials(
            api_host="http://192.168.0.220:8008",
            web_host="http://192.168.0.220:8080",
            files_host="http://192.168.0.220:8081",
            key="DFDQOY53OMXJUU2VV0G9",
            secret="EoXFbXkqjqcBQSFp85In1K4tWafmiPFUFnP4dvVLj9Qp1moaF3"
        )

        print(f"Attempting to connect to ClearML server")

        # Try to get the list of projects to verify connection to ClearML
        projects = Task.get_projects()
        return {
            "status": "ok",
            "message": "ClearML API is running and connected to ClearML server",
            "projects_count": len(projects)
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=503, detail=f"Failed to connect to ClearML server: {str(e)}")


@app.get("/projects/{project_name}/tasks/{task_id}/artifacts", response_model=ArtifactsResponse)
async def get_task_artifacts(project_name: str, task_id: str):
    """
    Get artifacts (models, outputs) for a specific task.

    Args:
        project_name: The name of the project
        task_id: The ID of the task

    Returns:
        List of artifacts associated with the task
    """
    try:
        # Get the task by ID
        task = Task.get_task(task_id=task_id)

        if not task:
            raise HTTPException(status_code=404, detail=f"Task {task_id} not found")

        # Note: Project validation is disabled to allow cross-project access
        # This can be enabled if stricter project isolation is needed
        # if task.project != project_name:
        #     raise HTTPException(status_code=400, detail=f"Task {task_id} does not belong to project {project_name}")

        artifacts_data = []

        # Get artifacts from the task
        if hasattr(task, 'artifacts') and task.artifacts:
            for artifact_name, artifact in task.artifacts.items():
                artifact_info = {
                    "name": artifact_name,
                    "type": getattr(artifact, 'type', 'unknown'),
                    "mode": getattr(artifact, 'mode', 'unknown'),
                    "uri": getattr(artifact, 'uri', ''),
                    "hash": getattr(artifact, 'hash', ''),
                    "size": getattr(artifact, 'size', 0),
                    "timestamp": getattr(artifact, 'timestamp', ''),
                    "preview": getattr(artifact, 'preview', ''),
                    "content_type": getattr(artifact, 'content_type', ''),
                }
                artifacts_data.append(artifact_info)

        # Also try to get models as artifacts
        try:
            from clearml import Model
            # Get models associated with this task
            models = Model.query_models(task_ids=[task_id])
            for model in models:
                model_info = {
                    "name": model.name,
                    "type": "model",
                    "mode": "output",
                    "uri": getattr(model, 'uri', ''),
                    "hash": getattr(model, 'hash', ''),
                    "size": getattr(model, 'size', 0),
                    "timestamp": model.created.isoformat() if hasattr(model, 'created') and model.created else '',
                    "preview": f"Model: {model.framework if hasattr(model, 'framework') else 'Unknown framework'}",
                    "content_type": "model",
                    "model_id": model.id,
                    "framework": getattr(model, 'framework', 'unknown'),
                    "tags": getattr(model, 'tags', []),
                }
                artifacts_data.append(model_info)
        except Exception as model_error:
            print(f"Warning: Could not fetch models for task {task_id}: {model_error}")

        return {"artifacts": artifacts_data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get task artifacts: {str(e)}")


@app.get("/datasets", response_model=DatasetsResponse)
async def get_all_datasets():
    """
    Get all datasets from ClearML.

    Returns:
        List of datasets with their IDs and metadata
    """
    try:
        from clearml import Dataset

        # Get all datasets from ClearML
        datasets = Dataset.list_datasets()

        # Format datasets data for response
        datasets_data = []
        for dataset in datasets:
            # Handle both dict and object responses from Dataset.list_datasets()
            if isinstance(dataset, dict):
                dataset_data = {
                    "id": dataset.get('id'),
                    "name": dataset.get('name'),
                    "project": dataset.get('project'),
                    "parent": dataset.get('parent'),
                    "tags": dataset.get('tags', []),
                    "version": dataset.get('version'),
                    "description": dataset.get('description'),
                    "size": dataset.get('size'),
                    "files_count": dataset.get('files_count'),
                    "uri": dataset.get('url', dataset.get('uri')),
                }

                created = dataset.get('created')
                if created:
                    dataset_data["created"] = created.isoformat() if hasattr(created, 'isoformat') else str(created)
            else:
                # Handle Dataset object
                dataset_data = {
                    "id": dataset.id,
                    "name": dataset.name,
                    "project": getattr(dataset, 'project', None),
                    "parent": getattr(dataset, 'parent', None),
                    "tags": getattr(dataset, 'tags', []),
                    "version": getattr(dataset, 'version', None),
                    "description": getattr(dataset, 'description', None),
                    "size": getattr(dataset, 'size', None),
                    "files_count": getattr(dataset, 'files_count', None),
                    "uri": getattr(dataset, 'url', getattr(dataset, 'uri', None)),
                }

                if hasattr(dataset, 'created') and dataset.created:
                    dataset_data["created"] = dataset.created.isoformat() if hasattr(dataset.created, 'isoformat') else str(dataset.created)

            datasets_data.append(dataset_data)

        return {"datasets": datasets_data}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to get datasets: {str(e)}")


@app.get("/projects/{project_name}/datasets", response_model=DatasetsResponse)
async def get_project_datasets(project_name: str):
    """
    Get datasets for a specific project.

    Args:
        project_name: The name of the project

    Returns:
        List of datasets in the project
    """
    try:
        from clearml import Dataset

        # Get datasets for the specific project
        datasets = Dataset.list_datasets(project_name=project_name)

        # Format datasets data for response
        datasets_data = []
        for dataset in datasets:
            # Handle both dict and object responses from Dataset.list_datasets()
            if isinstance(dataset, dict):
                dataset_data = {
                    "id": dataset.get('id'),
                    "name": dataset.get('name'),
                    "project": dataset.get('project', project_name),
                    "parent": dataset.get('parent'),
                    "tags": dataset.get('tags', []),
                    "version": dataset.get('version'),
                    "description": dataset.get('description'),
                    "size": dataset.get('size'),
                    "files_count": dataset.get('files_count'),
                    "uri": dataset.get('url', dataset.get('uri')),
                }

                created = dataset.get('created')
                if created:
                    dataset_data["created"] = created.isoformat() if hasattr(created, 'isoformat') else str(created)
            else:
                # Handle Dataset object
                dataset_data = {
                    "id": dataset.id,
                    "name": dataset.name,
                    "project": getattr(dataset, 'project', project_name),
                    "parent": getattr(dataset, 'parent', None),
                    "tags": getattr(dataset, 'tags', []),
                    "version": getattr(dataset, 'version', None),
                    "description": getattr(dataset, 'description', None),
                    "size": getattr(dataset, 'size', None),
                    "files_count": getattr(dataset, 'files_count', None),
                    "uri": getattr(dataset, 'url', getattr(dataset, 'uri', None)),
                }

                if hasattr(dataset, 'created') and dataset.created:
                    dataset_data["created"] = dataset.created.isoformat() if hasattr(dataset.created, 'isoformat') else str(dataset.created)

            datasets_data.append(dataset_data)

        return {"datasets": datasets_data}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to get datasets for project {project_name}: {str(e)}")


@app.get("/datasets/{dataset_id}", response_model=DatasetDetailResponse)
async def get_dataset_details(dataset_id: str):
    """
    Get detailed information about a specific dataset including all versions.

    Args:
        dataset_id: The ID of the dataset

    Returns:
        Detailed information about the dataset and its versions
    """
    try:
        from clearml import Dataset

        # Get the dataset by ID
        dataset = Dataset.get(dataset_id=dataset_id)

        if not dataset:
            raise HTTPException(status_code=404, detail=f"Dataset {dataset_id} not found")

        # Get detailed information about the dataset
        dataset_data = {
            "id": dataset.id,
            "name": dataset.name,
            "project": getattr(dataset, 'project', None),
            "parent": getattr(dataset, 'parent', None),
            "tags": getattr(dataset, 'tags', []),
            "version": getattr(dataset, 'version', None),
            "description": getattr(dataset, 'description', None),
            "size": getattr(dataset, 'size', None),
            "files_count": getattr(dataset, 'files_count', None),
            "uri": getattr(dataset, 'url', getattr(dataset, 'uri', None)),
        }

        if hasattr(dataset, 'created') and dataset.created:
            dataset_data["created"] = dataset.created.isoformat() if hasattr(dataset.created, 'isoformat') else str(dataset.created)

        # Get all versions of this dataset
        versions_data = []
        try:
            # Get dataset versions/lineage
            dataset_name = dataset.name
            dataset_project = getattr(dataset, 'project', None)

            if dataset_project:
                all_versions = Dataset.list_datasets(
                    dataset_name=dataset_name,
                    project_name=dataset_project
                )
            else:
                all_versions = Dataset.list_datasets(dataset_name=dataset_name)

            for version_dataset in all_versions:
                # Handle both dict and object responses from Dataset.list_datasets()
                if isinstance(version_dataset, dict):
                    version_data = {
                        "id": version_dataset.get('id'),
                        "version": version_dataset.get('version', 'unknown'),
                        "description": version_dataset.get('description'),
                        "size": version_dataset.get('size'),
                        "files_count": version_dataset.get('files_count'),
                        "uri": version_dataset.get('url', version_dataset.get('uri')),
                    }

                    created = version_dataset.get('created')
                    if created:
                        version_data["created"] = created.isoformat() if hasattr(created, 'isoformat') else str(created)

                    # Try to get changeset information
                    changeset = version_dataset.get('changeset')
                    if changeset:
                        version_data["changeset"] = changeset
                else:
                    # Handle Dataset object
                    version_data = {
                        "id": version_dataset.id,
                        "version": getattr(version_dataset, 'version', 'unknown'),
                        "description": getattr(version_dataset, 'description', None),
                        "size": getattr(version_dataset, 'size', None),
                        "files_count": getattr(version_dataset, 'files_count', None),
                        "uri": getattr(version_dataset, 'url', getattr(version_dataset, 'uri', None)),
                    }

                    if hasattr(version_dataset, 'created') and version_dataset.created:
                        version_data["created"] = version_dataset.created.isoformat() if hasattr(version_dataset.created, 'isoformat') else str(version_dataset.created)

                    # Try to get changeset information
                    try:
                        changeset = getattr(version_dataset, 'changeset', None)
                        if changeset:
                            version_data["changeset"] = changeset
                    except:
                        pass

                versions_data.append(version_data)

        except Exception as versions_error:
            print(f"Warning: Could not fetch versions for dataset {dataset_id}: {versions_error}")

        # Get dataset metadata
        metadata = {}
        try:
            if hasattr(dataset, 'get_metadata') and callable(dataset.get_metadata):
                metadata = dataset.get_metadata()
        except Exception as metadata_error:
            print(f"Warning: Could not fetch metadata for dataset {dataset_id}: {metadata_error}")

        response_data = {"dataset": dataset_data}

        if versions_data:
            response_data["versions"] = versions_data
        if metadata:
            response_data["metadata"] = metadata

        return response_data
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to get dataset details: {str(e)}")


@app.get("/datasets/{dataset_id}/versions", response_model=List[Dict[str, Any]])
async def get_dataset_versions(dataset_id: str):
    """
    Get all versions of a specific dataset.

    Args:
        dataset_id: The ID of the dataset

    Returns:
        List of all versions for this dataset
    """
    try:
        from clearml import Dataset

        # Get the base dataset to get its name and project
        base_dataset = Dataset.get(dataset_id=dataset_id)

        if not base_dataset:
            raise HTTPException(status_code=404, detail=f"Dataset {dataset_id} not found")

        dataset_name = base_dataset.name
        dataset_project = getattr(base_dataset, 'project', None)

        # Get all versions of this dataset
        if dataset_project:
            all_versions = Dataset.list_datasets(
                dataset_name=dataset_name,
                project_name=dataset_project
            )
        else:
            all_versions = Dataset.list_datasets(dataset_name=dataset_name)

        versions_data = []
        for version_dataset in all_versions:
            # Handle both dict and object responses from Dataset.list_datasets()
            if isinstance(version_dataset, dict):
                version_data = {
                    "id": version_dataset.get('id'),
                    "version": version_dataset.get('version', 'unknown'),
                    "description": version_dataset.get('description'),
                    "size": version_dataset.get('size'),
                    "files_count": version_dataset.get('files_count'),
                    "uri": version_dataset.get('url', version_dataset.get('uri')),
                    "tags": version_dataset.get('tags', []),
                }

                created = version_dataset.get('created')
                if created:
                    version_data["created"] = created.isoformat() if hasattr(created, 'isoformat') else str(created)

                # Try to get changeset information
                changeset = version_dataset.get('changeset')
                if changeset:
                    version_data["changeset"] = changeset
            else:
                # Handle Dataset object
                version_data = {
                    "id": version_dataset.id,
                    "version": getattr(version_dataset, 'version', 'unknown'),
                    "description": getattr(version_dataset, 'description', None),
                    "size": getattr(version_dataset, 'size', None),
                    "files_count": getattr(version_dataset, 'files_count', None),
                    "uri": getattr(version_dataset, 'url', getattr(version_dataset, 'uri', None)),
                    "tags": getattr(version_dataset, 'tags', []),
                }

                if hasattr(version_dataset, 'created') and version_dataset.created:
                    version_data["created"] = version_dataset.created.isoformat() if hasattr(version_dataset.created, 'isoformat') else str(version_dataset.created)

                # Try to get changeset information
                try:
                    changeset = getattr(version_dataset, 'changeset', None)
                    if changeset:
                        version_data["changeset"] = changeset
                except:
                    pass

            versions_data.append(version_data)

        # Sort versions by creation date (newest first)
        versions_data.sort(key=lambda x: x.get('created', ''), reverse=True)

        return versions_data
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to get dataset versions: {str(e)}")


@app.get("/datasets/{dataset_id}/files")
async def get_dataset_files(dataset_id: str):
    """
    Get files list for a specific dataset version.

    Args:
        dataset_id: The ID of the dataset

    Returns:
        List of files in the dataset
    """
    try:
        from clearml import Dataset

        # Get the dataset by ID
        dataset = Dataset.get(dataset_id=dataset_id)

        if not dataset:
            raise HTTPException(status_code=404, detail=f"Dataset {dataset_id} not found")

        files_data = []
        try:
            # Get dataset files
            if hasattr(dataset, 'list_files') and callable(dataset.list_files):
                files = dataset.list_files()
                for file_path in files:
                    file_info = {
                        "path": file_path,
                        "name": file_path.split('/')[-1] if '/' in file_path else file_path,
                    }

                    # Try to get file size and other metadata
                    try:
                        file_meta = dataset.get_file_metadata(file_path)
                        if file_meta:
                            file_info.update(file_meta)
                    except:
                        pass

                    files_data.append(file_info)
            elif hasattr(dataset, 'get_local_copy') and callable(dataset.get_local_copy):
                # If direct file listing isn't available, try to get local copy info
                local_path = dataset.get_local_copy()
                files_data.append({
                    "path": local_path,
                    "name": "dataset_files",
                    "type": "local_copy"
                })
        except Exception as files_error:
            print(f"Warning: Could not fetch files for dataset {dataset_id}: {files_error}")

        return {"files": files_data}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to get dataset files: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
