# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import argparse
import json
import textwrap
from collections.abc import Sequence

import cvat_sdk.auto_annotation as cvataa
from cvat_sdk import Client

from .agent import FUNCTION_KIND_DETECTOR, FUNCTION_PROVIDER_NATIVE, run_agent
from .command_base import CommandGroup
from .common import FunctionLoader, configure_function_implementation_arguments

COMMANDS = CommandGroup(description="Perform operations on CVAT lambda functions.")


@COMMANDS.command_class("create-native")
class FunctionCreateNative:
    description = textwrap.dedent(
        """\
        Create a CVAT function that can be powered by an agent running the given local function.
        """
    )

    def configure_parser(self, parser: argparse.ArgumentParser) -> None:
        parser.add_argument(
            "name",
            help="a human-readable name for the function",
        )

        configure_function_implementation_arguments(parser)

    def execute(
        self,
        client: Client,
        *,
        name: str,
        function_loader: FunctionLoader,
    ) -> None:
        function = function_loader.load()

        remote_function = {
            "provider": FUNCTION_PROVIDER_NATIVE,
            "name": name,
        }

        if isinstance(function.spec, cvataa.DetectionFunctionSpec):
            remote_function["kind"] = FUNCTION_KIND_DETECTOR
            remote_function["labels_v2"] = []

            for label_spec in function.spec.labels:
                if getattr(label_spec, "sublabels", None):
                    raise cvataa.BadFunctionError(
                        f"Function label {label_spec.name!r} has sublabels. This is currently not supported."
                    )

                remote_function["labels_v2"].append(
                    {
                        "name": label_spec.name,
                    }
                )
        else:
            raise cvataa.BadFunctionError(
                f"Unsupported function spec type: {type(function.spec).__name__}"
            )

        _, response = client.api_client.call_api(
            "/api/functions",
            "POST",
            body=remote_function,
        )

        remote_function = json.loads(response.data)

        client.logger.info(
            "Created function #%d: %s", remote_function["id"], remote_function["name"]
        )
        print(remote_function["id"])


@COMMANDS.command_class("delete")
class FunctionDelete:
    description = "Delete a list of functions, ignoring those which don't exist."

    def configure_parser(self, parser: argparse.ArgumentParser) -> None:
        parser.add_argument("function_ids", type=int, help="IDs of functions to delete", nargs="+")

    def execute(self, client: Client, *, function_ids: Sequence[int]) -> None:
        for function_id in function_ids:
            _, response = client.api_client.call_api(
                "/api/functions/{function_id}",
                "DELETE",
                path_params={"function_id": function_id},
                _check_status=False,
            )

            if 200 <= response.status <= 299:
                client.logger.info(f"Function #{function_id} deleted")
            elif response.status == 404:
                client.logger.warning(f"Function #{function_id} not found")
            else:
                client.logger.error(
                    f"Failed to delete function #{function_id}: "
                    f"{response.msg} (status {response.status})"
                )


@COMMANDS.command_class("run-agent")
class FunctionRunAgent:
    description = "Process requests for a given native function, indefinitely."

    def configure_parser(self, parser: argparse.ArgumentParser) -> None:
        parser.add_argument(
            "function_id",
            type=int,
            help="ID of the function to process requests for",
        )

        configure_function_implementation_arguments(parser)

        parser.add_argument(
            "--burst",
            action="store_true",
            help="process all pending requests and then exit",
        )

    def execute(
        self,
        client: Client,
        *,
        function_id: int,
        function_loader: FunctionLoader,
        burst: bool,
    ) -> None:
        run_agent(client, function_loader, function_id, burst=burst)
