# NOTE @sosov: intentionally has zero Django dependencies — used to debug the
# custom ThreadPoolWorker in rq_ext/. Keep this module importable from a bare
# Python process.

import requests


def send_webhook_task(url: str, method: str = "GET", payload: dict | None = None) -> dict:
    response = requests.request(method, url, json=payload, timeout=10)
    return {
        "status_code": response.status_code,
        "url": url,
        "method": method,
    }
