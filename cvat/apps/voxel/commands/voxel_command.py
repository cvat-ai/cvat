from cvat.apps.engine.log import slogger


class VoxelCommand():
    """Mixin for Voxel command shared logic."""

    logger = slogger

    def log_exception(self, task_pk, message):
        self.logger.task[task_pk].exception(message)

    def log_info(self, task_pk, message):
        self.logger.task[task_pk].info(message)