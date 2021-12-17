# Copyright (C) 2021 Intel Corporation
#
# SPDX-License-Identifier: MIT

#/usr/bin/env python

import argparse
import json
from time import sleep
import requests

def import_resources(host, port, cfg_file):
    with open(cfg_file, 'r') as f:
        for saved_object in json.load(f):
            _id = saved_object["_id"]
            _type = saved_object["_type"]
            _doc = saved_object["_source"]
            import_saved_object(host, port, _type, _id, _doc)

def import_saved_object(host, port, _type, _id, data):
    saved_objects_api = "http://{}:{}/api/saved_objects/{}/{}".format(
        host, port, _type, _id)
    request = requests.get(saved_objects_api)
    if request.status_code == 404:
        print("Creating {} as {}".format(_type, _id))
        request = requests.post(saved_objects_api, json={"attributes": data},
            headers={'kbn-xsrf': 'true'})
    else:
        print("Updating {} named {}".format(_type, _id))
        request = requests.put(saved_objects_api, json={"attributes": data},
            headers={'kbn-xsrf': 'true'})
    request.raise_for_status()

def wait_for_status(host, port, status='green', max_attempts=10, delay=3):
    for _ in range(max_attempts):
        response = requests.get('http://{}:{}/api/status'.format(host, port))
        if response.status_code != 200:
            sleep(delay)
            continue

        response = response.json()
        if status == response['status']['overall']['state']:
            return True

    return False

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='import Kibana 6.x resources',
        formatter_class=argparse.ArgumentDefaultsHelpFormatter)
    parser.add_argument('export_file', metavar='FILE',
        help='JSON export file with resources')
    parser.add_argument('-p', '--port', metavar='PORT', default=5601, type=int,
        help='port of Kibana instance')
    parser.add_argument('-H', '--host', metavar='HOST', default='kibana',
        help='host of Kibana instance')
    args = parser.parse_args()

    if wait_for_status(args.host, args.port):
        import_resources(args.host, args.port, args.export_file)
    else:
        exit('Cannot setup Kibana objects')
