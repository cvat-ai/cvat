from collections import OrderedDict
from typing import List

from django_rq import job

from cvat.apps import dataset_manager as dm
from cvat.apps.engine.frame_provider import FrameProvider
from cvat.apps.engine.models import (
    Project,
    Task,
    TrainingProjectImage,
    Label,
    Image,
    TrainingProjectLabel,
    Data,
    Job,
    ShapeType,
)
from cvat.apps.training.apis import TrainingServerAPI


@job
def save_prediction_server_status_to_cache_job(cache_key,
                                               cvat_project_id,
                                               timeout=60):
    cvat_project = Project.objects.get(pk=cvat_project_id)
    api = TrainingServerAPI(host=cvat_project.training_project.host, username=cvat_project.training_project.username,
                            password=cvat_project.training_project.password)
    status = api.get_project_status(project_id=cvat_project.training_project.training_id)

    resp = {
        **status,
        'status': 'done'
    }

    return resp # dummy code, need to delete training app in a separate PR


@job
def save_frame_prediction_to_cache_job(cache_key: str,
                                       task_id: int,
                                       frame: int,
                                       timeout: int = 60):
    task = Task.objects.get(pk=task_id)
    training_project_image = TrainingProjectImage.objects.filter(idx=frame, task=task).first()
    if not training_project_image:
        return

    cvat_labels = Label.objects.filter(project__id=task.project_id).all()
    training_project = Project.objects.get(pk=task.project_id).training_project
    api = TrainingServerAPI(host=training_project.host,
                            username=training_project.username,
                            password=training_project.password)
    image = Image.objects.get(frame=frame, data=task.data)
    labels_mapping = {
        TrainingProjectLabel.objects.get(cvat_label=cvat_label).training_label_id: cvat_label.id
        for cvat_label in cvat_labels
    }
    annotation = api.get_annotation(project_id=training_project.training_id,
                                    image_id=training_project_image.training_image_id,
                                    width=image.width,
                                    height=image.height,
                                    labels_mapping=labels_mapping,
                                    frame=frame)
    resp = {
        'annotation': annotation,
        'status': 'done'
    }

    return resp # dummy code, need to delete training app in a separate PR


@job
def upload_images_job(task_id: int):
    if TrainingProjectImage.objects.filter(task_id=task_id).count() is 0:
        task = Task.objects.get(pk=task_id)
        frame_provider = FrameProvider(task.data)
        frames = frame_provider.get_frames()
        api = TrainingServerAPI(
            host=task.project.training_project.host,
            username=task.project.training_project.username,
            password=task.project.training_project.password,
        )

        for i, (buffer, _) in enumerate(frames):
            training_image_id = api.upload_image(training_id=task.project.training_project.training_id, buffer=buffer)
            if training_image_id:
                TrainingProjectImage.objects.create(task=task, idx=i,
                                                    training_image_id=training_image_id)

def __add_fields_to_shape(shape: dict, frame: int, data: Data, labels_mapping: dict) -> dict:
    image = Image.objects.get(frame=frame, data=data)
    return {
        **shape,
        'height': image.height,
        'width': image.width,
        'third_party_label_id': labels_mapping[shape['label_id']],
    }


@job
def upload_annotation_to_training_project_job(job_id: int):
    cvat_job = Job.objects.get(pk=job_id)
    cvat_project = cvat_job.segment.task.project
    training_project = cvat_project.training_project
    start = cvat_job.segment.start_frame
    stop = cvat_job.segment.stop_frame
    data = dm.task.get_job_data(job_id)
    shapes: List[OrderedDict] = data.get('shapes', [])
    frames_data = []
    api = TrainingServerAPI(
        host=cvat_project.training_project.host,
        username=cvat_project.training_project.username,
        password=cvat_project.training_project.password,
    )
    cvat_labels = Label.objects.filter(project=cvat_project).all()
    labels_mapping = {
        cvat_label.id: TrainingProjectLabel.objects.get(cvat_label=cvat_label).training_label_id
        for cvat_label in cvat_labels
    }

    for frame in range(start, stop + 1):
        frame_shapes = list(
            map(
                lambda x: __add_fields_to_shape(x, frame, cvat_job.segment.task.data, labels_mapping),
                filter(
                    lambda x: x['frame'] == frame and x['type'] == ShapeType.RECTANGLE,
                    shapes,
                )
            )
        )

        if frame_shapes:
            training_project_image = TrainingProjectImage.objects.get(task=cvat_job.segment.task, idx=frame)
            frames_data.append({
                'third_party_id': training_project_image.training_image_id,
                'shapes': frame_shapes
            })

    api.upload_annotations(project_id=training_project.training_id, frames_data=frames_data)


@job
def create_training_project_job(project_id: int):
    cvat_project = Project.objects.get(pk=project_id)
    training_project = cvat_project.training_project
    api = TrainingServerAPI(
        host=cvat_project.training_project.host,
        username=cvat_project.training_project.username,
        password=cvat_project.training_project.password,
    )
    create_training_project(cvat_project=cvat_project, training_project=training_project, api=api)


def create_training_project(cvat_project, training_project, api):
    labels = cvat_project.label_set.all()
    training_project_resp = api.create_project(
        name=f'{cvat_project.name}_cvat',
        project_class=training_project.project_class,
        labels=[{'name': label.name} for label in labels]
    )
    if training_project_resp.get('id'):
        training_project.training_id = training_project_resp['id']
        training_project.save()

    for cvat_label in labels:
        training_label = list(filter(lambda x: x['name'] == cvat_label.name, training_project_resp.get('labels', [])))
        if training_label:
            TrainingProjectLabel.objects.create(cvat_label=cvat_label, training_label_id=training_label[0]['id'])


async def upload_images(cvat_project_id, training_id, api):
    project = Project.objects.get(pk=cvat_project_id)
    tasks: List[Task] = project.tasks.all()
    for task in tasks:
        frame_provider = FrameProvider(task)
        frames = frame_provider.get_frames()
        for i, (buffer, _) in enumerate(frames):
            training_image_id = api.upload_image(training_id=training_id, buffer=buffer)
            if training_image_id:
                TrainingProjectImage.objects.create(project=project, task=task, idx=i,
                                                    training_image_id=training_image_id)

