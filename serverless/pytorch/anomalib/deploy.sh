# Deploy as CFA
nuctl deploy --project-name cvat \
  --path models/nuclio \
  --file models/nuclio/function_uflow.yaml --platform local \
  --env CVAT_FUNCTIONS_REDIS_HOST=cvat_redis_ondisk \
  --env CVAT_FUNCTIONS_REDIS_PORT=6666 \
  --platform-config '{"attributes": {"network": "cvat_cvat"}}' \

# Deploy as PatchCore (same image, different name)
nuctl deploy --project-name cvat  \
  --path models/nuclio \
  --file models/nuclio/function_patchcore.yaml --platform local \
  --env CVAT_FUNCTIONS_REDIS_HOST=cvat_redis_ondisk \
  --env CVAT_FUNCTIONS_REDIS_PORT=6666 \
  --platform-config '{"attributes": {"network": "cvat_cvat"}}' \
  --run-image cvat.pth.anomalib_aux.models \

# Deploy as UFlow
nuctl deploy --project-name cvat  \
  --path models/nuclio \
  --file models/nuclio/function_cfa.yaml --platform local \
  --env CVAT_FUNCTIONS_REDIS_HOST=cvat_redis_ondisk \
  --env CVAT_FUNCTIONS_REDIS_PORT=6666 \
  --platform-config '{"attributes": {"network": "cvat_cvat"}}' \
  --run-image cvat.pth.anomalib_aux.models

