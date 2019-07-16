import argparse
from argparse import ArgumentParser
import getpass
import requests
from pprint import pformat
import json
import logging as log
import http.client as http_client
import time

import urllib3
# to suppress warnings that "Unverified HTTPS request is being made"
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

def set_http_verbose():
    http_client.HTTPConnection.debuglevel = 1

    log.getLogger().setLevel(log.DEBUG)
    requests_log = log.getLogger("requests.packages.urllib3")
    requests_log.setLevel(log.DEBUG)
    requests_log.propagate = True

def log_hrule(name = ""):
    if name:
        log.info("=" * 5 + " " + str(name))
    else:
        log.info("=" * 5)

def log_pformat(name, val):
    log.info(name + "\n" + pformat(val))

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


    log.info("")
    log_hrule("BEGIN: Create task")
    task_creation_resp = requests.post(cvat_uri + '/api/v1/tasks', verify=False,
            auth=(user, password), json=data_task_create)
    log_hrule("END: Create task")

    log.info("task_creation_resp.status_code = {}".format(task_creation_resp.status_code))
    log_pformat("task_creation_resp.json =", task_creation_resp.json())
    if task_creation_resp.status_code != 201:
        log.error("CANNOT CREATE TASK")
        return res
    task_id = task_creation_resp.json()["id"]
    res["task_id"] = task_id

    data_server_files = {
            "server_files[0]": [path]
    }

    log.info("")
    log_hrule("BEGIN: Point video to task")
    server_files_resp = requests.post(cvat_uri + '/api/v1/tasks/{}/data'.format(task_id),
            verify=False, auth=(user, password), data=data_server_files)
    log_hrule("END: Point video to task")

    log.info("server_files_resp.status_code={}".format(server_files_resp.status_code))
    log_pformat("server_files_resp.json =", server_files_resp.json())
    if int(server_files_resp.status_code) not in (201, 202):
        log.error("CANNOT SET SERVER FILES")
        return res

    log.info("Task for path='{}' is added".format(path))

    status_resp_json = {}
    while True:
        log_hrule("BEGIN: Status")
        status_files_resp = requests.get(
                cvat_uri + '/api/v1/tasks/{}/status'.format(task_id), verify=False,
                auth=(user, password))
        log_hrule("END: Status")

        log.info("status_files_resp.status_code={}".format(status_files_resp.status_code))
        if status_files_resp.status_code != 200:
            log.error("CANNOT GET STATUS")
            return res
        status_resp_json = status_files_resp.json()
        log_pformat("status_files_resp.json =", status_resp_json)
        if status_resp_json.get('state', "") in ("Finished", "Failed"):
            break

        time.sleep(1)

    if status_resp_json.get('state', "") == "Finished":
        log.info("Task is created and video is decoded for path = '{}'".format(path))
    else:
        log.error("ERROR DURING CREATION OF THE TASK '{}'".format(path))
        return res

    log_hrule("BEGIN: Get Job Id")
    job_id_resp = requests.get(cvat_uri + '/api/v1/tasks/{}'.format(task_id),
            verify=False, auth=(user, password))
    log_hrule("END: Get Job Id")
    if job_id_resp.status_code != 200:
        log.error("CANNOT GET JOB ID, status code={}".format(job_id_resp.status_code))
        log_pformat("resp =", job_id_resp.json())
        return res
    job_id_json = job_id_resp.json()
    log_pformat("job_id_json =", job_id_json)
    assert "segments" in job_id_json
    segments = list(job_id_json["segments"])
    assert segments
    assert len(segments) == 1
    assert "jobs" in segments[0]
    jobs = segments[0]["jobs"]
    assert len(jobs) == 1
    job_id = jobs[0]["id"]
    url_for_job = cvat_uri + "/?id={}".format(job_id)
    log.info("url_for_job={}".format(url_for_job))
    res["url_for_job"] = url_for_job
    res["status"] = True
    return res

def print_result_table(list_all_done_res):
    all_res_strings = []
    for res in list_all_done_res:
        assert res["status"]
        all_res_strings.append("|{}|[{}]|".format(res["path"], res["url_for_job"]))
    res_str = "\n".join(all_res_strings)
    log.info("CURRENT RESULTS =\n" + res_str)
    print()
    print("CURRENT RESULTS:")
    print(res_str)
    print("END OF CURRENT RESULTS")
    print()

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

    LOG_FORMAT = '%(levelno)s|%(asctime)s|%(filename)s:%(lineno)d|%(message)s'
    log.basicConfig(format=LOG_FORMAT)
    log.getLogger().setLevel(log.INFO)
    if args.verbose:
        set_http_verbose()

    log.info("labels_config={}".format(args.labels_config))
    labels_descr = []
    with open(args.labels_config) as f_labels_config:
        labels_descr = json.load(f_labels_config)

    assert type(labels_descr) is list
    log.info("labels_descr as json =")
    log.info(json.dumps(labels_descr, indent=4))
    log_pformat("labels_descr as python =", labels_descr)

    if args.password_file:
        user, password = get_user_password_from_file(args.password_file)
    else:
        user, password = get_user_password_from_input()

    cvat_uri = "https://" + args.cvat_server
    log_hrule("BEGIN: User info")
    resp = requests.get(cvat_uri + '/api/v1/users/self', verify=False,
            auth=(user, password))
    log_hrule("END: User info")

    if resp.status_code != 200:
        log.error("Wrong username/password or wrong CVAT uri '{}'".format(cvat_uri))
        return False

    cur_user_info = resp.json()
    log_pformat("Get user info:", cur_user_info)

    list_all_done_res = []
    list_failed_videos = []
    with open(args.filelist) as f_filelist:
        for path in f_filelist:
            path = path.strip()
            assert not path.startswith(".")

            log.info("path = '{}'".format(path))

            res = create_task(path, args.bug_tracker, cur_user_info, user,
                    password, labels_descr=labels_descr, cvat_uri=cvat_uri)
            log.info("")
            if res["status"]:
                log.info("DONE")
                list_all_done_res.append(res)
            else:
                log.warning("FAILED {}!!!".format(path))
                list_failed_videos.append(path)
            log.info("")
            print_result_table(list_all_done_res)
            log.info("")
            log.info("")
    print_result_table(list_all_done_res)
    log.info("ALL DONE")
    log.info("")

    if list_failed_videos:
        log.warning("Failed videos:")
        for p in list_failed_videos:
            log.warning("    " + p)



if __name__ == '__main__':
    main()
