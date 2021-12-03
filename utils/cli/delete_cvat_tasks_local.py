import os
import sys
import json
from cli import run, config_log
import cli
import logging
import requests
import sys
from http.client import HTTPConnection
from core.core import CLI, CVAT_API_V1
from core.definition import parser

def get_auth(s):
    """ Parse USER[:PASS] strings and prompt for password if none was
    supplied. """
    user, _, password = s.partition(':')
    password = password or os.environ.get('PASS') or getpass.getpass()
    return user, password

def config_log(level):
    log = logging.getLogger('core')
    log.addHandler(logging.StreamHandler(sys.stdout))
    log.setLevel(level)
    if level <= logging.DEBUG:
        HTTPConnection.debuglevel = 1
        
file = sys.argv[1]
#project_id = f"{sys.argv[2]}"
#f = open(sys.argv[1], "r")
#f.close()
list = os.listdir(file)
'''
for t in f.readlines():
    if t.find('\n') >= 0:
        t = t[:t.find('\n')]
    list.append(t)
'''
args = dict (
    server_host = 'localhost',
    server_port = '8080',
    https = False,
    auth = 'vsevolod:Boston21',
    loglevel = 20

)
config_log(args['loglevel'])
with requests.Session() as session:
    api = CVAT_API_V1('%s:%s' % (args['server_host'], args['server_port']), args['https'])
    cli = CLI(session, api, get_auth(args['auth']))
    tasks = cli.tasks_list(1)
    task_ids = []
    print(list)
    for t in tasks:
        if (t['name'] in list):
            task_ids.append(t['id'])
        #print(t['id'], t['name'])
    print(task_ids)
    cli.tasks_delete(task_ids)
#f.close()
'''
run(['--auth', 'vsevolod:Boston21', '--server-host', 'localhost', '--server-port', '8080', 'ls'])
'''