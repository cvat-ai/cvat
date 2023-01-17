# Copyright (C) 2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import argparse
import json
import os
import string
from abc import ABC, abstractmethod
from datetime import datetime
from http.server import BaseHTTPRequestHandler, HTTPServer
from random import choice, random, sample
from urllib.parse import parse_qsl, urlparse


class CommonRequestHandlerClass(BaseHTTPRequestHandler, ABC):
    def _set_headers(self):
        self.send_response(406)
        self.send_header("Content-type", "text/html")
        self.end_headers()
        self.wfile.write(f"Unsupported request. Path: {self.path}".encode("utf8"))

    def get_profile(self, token=None):
        if not token:
            self.send_response(403)
            self.end_headers()
            return
        self.send_response(200)
        self.end_headers()

        self.wfile.write(json.dumps(self.PROFILE).encode("utf-8"))

    @abstractmethod
    def authorize(self, query_params):
        pass

    @abstractmethod
    def generate_access_token(self):
        pass

    def check_query(self, query_params):
        supported_response_type = "code"
        if not "client_id" in query_params:
            self.send_response(400)
            self.wfile.write("Client id not found in query params".encode("utf8"))
            return
        if not "redirect_uri" in query_params:
            self.send_response(400)
            self.wfile.write("Redirect uri not found".encode("utf8"))
            return
        if query_params.get("response_type", "code") != supported_response_type:
            self.send_response(400)
            self.wfile.write(
                "Only code response type is supported by dummy auth server".encode("utf8")
            )
            return

    def do_GET(self):
        u = urlparse(self.path)
        if u.path == self.AUTHORIZE_PATH:
            return self.authorize(dict(parse_qsl(u.query)))
        elif u.path == self.PROFILE_PATH:
            token = self.headers.get("Authorization") or dict(parse_qsl(u.query)).get(
                "access_token"
            )
            return self.get_profile(token)
        self._set_headers()

    def do_POST(self):
        u = urlparse(self.path)
        if u.path == self.TOKEN_PATH:
            return self.generate_access_token()
        self._set_headers()


class GithubRequestHandlerClass(CommonRequestHandlerClass):
    AUTHORIZE_PATH = "/login/oauth/authorize"
    PROFILE_PATH = "/user"
    TOKEN_PATH = "/login/oauth/access_token"

    CODE_LENGTH = 20
    AUTH_TOKEN_LENGTH = 40

    LOGIN = "test-user"
    UID = int(random() * 100)

    # demo profile not including all information returned by github
    PROFILE = {
        "login": LOGIN,
        "id": UID,
        "avatar_url": f"https://avatars.github.com/u/{UID}",
        "url": f"https://api.github.com/users/{LOGIN}",
        "html_url": f"https://github.com/{LOGIN}",
        "type": "User",
        "site_admin": False,
        "name": "Test User",
        "location": "Germany, Munich",
        "email": "github.user@test.com",
        "hireable": None,
        "created_at": str(datetime.now()),
        "updated_at": str(datetime.now()),
        "two_factor_authentication": False,
    }

    def authorize(self, query_params):
        super().check_query(query_params)
        self.send_response(302)
        redirect_to = query_params["redirect_uri"]
        generated_code = "".join(sample(string.ascii_lowercase + string.digits, self.CODE_LENGTH))

        # add query params
        new_query = (
            f"?code={generated_code}&state={query_params['state']}&"
            f"scope={query_params['scope']}&promt=none"
        )
        redirect_to += new_query
        self.send_header("Location", redirect_to)
        self.send_header("Content-type", "text/html")
        self.end_headers()

    def generate_access_token(self):
        self.send_response(200)
        self.send_header("Content-type", "application/x-www-form-urlencoded; charset=utf-8")
        generated_token = "".join(
            sample(string.ascii_letters + string.digits, self.AUTH_TOKEN_LENGTH)
        )
        scope = "read:user,user:email"
        content = f"access_token={generated_token}&scope={scope}&token_type=bearer".encode("utf-8")
        self.end_headers()
        self.wfile.write(content)


class GoogleRequestHandlerClass(CommonRequestHandlerClass):
    AUTHORIZE_PATH = "/o/oauth2/auth"
    PROFILE_PATH = "/oauth2/v1/userinfo"
    TOKEN_PATH = "/o/oauth2/token"

    CODE_LENGTH = 70  # in real case 256 bytes
    AUTH_TOKEN_LENGTH = 100  # in real case 2048 bytes

    UID = int(random() * 100)

    # demo profile not including all information returned by google
    PROFILE = {
        "id": UID,
        "email": "google.user@gmail.com",
        "verified_email": True,
        "name": "Test User",
        "given_name": "Test",
        "family_name": "User",
        "picture": f"https://avatars.google.com/u/{UID}",
        "locale": "en",
    }

    def authorize(self, query_params):
        super().check_query(query_params)
        self.send_response(302)
        redirect_to = query_params["redirect_uri"]
        symbols = string.ascii_letters + string.digits
        generated_code = "".join([choice(symbols) for i in range(self.CODE_LENGTH)])

        # add query params
        new_query = (
            f"?code={generated_code}&state={query_params['state']}&"
            f"scope={query_params['scope']}&promt=none"
        )
        redirect_to += new_query
        self.send_header("Location", redirect_to)
        self.send_header("Content-type", "text/html")
        self.end_headers()

    def generate_access_token(self):
        self.send_response(200)
        self.send_header("Content-type", "application/json; charset=utf-8")
        symbols = string.ascii_letters + string.digits + string.punctuation
        generated_token = "".join([choice(symbols) for i in range(self.AUTH_TOKEN_LENGTH)])
        id_token = "".join([choice(symbols) for i in range(self.AUTH_TOKEN_LENGTH)])
        scope = "https://www.googleapis.com/auth/userinfo.profile openid https://www.googleapis.com/auth/userinfo.email"
        content = {
            "access_token": generated_token,
            "expires_in": 3600,  # 1 h
            "scope": scope,
            "token_type": "Bearer",
            "id_token": id_token,
        }
        self.end_headers()
        self.wfile.write(json.dumps(content).encode("utf-8"))


class AuthServer:
    SERVER_HOST = "0.0.0.0"

    def run(self):
        print(f"Starting dummy authentication server on {self.SERVER_HOST}, {self.SERVER_PORT}")
        HTTPServer((self.SERVER_HOST, self.SERVER_PORT), self.REQUEST_HANDLER_CLASS).serve_forever()


class GoogleAuthServer(AuthServer):
    SERVER_PORT = int(os.environ.get("GOOGLE_SERVER_PORT", "4320"))
    REQUEST_HANDLER_CLASS = GoogleRequestHandlerClass


class GithubAuthServer(AuthServer):
    SERVER_PORT = int(os.environ.get("GITHUB_SERVER_PORT", "4321"))
    REQUEST_HANDLER_CLASS = GithubRequestHandlerClass


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--server", choices=["google", "github"], type=str, default="google")
    server = parser.parse_args().server
    auth_servers = {
        "google": GoogleAuthServer,
        "github": GithubAuthServer,
    }
    server_class = auth_servers[server]
    server_class().run()
