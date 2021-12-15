import requests
import json

with requests.Session() as session:
    session.auth = ('admin1', '!Q@W#E$R')

    for obj in ['user', 'project', 'task', 'job', 'organization', 'membership',
        'invitation']:
        response = session.get(f'http://localhost:8080/api/v1/{obj}s')
        with open(f'../assets/{obj}s.json', 'w') as f:
            json.dump(response.json(), f, indent=2, sort_keys=True)

