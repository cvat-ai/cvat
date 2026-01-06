from pathlib import Path


def path_to_module(path: Path) -> str:
    return str(path).removesuffix(".py").replace("/", ".")
