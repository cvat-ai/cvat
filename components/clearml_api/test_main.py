import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock

from main import app


@pytest.fixture
def client():
    return TestClient(app)


def test_root_endpoint(client):
    response = client.get("/")
    assert response.status_code == 200
    assert "message" in response.json()
    assert response.json()["message"] == "Welcome to the ClearML API"


@patch("main.Task")
def test_get_projects(mock_task, client):
    # Create mock projects
    mock_project1 = MagicMock()
    mock_project1.id = "project1"
    mock_project1.name = "Project 1"
    mock_project1.basename = "project1"
    mock_project1.description = "Test project 1"
    mock_project1.user = "user1"
    mock_project1.company = "company1"
    mock_project1.created.isoformat.return_value = "2025-05-01T12:00:00"
    mock_project1.tags = ["tag1", "tag2"]
    mock_project1.system_tags = ["system_tag1"]
    mock_project1.last_update.isoformat.return_value = "2025-05-15T14:30:00"

    # Set up the mock to return our test projects
    mock_task.get_projects.return_value = [mock_project1]

    # Make the request
    response = client.get("/projects")

    # Check the response
    assert response.status_code == 200
    data = response.json()
    assert "projects" in data
    assert len(data["projects"]) == 1
    assert data["projects"][0]["id"] == "project1"
    assert data["projects"][0]["name"] == "Project 1"


@patch("main.Task")
def test_get_project_tasks(mock_task, client):
    # Create mock task
    mock_task1 = MagicMock()
    mock_task1.id = "task1"
    mock_task1.name = "Task 1"
    mock_task1.task_type = "training"
    mock_task1.status = "completed"
    mock_task1.project = "project1"
    mock_task1.created.isoformat.return_value = "2025-05-01T12:00:00"

    # Set up the mock to return our test tasks
    mock_task.get_tasks.return_value = [mock_task1]

    # Make the request
    response = client.get("/projects/project1/tasks")

    # Check the response
    assert response.status_code == 200
    data = response.json()
    assert "tasks" in data
    assert len(data["tasks"]) == 1
    assert data["tasks"][0]["id"] == "task1"
    assert data["tasks"][0]["name"] == "Task 1"


@patch("main.Task")
def test_health_check(mock_task, client):
    # Mock the get_projects function to return an empty list
    mock_task.get_projects.return_value = []

    # Make the request
    response = client.get("/health")

    # Check the response
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "ClearML API is running" in data["message"]
    assert data["projects_count"] == 0
