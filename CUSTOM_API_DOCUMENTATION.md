# CVAT Custom API - Annotated Frames Download

## 🎯 Overview

This custom API endpoint allows you to download all annotated frames for a specific job, with optional filtering by label. The frames are returned as a ZIP file with annotations overlaid on the images.

## 📡 API Endpoints

### 1. Download by Job ID (Original)
```
GET /api/custom/download-annotated-frames/
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `job_id` | integer | ✅ Yes | ID of the job to download frames from |
| `label_id` | integer | ❌ No | ID of the label to filter annotations (optional) |

### 2. Download by Task ID (Production-Grade) ⭐
```
GET /api/custom/download-task-frames/
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `task_id` | integer | ✅ Yes | ID of the task to download frames from |
| `label_id` | integer | ❌ No | ID of the label to filter annotations (optional) |

**✨ Enhanced Features:**
- Downloads from **all jobs** in the task
- **Production-grade** annotation rendering
- **Organized folder structure** (job_1/, job_2/, etc.)
- **Metadata file** with task information
- **Enhanced visual quality** with anti-aliasing
- **Frame information overlay**

### Authentication

- Requires user authentication (login to CVAT)
- Uses Django session authentication

### Response

- **Success (200)**: ZIP file containing annotated frames
- **Bad Request (400)**: Missing or invalid parameters
- **Unauthorized (401)**: Authentication required
- **Forbidden (403)**: Permission denied
- **Not Found (404)**: Job or label not found

## 🏗️ Implementation Details

### Architecture

```
cvat/apps/custom/
├── __init__.py
├── apps.py          # Django app configuration
├── urls.py          # URL routing
└── views.py         # Main API implementation
```

### Key Components

1. **Frame Filtering**: Queries `LabeledShape`, `LabeledImage`, and `TrackedShape` models
2. **Frame Provider**: Uses `JobFrameProvider` to access original frame images
3. **Annotation Overlay**: Draws annotations using PIL (Python Imaging Library)
4. **ZIP Creation**: Packages annotated frames into a downloadable ZIP file

### Supported Annotation Types

- ✅ **Rectangles** (bounding boxes)
- ✅ **Polygons**
- ✅ **Polylines**
- ✅ **Points**
- ✅ **Ellipses**
- ✅ **Tracked Shapes** (from tracks)
- ✅ **Tags** (LabeledImage - no visual overlay)

## 🚀 Usage Examples

### 1. Download All Annotated Frames for a Task (Recommended)

```bash
curl -X GET "http://localhost:8000/api/custom/download-task-frames/?task_id=5" \
  -H "Authorization: Basic YWRtaW46I0BQamFpbjkzMjk=" \
  -o "task_5_frames.zip"
```

### 2. Download Task Frames with Specific Label Only

```bash
curl -X GET "http://localhost:8000/api/custom/download-task-frames/?task_id=5&label_id=1" \
  -H "Authorization: Basic YWRtaW46I0BQamFpbjkzMjk=" \
  -o "task_5_label_torn_frames.zip"
```

### 3. Download Single Job Frames (Legacy)

```bash
curl -X GET "http://localhost:8000/api/custom/download-annotated-frames/?job_id=1" \
  -H "Authorization: Basic YWRtaW46I0BQamFpbjkzMjk=" \
  -o "job_1_frames.zip"
```

### 3. Python Example

```python
import requests

# Login and get session
session = requests.Session()
# ... (login code)

# Download annotated frames
response = session.get(
    "http://localhost:8000/api/custom/download-annotated-frames/",
    params={"job_id": 1, "label_id": 5}
)

if response.status_code == 200:
    with open("annotated_frames.zip", "wb") as f:
        f.write(response.content)
    print("Download successful!")
```

## 🧪 Testing

### Prerequisites

1. **CVAT Development Environment Running**:
   ```bash
   ./start_dev.sh    # Backend
   ./start_frontend.sh  # Frontend (optional)
   ```

2. **Create Test Data**:
   - Create a project in CVAT UI
   - Upload images/video
   - Create annotations with different labels
   - Ensure jobs have annotated frames

### Test Script

Use the provided test script:

```bash
python test_custom_api.py
```

### Manual Testing

1. **Access CVAT UI**: http://localhost:3000
2. **Create annotations** on some frames
3. **Note the job ID** from the URL or API
4. **Test the endpoint**:
   ```bash
   # Replace 1 with actual job ID
   curl -X GET "http://localhost:8000/api/custom/download-annotated-frames/?job_id=1"
   ```

## 🔧 Configuration

### Django Settings

The custom app is automatically registered in:
- `cvat/settings/base.py` - Added to `INSTALLED_APPS`
- `cvat/urls.py` - URL routing configured

### Permissions

Currently uses basic authentication check. To enhance security:

```python
# In views.py, replace the basic check with:
from cvat.apps.iam.permissions import JobPermission

# Check if user has access to the specific job
if not JobPermission.create_scope_view(request, job):
    return Response({'error': 'Permission denied'}, status=403)
```

## 📁 File Structure

### Generated ZIP File Structure

