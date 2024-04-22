To regenerate the `*.txt` files in this directory, run:

    DATUMARO_HEADLESS=1 pip-compile-multi -d cvat/requirements \
        --backtracking --allow-unsafe --autoresolve --skip-constraints

Make sure to use the same Python version as is used in the main Dockerfile.
