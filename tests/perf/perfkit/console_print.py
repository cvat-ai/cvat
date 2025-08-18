# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT
import typer
from rich.console import Console

console = Console()


def exit_with_error(msg: str, bold: bool = False) -> None:
    color = "bold red" if bold else "red"
    console.print(f"[{color}]{msg}[/{color}]")
    raise typer.Exit(1)


def print_info(msg: str, bold: bool = False) -> None:
    color = "bold cyan" if bold else "cyan"
    console.print(f"[{color}]{msg}[/{color}]")


def print_success(msg: str, bold: bool = False) -> None:
    color = "bold green" if bold else "green"
    console.print(f"[{color}]{msg}[/{color}]")


def print_error(msg: str, bold: bool = False) -> None:
    color = "bold red" if bold else "red"
    console.print(f"[{color}]{msg}[/{color}]")
