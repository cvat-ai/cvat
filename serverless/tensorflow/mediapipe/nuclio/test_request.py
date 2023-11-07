import base64
import json

import requests
api = 'http://127.0.0.1:12747' # this is found on the nuclio dashboard
#image_file = 'tadasana.jpg'
image_file = "7-best-yoga-poses-to-soothe-back-pain-02-1440x810.jpg"

with open(image_file, "rb") as f:
    im_bytes = f.read()
im_b64 = base64.b64encode(im_bytes).decode("utf8")

headers = {'Content-type': 'application/json', 'Accept': 'text/plain'}

payload = json.dumps({"image": im_b64, "other_key": "value"})
print(payload)
response = requests.post(api, data=payload, headers=headers)
try:
    data = response.json()
    print(data)
except requests.exceptions.RequestException:
    print(response.text)