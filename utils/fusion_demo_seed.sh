#!/usr/bin/env bash
# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT
#
# Fusion Demo Seed Script — runs inside cvat_fusion_demo_init container.
# Creates an admin user, a project with 2D + 3D tasks, and linked annotations.
#
# This script is NOT meant to be run on the host. It is mounted into the init
# container by docker-compose.fusion-demo.yml.
set -euo pipefail

HOST="http://cvat-server:8080"
USER="${CVAT_DEMO_USER:-admin}"
PASS="${CVAT_DEMO_PASS:-admin}"
API="$HOST/api"
PUBLIC_HOST="${CVAT_HOST:-localhost}"

G='\033[0;32m'; Y='\033[1;33m'; R='\033[0;31m'; NC='\033[0m'
info()  { printf "${G}[fusion-demo]${NC} %s\n" "$*"; }
warn()  { printf "${Y}[fusion-demo]${NC} %s\n" "$*"; }
fail()  { printf "${R}[fusion-demo]${NC} %s\n" "$*"; exit 1; }

# ── wait for the server to be fully ready ────────────────────────────────
info "Waiting for CVAT server …"
for i in $(seq 1 120); do
  if curl -sf "$API/server/about" >/dev/null 2>&1; then break; fi
  [ "$i" -eq 120 ] && fail "CVAT server not reachable after 120s"
  sleep 2
done
info "Server is up."

# ── ensure superuser exists ──────────────────────────────────────────────
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -u "$USER:$PASS" "$API/users/self" 2>/dev/null || echo "000")
if [ "$STATUS" != "200" ]; then
  info "Creating superuser '$USER' …"
  python3 ~/manage.py shell -c "
from django.contrib.auth.models import User
if not User.objects.filter(username='$USER').exists():
    User.objects.create_superuser('$USER', 'admin@localhost', '$PASS')
    print('  Superuser created.')
else:
    u = User.objects.get(username='$USER')
    u.set_password('$PASS')
    u.save()
    print('  Password reset for existing user.')
" 2>/dev/null
  sleep 3
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" -u "$USER:$PASS" "$API/users/self" 2>/dev/null || echo "000")
  [ "$STATUS" != "200" ] && fail "Cannot authenticate as $USER (HTTP $STATUS). OPA may not be ready yet — try rerunning."
fi
info "Authenticated as $USER."

# ── idempotency: skip if demo tasks already exist ────────────────────────
EXISTING_2D=$(curl -sf -u "$USER:$PASS" "$API/tasks?search=Fusion+Demo+-+2D+Camera" 2>/dev/null \
  | python3 -c "import sys,json; r=json.load(sys.stdin)['results']; print(r[0]['id'] if r else '')" 2>/dev/null || echo "")
if [ -n "$EXISTING_2D" ]; then
  EXISTING_3D=$(curl -sf -u "$USER:$PASS" "$API/tasks?search=Fusion+Demo+-+3D+LiDAR" 2>/dev/null \
    | python3 -c "import sys,json; r=json.load(sys.stdin)['results']; print(r[0]['id'] if r else '')" 2>/dev/null || echo "")
  info "Fusion demo tasks already exist (2D=$EXISTING_2D, 3D=$EXISTING_3D). Skipping seed."
  printf "\n${G}  Viewer: http://$PUBLIC_HOST:8080/fusion?task2d=$EXISTING_2D&task3d=$EXISTING_3D${NC}\n\n"
  exit 0
fi

# ── label schema (shared by both tasks) ──────────────────────────────────
LABEL_SCHEMA='[{
  "name": "car",
  "color": "#ff6037",
  "attributes": [{
    "name": "link_id",
    "input_type": "text",
    "mutable": true,
    "default_value": "",
    "values": []
  }]
}, {
  "name": "pedestrian",
  "color": "#00bfff",
  "attributes": [{
    "name": "link_id",
    "input_type": "text",
    "mutable": true,
    "default_value": "",
    "values": []
  }]
}]'

# ── generate sample data ────────────────────────────────────────────────
TMPDIR=$(mktemp -d)
trap "rm -rf $TMPDIR" EXIT

