# Copyright (C) 2022 Intel Corporation
#
# SPDX-License-Identifier: MIT

from concurrent.futures import ThreadPoolExecutor
from typing import Optional, Dict, Any, List, Literal
from fastapi import FastAPI, status
from pydantic import BaseModel

class Status(BaseModel):
    percent: float
    eta: float
    error: str
    state: Literal['idle', 'running', 'canceled', 'done']

class BoundingBox(BaseModel):
    xtl: float
    ytl: float
    xbl: float
    xbr: float
    label: str
    confidence: float

class ObjectDetectionService:
    @property
    def name(self) -> str:
        pass

    @property
    def description(self) -> Dict[str, Any]:
        pass

    def predict(self, experiment: str, frame: str) -> List[BoundingBox]:
        pass

    def train(self, experiment: str, project: int,
        snapshot: Optional[str] = None) -> None:
        pass

    def cancel(self, experiment: str) -> None:
        pass

    def clean(self, experiment: str) -> None:
        pass

    def status(self, experiment: str) -> Status:
        pass


class _ObjectDetectionServiceProxy(ObjectDetectionService):
    def __init__(self, service):
        assert isinstance(service, ObjectDetectionService)
        self.service = service
        # It is important to have here only one worker. Thus all requests
        # will be serialized. We don't need to worry that several train
        # operations will be run in parallel. We don't need to worry that
        # inference and training cannot be run in parallel due to resource
        # constrains.
        self.executor = ThreadPoolExecutor(max_workers=1)
        self.futures = {}

    @property
    def name(self) -> str:
        return self.service.name

    @property
    def description(self) -> Dict[str, Any]:
        return self.service.description

    def predict(self, experiment: str, frame: str) -> List[BoundingBox]:
        self.futures[experiment] = self.executor.submit(self.service.predict,
            experiment, frame)

    def train(self, experiment: str, project: int,
        snapshot: Optional[str] = None) -> None:

        self.futures[experiment] = self.executor.submit(self.service.train,
            experiment, project, snapshot)

    def cancel(self, experiment: str) -> None:
        future = self.futures.get(experiment)
        if future:
            future.cancel()

        self.service.cancel(experiment)

    def clean(self, experiment: str) -> None:
        future = self.futures.get(experiment)
        if future and not future.done():
            self.cancel(experiment)

        self.service.clean(experiment)

    def status(self, experiment: str) -> Status:
        return self.service.status(experiment)


def register(service_class):
    app = FastAPI()

    if issubclass(service_class, ObjectDetectionService):
        service = _ObjectDetectionServiceProxy(service_class())

        def root():
            return {
                'name': service.name,
                **service.description
            }

        app.get('/')(root)
        app.get('/experiments/{experiment}/predictions',
            status_code=status.HTTP_202_ACCEPTED)(service.predict)
        app.put('/experiments/{experiment}',
            status_code=status.HTTP_202_ACCEPTED)(service.train)
        app.get('/experiments/{experiment}/status')(service.status)
        app.delete('/experiments/{experiment}/status')(service.cancel)
        app.delete('/experiments/{experiment}')(service.clean)
    else:
        raise NotImplementedError(f'{service_class.__name__} is not supported')

    return app
