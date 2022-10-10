# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import os
import re
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, HTTPServer


class RequestHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        TARGET_URL_PATTERN = re.compile(r"/" + os.getenv("PAYLOAD_ENDPOINT"))
        if not re.search(TARGET_URL_PATTERN, self.path):
            return

        self.send_response(HTTPStatus.OK)
        self.end_headers()

        request_body = self.rfile.read(int(self.headers["content-length"]))
        self.wfile.write(request_body)


def main():
    TARGET_HOST = "0.0.0.0"
    TARGET_PORT = int(os.getenv("SERVER_PORT"))

    webhook_receiver = HTTPServer((TARGET_HOST, TARGET_PORT), RequestHandler)
    webhook_receiver.serve_forever()


if __name__ == "__main__":
    main()