info "Generating sample 2D images …"
python3 -c "
from PIL import Image, ImageDraw
import os, random
random.seed(42)
for i in range(5):
    img = Image.new('RGB', (800, 600), (30 + i*20, 50 + i*10, 80 + i*15))
    d = ImageDraw.Draw(img)
    for _ in range(3):
        x, y = random.randint(50,600), random.randint(50,400)
        d.rectangle([x, y, x+80, y+60], outline='white', width=2)
    img.save(os.path.join('$TMPDIR', f'image_{i:03d}.jpg'))
print('  Generated 5 images')
"

info "Generating sample point cloud …"
python3 -c "
import struct, zipfile, os, random
random.seed(42)
N = 5000
header = f'''# .PCD v0.7 - Point Cloud Data file format
VERSION 0.7
FIELDS x y z rgb
SIZE 4 4 4 4
TYPE F F F U
COUNT 1 1 1 1
WIDTH {N}
HEIGHT 1
VIEWPOINT 0 0 0 1 0 0 0
POINTS {N}
DATA binary
'''
pcd_path = os.path.join('$TMPDIR', 'pointcloud.pcd')
with open(pcd_path, 'wb') as f:
    f.write(header.encode())
    for _ in range(N):
        x = random.uniform(-10, 10)
        y = random.uniform(-10, 10)
        z = random.uniform(-2, 2)
        r, g, b = random.randint(50,255), random.randint(50,255), random.randint(50,255)
        rgb_packed = struct.pack('I', (r << 16) | (g << 8) | b)
        f.write(struct.pack('fff', x, y, z) + rgb_packed)
zip_path = os.path.join('$TMPDIR', 'pointcloud.zip')
with zipfile.ZipFile(zip_path, 'w') as zf:
    zf.write(pcd_path, 'pointcloud.pcd')
print('  Generated PCD with', N, 'points')
"

# ── create 2D task ───────────────────────────────────────────────────────
info "Creating 2D task …"
TASK2D_JSON=$(curl -sf -u "$USER:$PASS" \
  -H "Content-Type: application/json" \
  -X POST "$API/tasks" \
  -d "{\"name\": \"Fusion Demo - 2D Camera\", \"labels\": $LABEL_SCHEMA}")
TASK2D_ID=$(echo "$TASK2D_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")

UPLOAD_ARGS=""
IDX=0
for f in "$TMPDIR"/image_*.jpg; do
  UPLOAD_ARGS="$UPLOAD_ARGS -F client_files[$IDX]=@$f"
  IDX=$((IDX + 1))
done
curl -sf -u "$USER:$PASS" \
  -X POST "$API/tasks/$TASK2D_ID/data" \
  $UPLOAD_ARGS \
  -F "image_quality=70" \
  -o /dev/null

info "Waiting for 2D task processing …"
for i in $(seq 1 60); do
  SIZE=$(curl -sf -u "$USER:$PASS" "$API/tasks/$TASK2D_ID" \
    | python3 -c "import sys,json; print(json.load(sys.stdin).get('size',0))" 2>/dev/null || echo 0)
  [ "$SIZE" -gt 0 ] 2>/dev/null && break
  [ "$i" -eq 60 ] && fail "2D task not ready after 60s"
  sleep 1
done
info "2D task ready: id=$TASK2D_ID ($SIZE frames)."

# ── create 3D task ───────────────────────────────────────────────────────
info "Creating 3D task …"
TASK3D_JSON=$(curl -sf -u "$USER:$PASS" \
  -H "Content-Type: application/json" \
  -X POST "$API/tasks" \
  -d "{\"name\": \"Fusion Demo - 3D LiDAR\", \"labels\": $LABEL_SCHEMA}")
TASK3D_ID=$(echo "$TASK3D_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")

curl -sf -u "$USER:$PASS" \
  -X POST "$API/tasks/$TASK3D_ID/data" \
  -F "client_files[0]=@$TMPDIR/pointcloud.zip" \
  -F "image_quality=70" \
  -o /dev/null

