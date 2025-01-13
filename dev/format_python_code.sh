#! /bin/env bash

set -e

PYTHON="${PYTHON:-python3}"
BLACK="${PYTHON} -m black"
ISORT="${PYTHON} -m isort"

if ! ${BLACK} --version >/dev/null 2>&1; then
    echo "black is not found, please check it is installed"
    exit 1
fi
if ! ${ISORT} --version >/dev/null 2>&1; then
    echo "isort is not found, please check it is installed"
    exit 1
fi

# The commands must be run on each module directory separately,
# otherwise tools confuse the "current" module
for paths in \
    "cvat-sdk" \
    "cvat-cli" \
    "tests/python/" \
    "cvat/apps/quality_control" \
    "cvat/apps/analytics_report" \
    "cvat/apps/engine/lazy_list.py" \
    "cvat/apps/engine/background.py" \
    "cvat/apps/engine/frame_provider.py" \
    "cvat/apps/engine/cache.py" \
    "cvat/apps/engine/default_settings.py" \
    "cvat/apps/engine/field_validation.py" \
    "cvat/apps/engine/model_utils.py" \
    "cvat/apps/engine/task_validation.py" \
    "cvat/apps/dataset_manager/cron.py" \
    "cvat/apps/dataset_manager/tests/test_annotation.py" \
    "cvat/apps/dataset_manager/tests/utils.py" \
    "cvat/apps/events/signals.py" \
    "cvat/apps/engine/management/commands/syncperiodicjobs.py" \
    "cvat/apps/dataset_manager/management/commands/cleanuplegacyexportcache.py" \
    ; do
    ${BLACK} -- ${paths}
    ${ISORT} -- ${paths}
done
