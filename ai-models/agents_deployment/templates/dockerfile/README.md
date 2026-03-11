### This is an example Dockerfile template and docker compose for deploying your agent in CVAT.


##### The general approach is:

1. Select base image to use with your agent. We use `python:3.14-slim` as it is a lightweight image with Python 3.14
   installed.
2. You should have a `requirements.txt` file. Please ensure that cvat-cli is installed as well - you will need it.
Review your model's dependencies carefully and include necessary packages to Dockerfile or `requirements.txt`.
For example YOLO needs libxcb1, libgl1, libglib2.0-0, but they are missing in `python:3.14-slim`
3. You should have `func.py` file that acts as adapter between your agent and CVAT.
You can refer to existing adapters for YOLO, SAM2 or transformers for inspiration.
4. It could be a good idea to support some build args like `$USE_GPU` to allow users to choose between CPU and GPU
   versions of the image.
Right now we are focused on `pytorch` CPU or GPU wheels.
5. Your image should implement following functionality
   - Register function that will be powered by your agent in CVAT.
   - Run agent that will be polling CVAT for new tasks. (Entrypoint)
   - Deregister function in CVAT when it is not needed anymore.

All three capabilities are powered by cvat-cli that authenticates in CVAT with provided API key and allows to
register/deregister functions and run agents.
Please refer to shell scripts `entrypoint.sh`, `function_registration.sh` and `function_deregistration.sh` for
examples of how to use cvat-cli to implement these capabilities.

6. It's a good idea to run your container with non-root user.
