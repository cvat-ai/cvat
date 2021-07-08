from django.db.models.signals import post_save
from django.dispatch import receiver

from cvat.apps.engine.models import Job, StatusChoice, Project, Task
from cvat.apps.training.jobs import (
    create_training_project_job,
    upload_images_job,
    upload_annotation_to_training_project_job,
)


@receiver(post_save, sender=Project, dispatch_uid="create_training_project")
def create_training_project(instance: Project, **kwargs):
    if instance.training_project:
        create_training_project_job.delay(instance.id)


@receiver(post_save, sender=Task, dispatch_uid='upload_images_to_training_project')
def upload_images_to_training_project(instance: Task, **kwargs):
    if (instance.status == StatusChoice.ANNOTATION and
        instance.data and instance.data.size != 0 and \
        instance.project_id and instance.project.training_project):

        upload_images_job.delay(instance.id)


@receiver(post_save, sender=Job, dispatch_uid="upload_annotation_to_training_project")
def upload_annotation_to_training_project(instance: Job, **kwargs):
    if instance.status == StatusChoice.COMPLETED:
        upload_annotation_to_training_project_job.delay(instance.id)
