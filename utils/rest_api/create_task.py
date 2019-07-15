import argparse
from argparse import ArgumentParser
import getpass
import requests
from pprint import pprint
import json
import logging
import http.client as http_client
import time

import urllib3
# to suppress warnings that "Unverified HTTPS request is being made"
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

def set_http_verbose():
    http_client.HTTPConnection.debuglevel = 1

    logging.basicConfig()
    logging.getLogger().setLevel(logging.DEBUG)
    requests_log = logging.getLogger("requests.packages.urllib3")
    requests_log.setLevel(logging.DEBUG)
    requests_log.propagate = True

def print_hrule(name = ""):
    if name:
        print("=" * 5 + " " + str(name) + " " + "=" * 80)
    else:
        print("=" * 80)

def get_user_password_from_file(password_file):
    with open(password_file) as f:
        for line in f:
            line = line.strip()
            if ':' not in line or line.startswith('#'):
                continue
            chunks = line.split(':')
            assert len(chunks) == 2, "Wrong password_file {}".format(password_file)
            return chunks
    raise RuntimeError("Wrong password file")

def get_user_password_from_input():
    user = getpass.getuser()
    answer = input("User = {}? [Y/n]: ".format(user))
    if answer and not answer.lower().startswith('y'):
        user = input('User: ')

    password = getpass.getpass()
    return user, password

def create_task(path, bug_tracker, cur_user_info,
        user, password, labels_descr, cvat_uri):
    res = {"status": False, "path": path}

    data_task_create = {
        "name": path,
        "owner": cur_user_info["id"],
        "image_quality": 75,
        "bug_tracker": bug_tracker,
        "labels": []
    }
    assert isinstance(labels_descr, list)
    data_task_create["labels"] = labels_descr


    print("")
    print_hrule("BEGIN: Create task")
    task_creation_resp = requests.post(cvat_uri + '/api/v1/tasks', verify=False,
            auth=(user, password), json=data_task_create)
    print_hrule("END: Create task")

    print("task_creation_resp.status_code =", task_creation_resp.status_code)
    print("task_creation_resp.json =")
    pprint(task_creation_resp.json())
    if task_creation_resp.status_code != 201:
        print("CANNOT CREATE TASK")
        return res
    task_id = task_creation_resp.json()["id"]
    res["task_id"] = task_id

    data_server_files = {
            "server_files[0]": [path]
    }

    print("")
    print_hrule("BEGIN: Point video to task")
    server_files_resp = requests.post(cvat_uri + '/api/v1/tasks/{}/data'.format(task_id),
            verify=False, auth=(user, password), data=data_server_files)
    print_hrule("END: Point video to task")

    print("server_files_resp.status_code =", server_files_resp.status_code)
    print("server_files_resp.json =")
    pprint(server_files_resp.json())
    if int(server_files_resp.status_code) not in (201, 202):
        print("CANNOT SET SERVER FILES")
        return res

    print("Task for path='{}' is added".format(path))

    status_resp_json = {}
    while True:
        print_hrule("BEGIN: Status")
        status_files_resp = requests.get(
                cvat_uri + '/api/v1/tasks/{}/status'.format(task_id), verify=False,
                auth=(user, password))
        print_hrule("END: Status")

        print("status_files_resp.status_code =", status_files_resp.status_code)
        if status_files_resp.status_code != 200:
            print("CANNOT GET STATUS")
            return res
        status_resp_json = status_files_resp.json()
        print("status_files_resp.json =")
        pprint(status_resp_json)
        if status_resp_json.get('state', "") in ("Finished", "Failed"):
            break

        time.sleep(1)

    if status_resp_json.get('state', "") == "Finished":
        print("Task is created and video is decoded for path = '{}'".format(path))
    else:
        print("ERROR DURING CREATION OF THE TASK '{}'".format(path))
        return res

    print_hrule("BEGIN: Get Job Id")
    job_id_resp = requests.get(cvat_uri + '/api/v1/tasks/{}'.format(task_id),
            verify=False, auth=(user, password))
    print_hrule("END: Get Job Id")
    if job_id_resp.status_code != 200:
        print("CANNOT GET JOB ID, status code =", job_id_resp.status_code)
        pprint(job_id_resp.json())
        return res
    job_id_json = job_id_resp.json()
    pprint(job_id_json)
    assert "segments" in job_id_json
    segments = list(job_id_json["segments"])
    assert segments
    assert len(segments) == 1
    assert "jobs" in segments[0]
    jobs = segments[0]["jobs"]
    assert len(jobs) == 1
    job_id = jobs[0]["id"]
    url_for_job = cvat_uri + "/?id={}".format(job_id)
    print("url_for_job =", url_for_job)
    res["url_for_job"] = url_for_job
    res["status"] = True
    return res

