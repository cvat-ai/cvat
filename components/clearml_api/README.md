# ClearML API for CVAT

This component provides a REST API to interact with ClearML from CVAT. It exposes several endpoints to query and manage ClearML projects, tasks, and models.

## Features

- Query ClearML projects and tasks
- Get detailed information about specific tasks
- Search for models
- Create new tasks
- Health check endpoint
- CORS support for frontend integration

## API Endpoints

### Core Endpoints

- `GET /` - Root endpoint that returns a welcome message
- `GET /health` - Health check endpoint to verify API is running and can connect to ClearML

### Projects and Tasks

- `GET /projects` - Get all projects from ClearML
- `GET /projects/{project_name}/tasks` - Get tasks for a specific project, optionally filtered by status
- `GET /projects/{project_name}/tasks/{task_id}` - Get detailed information about a specific task
- `POST /projects/{project_name}/tasks/create` - Create a new task in ClearML

### Models

- `GET /models` - Get all models from ClearML

## Configuration

The service uses hardcoded ClearML configuration to ensure reliable connectivity with the ClearML server. The credentials and connection parameters are directly embedded in the code.

### Configuration Parameters

The ClearML server connection is configured with the following parameters:

- API Host: `http://192.168.0.220:8008`
- Web Host: `http://192.168.0.220:8080`
- Files Host: `http://192.168.0.220:8081`
- API Key and Secret: Hardcoded in the application

### Additional Application Settings

You can customize the following application settings through environment variables or the `.env` file:

- `APP_NAME` - API name (default: "ClearML API")
- `API_VERSION` - API version (default: "v1")
- `DEBUG` - Debug mode (default: false)

## Running the Service

### Using Docker Compose

The service is defined in the docker-compose.yml file and is built from the Dockerfile in this directory. It exposes port 8500 by default.

```bash
docker-compose up clearml_api
```

### Standalone

For development or testing, you can run the API standalone:

```bash
# Install dependencies
pip install -r requirements.txt

# Run the API
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

## Development

### Running Tests

```bash
pytest
```

### API Documentation

When the API is running, you can access the auto-generated Swagger documentation at:

- http://localhost:8500/docs (when running with docker-compose)
- http://localhost:8000/docs (when running standalone)

## Future Integration with CVAT

In the future, this API will be integrated with CVAT-UI to provide ClearML functionality directly within the CVAT interface:

- Training models based on CVAT annotations
- Importing ClearML models into CVAT for inference
- Tracking model performance
- Automated annotation using ClearML models
