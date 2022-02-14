import os.path as osp
from config import get_method, ASSETS_DIR
import json

annotations = {}
for obj in ['user', 'project', 'task', 'job', 'organization', 'membership',
    'invitation']:
    response = get_method('admin1', f'{obj}s', page_size='all')
    with open(osp.join(ASSETS_DIR, f'{obj}s.json'), 'w') as f:
        json.dump(response.json(), f, indent=2, sort_keys=True)

    if obj == 'job':
        annotations[obj] = {}
        for job in response.json()['results']:
            jid = job["id"]
            response = get_method('admin1', f'jobs/{jid}/annotations')
            annotations[obj][jid] = response.json()

with open(osp.join(ASSETS_DIR, f'annotations.json'), 'w') as f:
    json.dump(annotations, f, indent=2, sort_keys=True)
