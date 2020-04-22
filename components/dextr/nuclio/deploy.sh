docker build -t cvat/dextr:latest .
nuctl deploy -f ./function.yaml
#nuctl deploy dextr --run-image cvat/dextr:latest --runtime "python:3.6" --handler "main:handler" --platform local
