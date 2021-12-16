import os
import requests
import json
import config

with requests.Session() as session:
    session.auth = ('admin1', config.USER_PASS)

    for obj in ['user', 'project', 'task', 'job', 'organization', 'membership',
        'invitation']:
        response = session.get(f'http://localhost:8080/api/v1/{obj}s?page_size=all')
        with open(os.path.join(config.ASSETS_DIR, f'{obj}s.json'), 'w') as f:
            json.dump(response.json(), f, indent=2, sort_keys=True)

