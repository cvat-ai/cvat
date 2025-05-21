from typing import Protocol


class OrderStrategy(Protocol):
    def __call__(self, key_path: str) -> bool: ...


always_check_order: OrderStrategy = lambda _: True
never_check_order: OrderStrategy = lambda _: False
