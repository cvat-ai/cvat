from pathlib import PosixPath

def path_to_module(path: PosixPath) -> str:
    return str(path).removesuffix(".py").replace("/", ".")