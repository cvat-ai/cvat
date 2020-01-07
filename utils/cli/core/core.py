# SPDX-License-Identifier: MIT
import json
import logging
import os
import requests
from io import BytesIO
from PIL import Image
from .definition import ResourceType
log = logging.getLogger(__name__)


class CLI():

    def __init__(self, session, api):
        self.api = api
        self.session = session

    def tasks_data(self, task_id, resource_type, resources):
        """ Add local, remote, or shared files to an existing task. """
        url = self.api.tasks_id_data(task_id)
        data = None
        files = None
        if resource_type == ResourceType.LOCAL:
            files = {'client_files[{}]'.format(i): open(f, 'rb') for i, f in enumerate(resources)}
        elif resource_type == ResourceType.REMOTE:
            data = {'remote_files[{}]'.format(i): f for i, f in enumerate(resources)}
        elif resource_type == ResourceType.SHARE:
            data = {'server_files[{}]'.format(i): f for i, f in enumerate(resources)}
        response = self.session.post(url, data=data, files=files)
        response.raise_for_status()

    def tasks_list(self, use_json_output, **kwargs):
        """ List all tasks in either basic or JSON format. """
        url = self.api.tasks
        response = self.session.get(url)
        response.raise_for_status()
        page = 1
        while True:
            response_json = response.json()
            for r in response_json['results']:
                if use_json_output:
                    log.info(json.dumps(r, indent=4))
                else:
                    log.info('{id},{name},{status}'.format(**r))
            if not response_json['next']:
                return
            page += 1
            url = self.api.tasks_page(page)
            response = self.session.get(url)
            response.raise_for_status()

    def tasks_create(self, name, labels, bug, resource_type, resources, **kwargs):
        """ Create a new task with the given name and labels JSON and
        add the files to it. """
        url = self.api.tasks
        data = {'name': name,
                'labels': labels,
                'bug_tracker': bug,
                'image_quality': 50}
        response = self.session.post(url, json=data)
        response.raise_for_status()
        response_json = response.json()
        log.info('Created task ID: {id} NAME: {name}'.format(**response_json))
        self.tasks_data(response_json['id'], resource_type, resources)

    def tasks_delete(self, task_ids, **kwargs):
        """ Delete a list of tasks, ignoring those which don't exist. """
        for task_id in task_ids:
            url = self.api.tasks_id(task_id)
            response = self.session.delete(url)
            try:
                response.raise_for_status()
                log.info('Task ID {} deleted'.format(task_id))
            except requests.exceptions.HTTPError as e:
                if response.status_code == 404:
                    log.info('Task ID {} not found'.format(task_id))
                else:
                    raise e

    def tasks_frame(self, task_id, frame_ids, outdir='', **kwargs):
        """ Download the requested frame numbers for a task and save images as
        task_<ID>_frame_<FRAME>.jpg."""
        for frame_id in frame_ids:
            url = self.api.tasks_id_frame_id(task_id, frame_id)
            response = self.session.get(url)
            response.raise_for_status()
            im = Image.open(BytesIO(response.content))
            outfile = 'task_{}_frame_{:06d}.jpg'.format(task_id, frame_id)
            im.save(os.path.join(outdir, outfile))

    def tasks_dump(self, task_id, fileformat, filename, **kwargs):
        """ Download annotations for a task in the specified format
        (e.g. 'YOLO ZIP 1.0')."""
        url = self.api.tasks_id(task_id)
        response = self.session.get(url)
        response.raise_for_status()
        response_json = response.json()

        url = self.api.tasks_id_annotations_filename(task_id,
                                                     response_json['name'],
                                                     fileformat)
        while True:
            response = self.session.get(url)
            response.raise_for_status()
            log.info('STATUS {}'.format(response.status_code))
            if response.status_code == 201:
                break

        response = self.session.get(url + '&action=download')
        response.raise_for_status()

        with open(filename, 'wb') as fp:
            fp.write(response.content)

    def tasks_upload(self, task_id, fileformat, filename, **kwargs):
        """ Upload annotations for a task in the specified format
        (e.g. 'YOLO ZIP 1.0')."""
        url = self.api.tasks_id_annotations_format(task_id, fileformat)
        while True:
            response = self.session.put(
                url,
                files={'annotation_file':open(filename, 'rb')}
                )
            response.raise_for_status()
            if response.status_code == 201:
                break

        logger_string = "Upload job for Task ID {} ".format(task_id) +\
            "with annotation file {} finished".format(filename)
        log.info(logger_string)


class CVAT_API_V1():
    """ Build parameterized API URLs """

    def __init__(self, host, port):
        self.base = 'http://{}:{}/api/v1/'.format(host, port)

    @property
    def tasks(self):
        return self.base + 'tasks'

    def tasks_page(self, page_id):
        return self.tasks + '?page={}'.format(page_id)

    def tasks_id(self, task_id):
        return self.tasks + '/{}'.format(task_id)

    def tasks_id_data(self, task_id):
        return self.tasks_id(task_id) + '/data'

    def tasks_id_frame_id(self, task_id, frame_id):
        return self.tasks_id(task_id) + '/frames/{}'.format(frame_id)

    def tasks_id_annotations_format(self, task_id, fileformat):
        return self.tasks_id(task_id) + '/annotations?format={}' \
            .format(fileformat)

    def tasks_id_annotations_filename(self, task_id, name, fileformat):
        return self.tasks_id(task_id) + '/annotations/{}?format={}' \
            .format(name, fileformat)