def print_table_for_jira(list_all_done_res):
    print_hrule("CURRENT RESULTS:")
    for res in list_all_done_res:
        assert res["status"]
        print("|{}|[{}]|".format(res["path"], res["url_for_job"]))
    print_hrule("END OF CURRENT RESULTS")

def main():
    epilog_help_string = ("""
    Please, note that command line parameter --labels-config should point to a json file
    that describes labels for a task.

    Example 1:
        [
            {
                "name": "obj",
                "attributes": []
            }
        ]
    -- this will create for the task one bbox property with name 'obj' without attributes,
    it is equivalent to CVAT label string 'obj'

    Example 2:
        [
            {
                "name": "obj",
                "attributes": [
                                   {
                                      "name": "class",
                                      "mutable": false,
                                      "input_type": "text",
                                      "default_value": "",
                                      "values": [""]
                                   }
                ]
            }
        ]
    -- this will create for the task one bbox property with name 'obj' with one
    non-mutable text attribute 'class', it is equivalent to CVAT label string
    'obj @text=class:""'
    """)

    parser = ArgumentParser(description = "Script that receives list of videos and to "
            "creates CVAT tasks (one for the video), uploads the video to the task from "
            "the share, and prints the markdown table of created tasks that may be "
            "inserted into the corresponding ticket on a bug tracker.",
            epilog=epilog_help_string,
            formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--password-file", dest="password_file",
            help="Path to a password file: text file with one line in "
            "format <username>:<password>")
    parser.add_argument("--file-list", dest="filelist", required=True,
            help="Path to a text file each line of which is a path to a video to create "
            "task. The videos should be on the file share connected to CVAT, the paths "
            "should be relative to the root folder of the CVAT file share. "
            "The name of each created task will be equal to the corresponding relative "
            "path.")
    parser.add_argument("--bug-tracker", dest="bug_tracker", required=True,
            help="URI of the bug tracker ticket that will be pointed by new tasks.")
    parser.add_argument("-v", "--verbose", action="store_true",
            help="If HTTP requests should be logged.")
    parser.add_argument("--labels-config", dest="labels_config", required=True,
            help="Path to a json file that contains structure that should be used as "
            "a description of labels for the task.")
    parser.add_argument("--cvat-server", dest="cvat_server", default="localhost:8080",
            help="URI of the CVAT server (without 'https://' prefix).")

    args = parser.parse_args()

    print("labels_config =", args.labels_config)
    labels_descr = []
    with open(args.labels_config) as f_labels_config:
        labels_descr = json.load(f_labels_config)

    assert type(labels_descr) is list
    print("labels_descr as json =")
    print(json.dumps(labels_descr, indent=4))
    print("labels_descr as python =")
    pprint(labels_descr)

    if args.verbose:
        set_http_verbose()

    if args.password_file:
        user, password = get_user_password_from_file(args.password_file)
    else:
        user, password = get_user_password_from_input()

    cvat_uri = "https://" + args.cvat_server
    print_hrule("BEGIN: User info")
    resp = requests.get(cvat_uri + '/api/v1/users/self', verify=False,
            auth=(user, password))
    print_hrule("END: User info")

    if resp.status_code != 200:
        print("Wrong username/password or wrong CVAT uri '{}'".format(cvat_uri))
        return False

    cur_user_info = resp.json()
    print("Get user info:")
    pprint(cur_user_info)

    list_all_done_res = []
    list_failed_videos = []
    with open(args.filelist) as f_filelist:
        for path in f_filelist:
            path = path.strip()
            assert not path.startswith(".")

            print("path = '{}'".format(path))

            res = create_task(path, args.bug_tracker, cur_user_info, user,
                    password, labels_descr=labels_descr, cvat_uri=cvat_uri)
            print("")
            if res["status"]:
                print("DONE")
                list_all_done_res.append(res)
            else:
                print("FAILED {}!!!".format(path))
                list_failed_videos.append(path)
            print("")
            print_table_for_jira(list_all_done_res)
            print("")
            print("")
    print_table_for_jira(list_all_done_res)
    print("ALL DONE")
    print("")

    print("Failed videos:")
    for p in list_failed_videos:
        print("    ", p)



if __name__ == '__main__':
    main()
