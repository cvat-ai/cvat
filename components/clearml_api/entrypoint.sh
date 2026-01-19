#!/bin/bash
set -e

# Wait for ClearML server to be available (if needed)
echo "Starting ClearML API service..."

# Start the FastAPI application
exec uvicorn main:app --host 0.0.0.0 --port 8000 --reload
