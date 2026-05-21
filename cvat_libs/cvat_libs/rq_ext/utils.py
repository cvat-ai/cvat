class NoOpDeathPenalty:
    def __init__(self, *args, **kwargs) -> None:
        pass

    def __enter__(self) -> "NoOpDeathPenalty":
        return self

    def __exit__(self, *exc) -> bool:
        return False
