import os
import sys
import json
from cli import run

dir = sys.argv[1]
project_id = f"{sys.argv[2]}"
credentials = sys.argv[3] if len(sys.argv) > 3 else 'admin:admin'

labels = [{"name": "frisbee", "color": "#f68e83", "attributes":[]}];
for filename in sorted(os.listdir(dir)):
     filepath = os.path.join(dir, filename)
     run(['--auth', credentials, '--server-host', 'localhost', '--server-port', '8080', 'create', '--labels', json.dumps(labels), '--project_id', project_id, '--image_quality', '100', filename, 'local', filepath])
