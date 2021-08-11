#!/usr/bin/env python3

import requests
import glob

for filename in glob.glob("*.json"):
    with open(filename, "r") as f:
        package = filename.split('_')[0]
        data = f.read()
        print(f"RUN: data.{package}.allow {data}")
        r = requests.post(f"http://localhost:8181/v1/data/{package}/allow",
            data=data)
        print(r.text)
