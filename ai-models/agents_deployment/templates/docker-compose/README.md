# This is an example Dockerfile template and docker compose for deploying your agent in CVAT.


## The general Dockerfile approach is:

1. Select base image to use with your agent.
2. Install necessary packages with a package manager.
For example YOLO needs libxcb1, libgl1, libglib2.0-0
3. Install cvat-cli, and if you need any Python dependencies, you may put them to requirements.txt
4. You should have `func.py` file that acts as adapter between your agent and CVAT.
You can refer to existing adapters for YOLO, SAM2 or transformers for inspiration. (`/ai-models/detector/yolo/func.py`,
`/ai-models/tracker/sam2/func.py`, `/ai-models/transformers/func.py`)
5. Consider supporting some build args like `$USE_GPU` to allow users to choose between CPU and GPU
   versions of the image.
For the models that we've implemented as agents we rely on `pytorch` CPU or GPU wheels.
6. Your image should implement the following functionality
   - Register function that will be powered by your agent in CVAT.
   - Run agent that will be polling CVAT for new tasks (Entrypoint).
   - Deregister function in CVAT when it is not needed anymore.

All three capabilities are powered by cvat-cli that authenticates in CVAT with provided API key and allows to
register/deregister functions and run agents.
Please refer to scripts [`entrypoint.sh`](./entrypoint.sh), [`function_registration.sh`](./function_registration.sh)
and [`function_deregistration.sh`](./function_deregistration.sh) for examples of how to use cvat-cli to implement
these capabilities.

### General recommendations
- Run your container with a non-root user.
- Use lightweight base images to reduce the size of your image and speed up deployment.
- Keep the frequently changing layers of your Docker closer to the end of your Dockerfile to take advantage of caching.
- Always pin the versions of your dependencies.

## Docker compose
Once your image is built, use Docker Compose to manage the agent lifecycle.
All services use the same image.

1. It runs function registration script in the container (`cvat-function-register` service).
2. `cvat-function-register` service creates a file on shared volume.
3. `cvat-agent` service runs agents that connect to CVAT function that was created in step 1.
4. When agent is not needed user should run `cvat-function-deregister` service manually to delete function from CVAT.
   (docker compose run --rm cvat-function-deregister)

It's easy to configure docker compose using [`.env`](./.env) file that should be located in the same folder as `docker-compose.yaml`
