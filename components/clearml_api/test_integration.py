import pytest
import os
from httpx import AsyncClient
import asyncio
from main import app
from config import settings


# Skip these tests if no ClearML credentials are available
pytestmark = pytest.mark.skipif(
    not os.path.exists("clearml.conf") and not os.getenv("CLEARML_API_KEY"),
    reason="ClearML credentials are required for integration tests"
)


@pytest.fixture
async def async_client():
    async with AsyncClient(app=app, base_url="http://test") as client:
        yield client


@pytest.mark.asyncio
async def test_get_projects_integration(async_client):
    """Test the /projects endpoint with real ClearML connection"""
    response = await async_client.get("/projects")
    assert response.status_code == 200
    data = response.json()
    assert "projects" in data
    # We don't assert on the content because it will vary in different environments


@pytest.mark.asyncio
async def test_health_check_integration(async_client):
    """Test the health check endpoint with real ClearML connection"""
    response = await async_client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "projects_count" in data
