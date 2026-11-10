# 1. Start CVAT with serverless support for AI tracking models
docker compose -f docker-compose.yml -f components/serverless/docker-compose.serverless.yml up -d

# 2. Check running services
docker compose -f docker-compose.yml -f components/serverless/docker-compose.serverless.yml ps

# 3. Create CVAT superuser (admin account)
docker exec -it cvat_server python3 ~/manage.py createsuperuser

# 4. Download and install nuctl (Nuclio CLI for model deployment)
wget https://github.com/nuclio/nuclio/releases/download/1.16.3/nuctl-1.16.3-linux-amd64
chmod +x nuctl-1.16.3-linux-amd64
sudo ln -sf $(pwd)/nuctl-1.16.3-linux-amd64 /usr/local/bin/nuctl

# 5. Verify nuctl is installed
nuctl version

# 6. Deploy TransT object tracker function (choose CPU or GPU)
# For CPU:
./serverless/deploy_cpu.sh serverless/pytorch/dschoerk/transt/nuclio
# For GPU (if NVIDIA GPU and NVIDIA Container Toolkit are installed):
# ./serverless/deploy_gpu.sh serverless/pytorch/dschoerk/transt/nuclio

# 7. Verify deployed tracker model in Nuclio
nuctl get functions --platform local

# 8. (Optional) Install cvat-cli and create a video tracking task via command line
pip install cvat-cli
# Replace admin, password, and path/to/video.mp4 with your details:
# cvat-cli --server-host http://localhost:8080 --auth admin:password task create "Video Tracking" local /path/to/video.mp4 --labels '[{"name": "object"}]'

# 9. Open CVAT in your web browser:
# URL: http://localhost:8080
# Workflow in UI to start tracking:
# - Log in with your superuser credentials
# - Go to "Tasks" -> "+ Create a new task" (or open an existing task)
# - Add labels (e.g. "car", "person", "object") and upload your video file
# - Click "Submit & Open", then click on "Job #1"
# - In the left toolbar, click "AI Tools" (magic wand icon) -> "Trackers"
# - Select tracker "TransT", select the label, and draw a bounding box around the target object
# - Step forward or let the tracker automatically track the object across frames
# Alternatively, use CVAT built-in manual track: Select "Draw new rectangle" -> mode "Track" -> draw bounding box on keyframes

# 10. Stop CVAT services when finished
# docker compose -f docker-compose.yml -f components/serverless/docker-compose.serverless.yml down
