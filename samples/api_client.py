import json
import math
import os
import re
import sys
from argparse import ArgumentError, ArgumentParser
from contextlib import ExitStack, suppress
from enum import Enum, auto
from pathlib import Path
from types import SimpleNamespace
from typing import Any, Callable, Dict, List, Optional, Tuple

import cvat_sdk
import yaml
from cvat_sdk.core.helpers import DeferredTqdmProgressReporter, expect_status
from cvat_sdk.core.progress import NullProgressReporter, ProgressReporter
from urllib3 import HTTPResponse

API_KEY_VAR = "CVAT_API_KEY"
API_SESSIONID_VAR = "CVAT_API_SESSIONID"
API_CSRFTOKEN_VAR = "CVAT_API_CSRFTOKEN"


def add_cli_parser_args(parser: ArgumentParser) -> ArgumentParser:
    parser.add_argument("--org", help="Org slug to be used, if provided")
    parser.add_argument(
        "--host", default="localhost", help="Host to connect to (default: %(default)s)"
    )
    parser.add_argument(
        "--port",
        type=int,
        help="Port to connect to (default: 443 for https and 80 for http, 8080 for localhost)",
    )
    parser.add_argument(
        "--login",
        help=f"A 'login:password' pair. "
        f"Default: use {API_KEY_VAR}, {API_SESSIONID_VAR}, {API_CSRFTOKEN_VAR} env vars",
    )

    return parser


def make_client_from_cli(parsed_args: SimpleNamespace) -> cvat_sdk.Client:
    with cvat_sdk.make_client(parsed_args.host, port=parsed_args.port) as client:
        if parsed_args.org:
            client.organization_slug = parsed_args.org

        if parsed_args.login:
            client.login(parsed_args.login.split(":", maxsplit=1))
        else:
            api_key = os.getenv(API_KEY_VAR)
            if api_key:
                client.api_client.set_default_header(
                    "Authorization", f"Token {api_key}"
                )
                client.api_client.cookies["sessionid"] = os.getenv(API_SESSIONID_VAR)
                client.api_client.cookies["csrftoken"] = os.getenv(API_CSRFTOKEN_VAR)
                client.api_client.set_default_header(
                    "X-Csrftoken", os.getenv(API_CSRFTOKEN_VAR)
                )

        return client


class HttpMethod(str, Enum):
    GET = "GET"
    POST = "POST"
    PUT = "PUT"

    def __str__(self):
        return self.value


STDIN = object()
STDOUT = object()


class Commands(str, Enum):
    query = auto()


def parse_header(v: str) -> Tuple[str, str]:
    values = v.split("=", maxsplit=1)
    if len(values) != 2:
        raise ArgumentError(message="Invalid format for the argument. Expected 'x=y'")

    return values


def parse_query_param(v: str) -> Tuple[str, str]:
    values = v.split("=", maxsplit=1)
    if len(values) != 2:
        raise ArgumentError(message="Invalid format for the argument. Expected 'x=y'")

    return values


DEFAULT_TIMEOUT = 300


def decode_response_body(body: bytes, response: HTTPResponse) -> str:
    encoding = "utf-8"
    content_type = response.headers.get("content-type")
    if content_type is not None:
        match = re.search(r"charset=([a-zA-Z\-\d]+)[\s\;]?", content_type)
        if match:
            encoding = match.group(1)

    return response.data.decode(encoding)


def match_endpoint_path(query_endpoint: str, known_endpoint: str) -> bool:
    key_regex = r"\\{?\\d[\\-\\d\\w]*\\}?"
    endpoint_regex = re.sub(r"\{[\-\d\w]*\}", key_regex, known_endpoint)
    return (
        re.fullmatch(endpoint_regex.rstrip("/"), query_endpoint.rstrip("/")) is not None
    )


def get_paginated_collection(
    retrieve_page_callback: Callable[[int], HTTPResponse],
    *,
    start_page: int = 1,
    pbar: Optional[ProgressReporter] = None,
) -> List[Dict[str, Any]]:
    """
    Accumulates results from all the pages, returns results as a parsed JSON objects list
    """

    if pbar is None:
        pbar = NullProgressReporter()

    results = []
    page = start_page
    while True:
        response = retrieve_page_callback(page)
        expect_status(200, response)

        pbar.report_status(page)

        page_data = json.loads(response.data)
        page_contents = page_data.get("results", [])

        results.extend(page_contents)

        if not page_contents or not page_data.get("next"):
            break
        page += 1

    return results


