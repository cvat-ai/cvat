import re
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, HTTPServer

TARGET_HOST = '0.0.0.0'
TARGET_PORT = 2020
PAYLOAD_ENDPOINT = 'payload'

class RequestHandler(BaseHTTPRequestHandler):
    TARGET_URL_PATTERN = re.compile(r'/' + PAYLOAD_ENDPOINT)

    def do_POST(self):
        if not re.search(self.TARGET_URL_PATTERN, self.path):
            return

        self.send_response(HTTPStatus.OK)
        self.end_headers()

        request_body = self.rfile.read(int(self.headers['content-length']))
        self.wfile.write(request_body)

def main():
    webhook_receiver = HTTPServer((TARGET_HOST, TARGET_PORT), RequestHandler)
    webhook_receiver.serve_forever()

if __name__ == '__main__':
    main()
