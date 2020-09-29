# Copyright (C) 2020 Intel Corporation
#
# SPDX-License-Identifier: MIT

import json
import logging
import os
import requests
from io import BytesIO
import mimetypes
from time import sleep

from PIL import Image

from .definition import ResourceType
log = logging.getLogger(__name__)


class CLI():

    def __init__(self, session, api, credentials):
        self.api = api
        self.session = session
        self.login(credentials)

    def tasks_data(self, task_id, resource_type, resources):
        """ Add local, remote, or shared files to an existing task. """
        url = self.api.tasks_id_data(task_id)
        data = {}
        files = None
        if resource_type == ResourceType.LOCAL:
            files = {'client_files[{}]'.format(i): open(f, 'rb') for i, f in enumerate(resources)}
        elif resource_type == ResourceType.REMOTE:
            data = {'remote_files[{}]'.format(i): f for i, f in enumerate(resources)}
        elif resource_type == ResourceType.SHARE:
            data = {'server_files[{}]'.format(i): f for i, f in enumerate(resources)}
        data['image_quality'] = 50
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

    def tasks_create(self, name, labels, overlap, segment_size, bug, resource_type, resources,
                     annotation_path='', annotation_format='CVAT XML 1.1',
                     completion_verification_period=20, **kwargs):
        """ Create a new task with the given name and labels JSON and
        add the files to it. """
        url = self.api.tasks
        data = {'name': name,
                'labels': labels,
                'overlap': overlap,
                'segment_size': segment_size,
                'bug_tracker': bug,
        }
        response = self.session.post(url, json=data)
        response.raise_for_status()
        response_json = response.json()
        log.info('Created task ID: {id} NAME: {name}'.format(**response_json))
        task_id = response_json['id']
        self.tasks_data(task_id, resource_type, resources)

        if annotation_path != '':
            url = self.api.tasks_id_status(task_id)
            response = self.session.get(url)
            response_json = response.json()

            log.info('Awaiting data compression before uploading annotations...')
            while response_json['state'] != 'Finished':
                sleep(completion_verification_period)
                response = self.session.get(url)
                response_json = response.json()
                logger_string= '''Awaiting compression for task {}.
                            Status={}, Message={}'''.format(task_id,
                                                            response_json['state'],
                                                            response_json['message'])
                log.info(logger_string)

            self.tasks_upload(task_id, annotation_format, annotation_path, **kwargs)

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

    def tasks_frame(self, task_id, frame_ids, outdir='', quality='original', **kwargs):
        """ Download the requested frame numbers for a task and save images as
        task_<ID>_frame_<FRAME>.jpg."""
        for frame_id in frame_ids:
            url = self.api.tasks_id_frame_id(task_id, frame_id, quality)
            response = self.session.get(url)
            response.raise_for_status()
            im = Image.open(BytesIO(response.content))
            mime_type = im.get_format_mimetype() or 'image/jpg'
            im_ext = mimetypes.guess_extension(mime_type)
            # FIXME It is better to use meta information from the server
            # to determine the extension
            # replace '.jpe' or '.jpeg' with a more used '.jpg'
            if im_ext == '.jpe' or '.jpeg' or None:
                im_ext = '.jpg'

            outfile = 'task_{}_frame_{:06d}{}'.format(task_id, frame_id, im_ext)
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
                files={'annotation_file': open(filename, 'rb')}
            )
            response.raise_for_status()
            if response.status_code == 201:
                break

        logger_string = "Upload job for Task ID {} ".format(task_id) +\
            "with annotation file {} finished".format(filename)
        log.info(logger_string)

    def login(self, credentials):
        url = self.api.login
        auth = {'username': credentials[0], 'password': credentials[1]}
        response = self.session.post(url, auth)
        response.raise_for_status()
        if 'csrftoken' in response.cookies:
            self.session.headers['X-CSRFToken'] = response.cookies['csrftoken']


class CVAT_API_V1():
    """ Build parameterized API URLs """

    def __init__(self, host, https=False):
        if host.startswith('https://'):
            https = True
        if host.startswith('http://') or host.startswith('https://'):
            host = host.replace('http://', '')
            host = host.replace('https://', '')
        scheme = 'https' if https else 'http'
        self.base = '{}://{}/api/v1/'.format(scheme, host)

    @property
    def tasks(self):
        return self.base + 'tasks'

    def tasks_page(self, page_id):
        return self.tasks + '?page={}'.format(page_id)

    def tasks_id(self, task_id):
        return self.tasks + '/{}'.format(task_id)

    def tasks_id_data(self, task_id):
        return self.tasks_id(task_id) + '/data'

    def tasks_id_frame_id(self, task_id, frame_id, quality):
        return self.tasks_id(task_id) + '/data?type=frame&number={}&quality={}'.format(frame_id, quality)

    def tasks_id_status(self, task_id):
        return self.tasks_id(task_id) + '/status'

    def tasks_id_annotations_format(self, task_id, fileformat):
        return self.tasks_id(task_id) + '/annotations?format={}' \
            .format(fileformat)

    def tasks_id_annotations_filename(self, task_id, name, fileformat):
        return self.tasks_id(task_id) + '/annotations?format={}&filename={}' \
            .format(fileformat, name)

    @property
    def login(self):
        return self.base + 'auth/login'