def handle_query_command(args):
    with ExitStack() as es:
        output_file = args.output_file
        if output_file is STDOUT:
            output_file = es.enter_context(sys.stdout)
        else:
            output_file = es.enter_context(
                Path(output_file).open("wb" if args.no_decode_output else "w")
            )

        extra_headers = dict(args.headers)

        body = None
        if args.method in (HttpMethod.POST, HttpMethod.PUT):
            body = args.body
            body_file = args.input_file

            if body_file:
                body = body_file.read_bytes()
            elif body is STDIN:
                with sys.stdin as stream:
                    body = stream.read().encode()

        client = es.enter_context(make_client_from_cli(args))

        if args.show_schema:
            _, response = client.api_client.schema_api.retrieve()

            schema = yaml.safe_load(response.data)

            endpoint_schema = next(
                (
                    s
                    for p, s in schema["paths"].items()
                    if match_endpoint_path(args.endpoint, p)
                ),
                None,
            )
            if not endpoint_schema:
                raise Exception("Can't find matching endpoint")

            endpoint_schema_text = yaml.safe_dump(
                endpoint_schema, default_flow_style=False
            )
            print(endpoint_schema_text, file=output_file)

            return

        _, response = client.api_client.call_api(
            args.endpoint,
            str(args.method),
            query_params=args.query_params,
            header_params=extra_headers,
            body=body,
            _parse_response=False,
            _check_status=not args.allow_failures,
        )

        if args.output_status:
            print("Response status:", response.status, "\n", file=output_file)

        if args.output_headers:
            print("Response headers:", file=output_file)
            print(
                "\n".join(f"{k}={v}" for k, v in response.headers.itermerged()),
                "\n",
                file=output_file,
            )

        response_data = None
        if response.status < 400 and args.all_pages:

            def _page_callback(page: int) -> HTTPResponse:
                query_params = list(args.query_params)
                query_params.append(("page", page))

                _, response = client.api_client.call_api(
                    args.endpoint,
                    str(args.method),
                    query_params=query_params,
                    header_params=extra_headers,
                    _parse_response=False,
                )
                return response

            first_page = json.loads(response.data)
            page_size = len(first_page.get("results", []))
            page_count = math.ceil(first_page.get("count", 0) / (page_size or 1))

            pbar = DeferredTqdmProgressReporter()
            try:
                pbar.start2(total=page_count, desc="Retrieving pages")
                response_data = get_paginated_collection(_page_callback, pbar=pbar)
            finally:
                pbar.finish()

            if not args.no_decode_output:
                # Try parse and format JSON
                with suppress(ValueError):
                    response_data = json.dumps(response_data, indent=2)

        elif not args.no_output_data:
            response_data = response.data

            # We must encode the response for STDOUT anyway
            if not args.no_decode_output or args.output_file is STDOUT:
                response_data = decode_response_body(response_data, response=response)

            if not args.no_decode_output:
                # Try parse and format JSON
                with suppress(ValueError):
                    response_document = json.loads(response_data)
                    response_data = json.dumps(response_document, indent=2)

        if response_data:
            output_file.write(response_data)

    return response.status < 400


def main():
    parser = ArgumentParser()
    add_cli_parser_args(parser)

    sp_arg = "command_name"
    sp = parser.add_subparsers(dest=sp_arg, required=True)

    query_sp = sp.add_parser("query", help="Send a custom request")
    query_sp.set_defaults(**{sp_arg: Commands.query})
    query_sp.add_argument(
        "-X",
        "--method",
        default=HttpMethod.GET,
        help="HTTP method to be used (default: %(default)s)",
    )
    query_sp.add_argument(
        "-b",
        "--body",
        default=STDIN,
        help="Body bytes for POST and PUT requests (default: use stdin). "
        "Cannot be used together with '--input-file'",
    )
    query_sp.add_argument(
        "-f",
        "--input-file",
        type=Path,
        help="File to be used as input data for body. "
        "Cannot be used together with '--body'",
    )
    query_sp.add_argument(
        "-H",
        "--header",
        dest="headers",
        action="append",
        default=[],
        type=parse_header,
        help="Extra headers for the request in the form 'x=y'",
    )
    query_sp.add_argument(
        "-T",
        "--timeout",
        default=DEFAULT_TIMEOUT,
        help="Timeout for the request (default: %(default)s)",
    )
    query_sp.add_argument(
        "-F",
        "--allow-failures",
        action="store_true",
        help="Don't fail on failure response codes " "(4xx, 5xx), default %(default)s",
    )
    query_sp.add_argument("--output-headers", action="store_true")
    query_sp.add_argument("--output-status", action="store_true")
    query_sp.add_argument(
        "-s", "--no-output-data", action="store_true", help="Don't output response data"
    )
    query_sp.add_argument(
        "-o",
        "--output-file",
        default=STDOUT,
        help="Output file to use (default: stdout)",
    )
    query_sp.add_argument(
        "-R",
        "--no-decode-output",
        action="store_true",
        help="Don't parse text from the response data, don't format output JSON",
    )
    query_sp.add_argument(
        "-A",
        "--all-pages",
        action="store_true",
        help="Retrieve all pages from the endpoint, useful for get collection queries",
    )
    query_sp.add_argument(
        "-S",
        "--show-schema",
        action="store_true",
        help="Prints schema for the specified endpoint",
    )
    query_sp.add_argument("endpoint")
    query_sp.add_argument(
        "query_params",
        nargs="*",
        type=parse_query_param,
        help="Query params list in the form 'x=y', can be repeated",
    )

    args = parser.parse_args()

    match getattr(args, sp_arg):
        case Commands.query:
            return handle_query_command(args)
        case _:
            raise Exception("Unknown command")


if __name__ == "__main__":
    sys.exit(main())
