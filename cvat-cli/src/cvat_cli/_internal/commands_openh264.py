# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import argparse
import types

from .command_base import CommandGroup
from .common import CriticalError

# The same text as cvat_mp4_h264.commands.openh264.OPENH264_NOTICE, repeated here
# so that the help shows it even when cvat-mp4-h264 is not installed.
_OPENH264_NOTICE = "OpenH264 Video Codec provided by Cisco Systems, Inc."

COMMANDS = CommandGroup(
    description=(
        "Manage the OpenH264 library that is used to read video tasks. " + _OPENH264_NOTICE
    )
)


def _import_package() -> types.ModuleType:
    try:
        from cvat_mp4_h264.commands import openh264
    except ImportError as e:
        raise CriticalError(
            "Reading video tasks requires the video extra: pip install 'cvat-sdk[video]'"
        ) from e

    return openh264


def _run_package_command(command: str) -> None:
    openh264 = _import_package()

    try:
        print(openh264.run_command(command=command))
    except (openh264.VideoDecoderError, openh264.OpenH264InstallError) as e:
        raise CriticalError(str(e)) from e


@COMMANDS.command_class("install")
class OpenH264Install:
    needs_client = False
    description = (
        "Download Cisco's OpenH264 library for this system into the user data directory "
        "and check that it loads. " + _OPENH264_NOTICE
    )

    def configure_parser(self, parser: argparse.ArgumentParser) -> None:
        pass

    def execute(self, args: argparse.Namespace) -> None:
        _run_package_command(command="install")


@COMMANDS.command_class("remove")
class OpenH264Remove:
    needs_client = False
    description = (
        "Delete the OpenH264 library downloaded by the install command. " + _OPENH264_NOTICE
    )

    def configure_parser(self, parser: argparse.ArgumentParser) -> None:
        pass

    def execute(self, args: argparse.Namespace) -> None:
        _run_package_command(command="remove")


@COMMANDS.command_class("status")
class OpenH264Status:
    needs_client = False
    description = "Show which OpenH264 library is used to read video tasks."

    def configure_parser(self, parser: argparse.ArgumentParser) -> None:
        pass

    def execute(self, args: argparse.Namespace) -> None:
        _run_package_command(command="status")