#### Task-based Download (Production)
```
task_5_annotated_frames.zip
├── metadata.json              # Task information and statistics
├── job_1/
│   ├── frame_000001.png      # Annotated frames from job 1
│   ├── frame_000005.png
│   └── frame_000012.png
├── job_2/
│   ├── frame_000020.png      # Annotated frames from job 2
│   └── frame_000025.png
└── ...
```

#### Job-based Download (Legacy)
```
job_1_annotated_frames.zip
├── frame_000001.png
├── frame_000005.png
├── frame_000012.png
└── ...
```

### Annotation Overlay Details

- **Colors**: Uses label colors from CVAT (falls back to red/green)
- **Line Width**: 2 pixels for visibility
- **Label Text**: High-visibility labels with maximum contrast
  - **Font**: Cross-platform font loading (DejaVu Sans Bold 24px preferred)
    - Bundled fonts: `cvat/apps/custom/fonts/` (optional)
    - System fonts: macOS (Arial/Helvetica), Linux (DejaVu Sans)
    - Fallback: PIL default font
  - **Background**: Black with white border (2px)
  - **Text Color**: Bright yellow for maximum visibility
  - **Padding**: 8px around text for better readability
  - **Position**: 35px above annotations (increased spacing)
- **Format**: PNG for quality preservation
- **Naming**: `frame_XXXXXX.png` (6-digit zero-padded frame numbers)

## 🐛 Troubleshooting

### Common Issues

1. **ImportError**: Ensure all dependencies are installed
   ```bash
   pip install Pillow  # For image processing
   ```

2. **No frames found**: Check if job has annotations
   ```python
   # Django shell
   from cvat.apps.engine.models import *
   job = Job.objects.get(id=1)
   print("Shapes:", LabeledShape.objects.filter(job=job).count())
   ```

3. **Permission denied**: Ensure user is authenticated and has job access

4. **Frame provider errors**: Check if job's task data is accessible

### Debug Mode

Add debug logging to views.py:

```python
import logging
logger = logging.getLogger(__name__)

# In your view methods:
logger.debug(f"Processing job {job_id}, found {len(annotated_frames)} frames")
```

## 🔮 Future Enhancements

### Planned Features

1. **Export Formats**: Support for different annotation formats (COCO, YOLO, etc.)
2. **Batch Processing**: Download multiple jobs at once
3. **Filtering Options**: Date range, annotation confidence, etc.
4. **Progress Tracking**: WebSocket updates for large downloads
5. **Caching**: Cache generated frames for faster subsequent downloads

### Performance Optimizations

1. **Async Processing**: Use Celery for large jobs
2. **Streaming**: Stream ZIP file generation for memory efficiency
3. **Image Optimization**: Configurable image quality/compression
4. **Parallel Processing**: Multi-threaded frame processing

## 📝 API Schema

### OpenAPI/Swagger Documentation

The endpoint is automatically documented in CVAT's API schema:
- **Development**: http://localhost:8000/api/schema/swagger-ui/
- **API Schema**: http://localhost:8000/api/schema/

### Response Examples

**Success Response**:
```
HTTP/1.1 200 OK
Content-Type: application/zip
Content-Disposition: attachment; filename="job_1_annotated_frames.zip"
Content-Length: 2048576

[ZIP file binary data]
```

**Error Response**:
```json
{
  "error": "job_id parameter is required"
}
```

## 🤝 Contributing

### Code Style

- Follow Django/Python conventions
- Add docstrings to all methods
- Include type hints where appropriate
- Write unit tests for new features

### Testing

```bash
# Run Django tests
python manage.py test cvat.apps.custom

# Run linting
flake8 cvat/apps/custom/
```

---

## ✅ Implementation Status

All core functionality is complete and ready for use:

- ✅ Custom Django app created
- ✅ API endpoint implemented
- ✅ Frame filtering by job and label
- ✅ Annotation overlay rendering
- ✅ ZIP file generation and download
- ✅ Error handling and validation
- ✅ Documentation and examples
- ✅ Test scripts provided

**Ready for production use!** 🚀


---

## 🚆 Vision chapters (`/api/custom/tasks/{id}/chapters/`)

Orochi Vision's findings for the clip behind a task, pushed by Orochi On-Prem right after
it creates the task (same session auth as `train-metadata`). Everything in the document is
in the clock of the video CVAT references — the trimmed clip when stops were cut out.

| Method | Path | Body / Result |
|---|---|---|
| `POST` / `PUT` | `/api/custom/tasks/{id}/chapters/` | Body: the chapters document (`schema_version: 1`, see `cvat/apps/custom/vision.py`). Replaces any previous one. `201` created / `200` replaced / `400` with `details[]`. |
| `GET` | `/api/custom/tasks/{id}/chapters/` | `{task_id, summary, chapters}`; `404` until On-Prem has pushed. |

`summary` (`car_count`, `needs_review`, `truncated_start/end`, `trimmed`, `trim_ratio`,
`video_duration_s`, `analysed_camera`, `outcome`, `pipeline_image`, `updated_date`) is also
embedded as `vision` in every row of `tasks-paginated/` and in `task-analysis/`
(`null` when nothing was pushed), so lists never need a second request.
