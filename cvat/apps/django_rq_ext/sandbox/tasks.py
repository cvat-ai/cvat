import time


def send_webhook_task(url: str, method: str = "GET", payload: dict | None = None) -> dict:
    time.sleep(10)
    return {
        "status_code": 20,
        "url": url,
        "method": method,
    }