info "Waiting for 3D task processing …"
for i in $(seq 1 60); do
  SIZE3D=$(curl -sf -u "$USER:$PASS" "$API/tasks/$TASK3D_ID" \
    | python3 -c "import sys,json; print(json.load(sys.stdin).get('size',0))" 2>/dev/null || echo 0)
  [ "$SIZE3D" -gt 0 ] 2>/dev/null && break
  [ "$i" -eq 60 ] && fail "3D task not ready after 60s"
  sleep 1
done
info "3D task ready: id=$TASK3D_ID ($SIZE3D frames)."

# ── resolve label and attribute IDs ──────────────────────────────────────
resolve_ids() {
  local task_id=$1
  curl -sf -u "$USER:$PASS" "$API/labels?task_id=$task_id" | python3 -c "
import sys, json
labels = json.load(sys.stdin)['results']
for l in labels:
    for a in l.get('attributes', []):
        if a['name'] == 'link_id':
            print(f\"{l['name']} {l['id']} {a['id']}\")
"
}

declare -A LABEL2D ATTR2D LABEL3D ATTR3D
while read -r name lid aid; do
  LABEL2D[$name]=$lid; ATTR2D[$name]=$aid
done < <(resolve_ids "$TASK2D_ID")

while read -r name lid aid; do
  LABEL3D[$name]=$lid; ATTR3D[$name]=$aid
done < <(resolve_ids "$TASK3D_ID")

# ── seed 2D annotations ─────────────────────────────────────────────────
JOB2D_ID=$(curl -sf -u "$USER:$PASS" "$API/jobs?task_id=$TASK2D_ID" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['results'][0]['id'])")
JOB3D_ID=$(curl -sf -u "$USER:$PASS" "$API/jobs?task_id=$TASK3D_ID" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['results'][0]['id'])")

info "Creating 2D annotations …"
curl -sf -u "$USER:$PASS" \
  -H "Content-Type: application/json" \
  -X PUT "$API/jobs/$JOB2D_ID/annotations" \
  -d "{
    \"shapes\": [
      {\"type\":\"rectangle\",\"frame\":0,\"label_id\":${LABEL2D[car]},\"points\":[120,80,320,240],\"occluded\":false,\"z_order\":0,\"attributes\":[{\"spec_id\":${ATTR2D[car]},\"value\":\"link-car-001\"}]},
      {\"type\":\"rectangle\",\"frame\":0,\"label_id\":${LABEL2D[pedestrian]},\"points\":[450,150,550,380],\"occluded\":false,\"z_order\":0,\"attributes\":[{\"spec_id\":${ATTR2D[pedestrian]},\"value\":\"link-ped-001\"}]},
      {\"type\":\"rectangle\",\"frame\":0,\"label_id\":${LABEL2D[car]},\"points\":[600,200,750,350],\"occluded\":false,\"z_order\":0,\"attributes\":[{\"spec_id\":${ATTR2D[car]},\"value\":\"\"}]}
    ],
    \"tags\": [], \"tracks\": []
  }" -o /dev/null

info "Creating 3D annotations …"
curl -sf -u "$USER:$PASS" \
  -H "Content-Type: application/json" \
  -X PUT "$API/jobs/$JOB3D_ID/annotations" \
  -d "{
    \"shapes\": [
      {\"type\":\"cuboid\",\"frame\":0,\"label_id\":${LABEL3D[car]},\"points\":[2.0,3.0,0.5,0.0,0.0,0.1,3.0,2.0,1.5,0,0,0,0,0,0,0],\"occluded\":false,\"z_order\":0,\"attributes\":[{\"spec_id\":${ATTR3D[car]},\"value\":\"link-car-001\"}]},
      {\"type\":\"cuboid\",\"frame\":0,\"label_id\":${LABEL3D[pedestrian]},\"points\":[-4.0,1.0,0.0,0.0,0.0,0.0,0.8,0.8,1.8,0,0,0,0,0,0,0],\"occluded\":false,\"z_order\":0,\"attributes\":[{\"spec_id\":${ATTR3D[pedestrian]},\"value\":\"link-ped-001\"}]},
      {\"type\":\"cuboid\",\"frame\":0,\"label_id\":${LABEL3D[car]},\"points\":[6.0,-2.0,0.3,0.0,0.0,0.5,4.0,2.0,1.6,0,0,0,0,0,0,0],\"occluded\":false,\"z_order\":0,\"attributes\":[{\"spec_id\":${ATTR3D[car]},\"value\":\"\"}]}
    ],
    \"tags\": [], \"tracks\": []
  }" -o /dev/null

# ── verification ─────────────────────────────────────────────────────────
info "Verifying setup …"
VERIFY_STATUS=0

# Check 2D task exists and has frames
SIZE2D_CHECK=$(curl -sf -u "$USER:$PASS" "$API/tasks/$TASK2D_ID" \
  | python3 -c "import sys,json; print(json.load(sys.stdin).get('size',0))" 2>/dev/null || echo 0)
[ "$SIZE2D_CHECK" -gt 0 ] || { warn "VERIFY FAIL: 2D task has no frames"; VERIFY_STATUS=1; }

# Check 3D task exists and has frames
SIZE3D_CHECK=$(curl -sf -u "$USER:$PASS" "$API/tasks/$TASK3D_ID" \
  | python3 -c "import sys,json; print(json.load(sys.stdin).get('size',0))" 2>/dev/null || echo 0)
[ "$SIZE3D_CHECK" -gt 0 ] || { warn "VERIFY FAIL: 3D task has no frames"; VERIFY_STATUS=1; }

# Check 2D annotations
ANN2D_COUNT=$(curl -sf -u "$USER:$PASS" "$API/jobs/$JOB2D_ID/annotations" \
  | python3 -c "import sys,json; print(len(json.load(sys.stdin)['shapes']))" 2>/dev/null || echo 0)
[ "$ANN2D_COUNT" -ge 3 ] || { warn "VERIFY FAIL: expected 3 2D annotations, got $ANN2D_COUNT"; VERIFY_STATUS=1; }

# Check 3D annotations
ANN3D_COUNT=$(curl -sf -u "$USER:$PASS" "$API/jobs/$JOB3D_ID/annotations" \
  | python3 -c "import sys,json; print(len(json.load(sys.stdin)['shapes']))" 2>/dev/null || echo 0)
[ "$ANN3D_COUNT" -ge 3 ] || { warn "VERIFY FAIL: expected 3 3D annotations, got $ANN3D_COUNT"; VERIFY_STATUS=1; }

# Check linked annotations have matching link_ids
LINKS_OK=$(curl -sf -u "$USER:$PASS" "$API/jobs/$JOB2D_ID/annotations" \
  | python3 -c "
import sys, json
shapes = json.load(sys.stdin)['shapes']
link_ids = set()
for s in shapes:
    for a in s.get('attributes', []):
        v = a.get('value', '')
        if v: link_ids.add(v)
print('ok' if 'link-car-001' in link_ids and 'link-ped-001' in link_ids else 'fail')
" 2>/dev/null || echo "fail")
[ "$LINKS_OK" = "ok" ] || { warn "VERIFY FAIL: link_ids not found in 2D annotations"; VERIFY_STATUS=1; }

if [ "$VERIFY_STATUS" -eq 0 ]; then
  info "All checks passed."
else
  warn "Some checks failed (see above)."
  exit 1
fi

# ── print summary ────────────────────────────────────────────────────────
echo ""
echo "════════════════════════════════════════════════════════════"
printf "${G} Fusion Demo Ready!${NC}\n"
echo "════════════════════════════════════════════════════════════"
echo "  2D Task    : $TASK2D_ID  (job $JOB2D_ID)"
echo "  3D Task    : $TASK3D_ID  (job $JOB3D_ID)"
echo "  Annotations: 3 per task (2 linked, 1 unlinked)"
echo ""
echo "  Credentials: $USER / $PASS"
echo ""
echo "  Fusion Viewer:"
printf "  ${Y}http://$PUBLIC_HOST:8080/fusion?task2d=$TASK2D_ID&task3d=$TASK3D_ID${NC}\n"
echo ""
echo "  Export with:"
printf "  ${Y}python utils/fusion_export.py --host http://$PUBLIC_HOST:8080 --username $USER --password $PASS --task2d-id $TASK2D_ID --task3d-id $TASK3D_ID --output-dir ./export${NC}\n"
echo "════════════════════════════════════════════════════════════"
