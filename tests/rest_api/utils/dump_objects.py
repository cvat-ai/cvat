import os.path as osp
from config import get_method, ASSETS_DIR
import json

for obj in ['user', 'project', 'task', 'job', 'organization', 'membership',
    'invitation']:
    response = get_method('admin1', obj, page_size='all')
    with open(osp.join(ASSETS_DIR, f'{obj}s.json'), 'w') as f:
        json.dump(response.json(), f, indent=2, sort_keys=True)
