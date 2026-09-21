# 📊 CVAT Real-Time Class Analytics

> **Branch:** `dev-test01`  
> Built on top of [CVAT](https://github.com/cvat-ai/cvat) — the open-source annotation platform by CVAT.ai

---

## 👋 What Is This?

If you've ever annotated a dataset in CVAT and wondered *"how many frames actually have a car in them?"* or *"which class is dominating my dataset?"* — this is for you.

This branch adds a **live analytics dashboard** to CVAT that shows you, in real time, exactly how many frames and annotations each label has — across a project, a task, or a single job. No page refresh. No waiting. The numbers update the moment someone changes an annotation.

---

## ✨ Features at a Glance

| Feature | Details |
|---|---|
| 📊 **Bar Charts** | Side-by-side: distinct frames vs total annotations per label |
| 🔴 **Live Updates** | WebSocket stream — data updates as annotations change |
| 🟢 **Connection Badge** | Always know if you're live, reconnecting, or offline |
| 🔍 **Scope Selector** | Switch between Project / Task / Job view |
| 📋 **Data Table** | Sortable, with color swatches for each class |
| 🔒 **Secure** | Inherits CVAT's existing permission system |

---

## 🚀 Getting Started

### Prerequisites

- Docker & Docker Compose
- Node.js ≥ 18 + Yarn

### 1. Clone & Switch to This Branch

```bash
git clone https://github.com/cvat-ai/cvat.git
cd cvat
git checkout dev-test01
```

### 2. Start the Backend

```bash
docker compose up -d
```

Wait for all services to be healthy. You can check with:

```bash
docker compose ps
```

### 3. Start the Frontend Dev Server

```bash
cd cvat-ui
yarn install
yarn run start:cvat-ui
```

### 4. Open the App

Go to **http://localhost:3000** in your browser, log in, and click **"Class Analytics"** in the top navigation bar.

Or go directly to: **http://localhost:3000/class-counts**

---

## 🗺️ How It Works

Here's the big picture of what happens when you load the analytics page:

```
You (Browser)
    │
    │  1. Page loads, selects a Task
    │
    ▼
React UI (localhost:3000)
    │
    │  2. Opens WebSocket connection
    │
    ▼
Nginx → Uvicorn (Django ASGI)
    │
    │  3. Authenticates you, checks permissions
    │  4. Sends current class counts immediately
    │  5. Subscribes to Redis for live updates
    │
    ▼
PostgreSQL  ←────────────────────┐
    │                             │
    │  Annotation data            │  When someone annotates
    │                             │  something new, Redis
    ▼                             │  publishes an update
Redis (Pub/Sub)  ─────────────► Browser gets new data ✅
```

No polling. No page refresh. Pure WebSocket magic.

---

## 📁 What's Changed in This Branch

All new backend code lives under `cvat/apps/test/`, and all new frontend code lives under `cvat-ui/src/components/class-counts-analytics/`.

```
cvat/
├── apps/
│   └── test/                        ← New Django app
│       ├── service.py                  ← Core aggregation logic
│       ├── views.py                    ← REST API endpoint
│       ├── consumers.py                ← WebSocket consumer (ASGI)
│       ├── routing.py                  ← WebSocket URL routing
│       ├── permissions.py              ← Authorization checks
│       └── urls.py                     ← REST URL patterns
│
├── asgi.py                          ← Modified: WS routing integrated
└── urls.py                          ← Modified: REST URLs registered

cvat-ui/src/components/
├── class-counts-analytics/          ← New React module
│   ├── class-counts-analytics-page.tsx  ← Main page component
│   ├── use-class-counts-ws.ts           ← WebSocket React hook
│   └── index.ts                         ← Module exports
│
├── cvat-app.tsx                     ← Modified: /class-counts route added
└── header/header.tsx                ← Modified: "Class Analytics" button added
```

---

## 🔌 API Reference

### REST Endpoint

```
GET /api/test/class-counts
```

**Query Parameters** (pick exactly one):

| Parameter | Type | Example |
|---|---|---|
| `project_id` | integer | `?project_id=1` |
| `task_id` | integer | `?task_id=3` |
| `job_id` | integer | `?job_id=9` |

**Example Response:**

```json
[
  {
    "label_id": 1,
    "label_name": "car",
    "color": "#ff0000",
    "image_count": 120,
    "annotation_count": 240
  },
  {
    "label_id": 2,
    "label_name": "pedestrian",
    "color": "#00ff00",
    "image_count": 85,
    "annotation_count": 102
  }
]
```

- **`image_count`** — how many distinct frames have at least one annotation of this class
- **`annotation_count`** — total number of annotation objects for this class

### WebSocket Endpoint

```
ws://your-host/ws/test/class-counts?task_id=3
```

**Message Types You'll Receive:**

```jsonc
// Initial data + updates
{ "type": "class_counts", "version": 1, "scope": {"task_id": 3}, "data": [...], "ts": "2026-..." }

// Keep-alive ping (every 30s)
{ "type": "heartbeat", "ts": "2026-..." }

// On auth/permission failure (then closes)
{ "type": "error", "message": "Authentication required", "code": 4001 }
```

**Close Codes:**

| Code | Meaning |
|---|---|
| `4001` | Not authenticated |
| `4002` | No permission for this resource |
| `4003` | Missing or invalid scope parameter |
| `1000` | Normal closure |

---

## 🔒 Permissions

This feature respects CVAT's existing permission model:

- **Superusers** can view analytics for any resource
- **Owners / Assignees** of a project/task/job can view its analytics
- **Organization members** with appropriate roles get access automatically

No new permission configuration is required.

---

## 🛠️ Local Development Tips

**Hot reload works** — changes to `.tsx` files in `cvat-ui/src/` are reflected immediately.

**Backend changes** require restarting the server container:
```bash
docker restart cvat_server
```

**To copy backend changes into the running container** without a full rebuild:
```bash
docker cp cvat/apps/test/consumers.py cvat_server:/opt/cvat/cvat/apps/test/consumers.py
docker restart cvat_server
```

**Watch server logs** for WebSocket activity:
```bash
docker logs -f cvat_server | grep "class-counts"
```

---

## 🙏 Acknowledgements

Built on top of the amazing [CVAT](https://github.com/cvat-ai/cvat) open-source platform by CVAT.ai. This feature extends CVAT without modifying its core annotation engine — all new code lives in the isolated `test` app.

---

*Made with ☕ and a lot of WebSocket debugging.*
