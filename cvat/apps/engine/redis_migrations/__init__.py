from abc import ABCMeta, abstractmethod


class BaseMigration(metaclass=ABCMeta):

    @staticmethod
    @abstractmethod
    def run() -> None: ...
