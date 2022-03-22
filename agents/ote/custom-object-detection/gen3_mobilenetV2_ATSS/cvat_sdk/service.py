# Copyright (C) 2022 Intel Corporation
#
# SPDX-License-Identifier: MIT

from abc import ABC, abstractmethod
from concurrent.futures import ThreadPoolExecutor
from typing import Optional, Dict, Any, List, Set, TextIO
from xmlrpc.client import Boolean
from fastapi import FastAPI, status, HTTPException
from pydantic import BaseModel
import uvicorn

class Status(BaseModel):
    percent: float
    score: Optional[float]

class _Status(Status):
    ready: bool

class BoundingBox(BaseModel):
    xtl: float
    ytl: float
    xbl: float
    xbr: float
    label: str
    confidence: float

class ServiceError(Exception):
    pass

class ObjectDetectionService(ABC):
    """Object detection service. All methods can be blocking."""
    @property
    @abstractmethod
    def name(self) -> str:
        """Return the name of the service. The property can be used to
        represent the service in UI."""
        pass

    @property
    @abstractmethod
    def description(self) -> Dict[str, Any]:
        """Return the description of the service. The property can be
        used to provide additional information about the service."""
        pass

    @property
    @abstractmethod
    def logger(self) -> Optional[TextIO]:
        """The log file object for the experiment."""
        pass

    @abstractmethod
    def enumerate(self) -> Set[str]:
        """Enumerate all available experiments for the service even they
        are not completed."""
        pass

    @abstractmethod
    def predict(self, experiment: str, frame: str) -> List[BoundingBox]:
        """Predict objects on the frame. It should take a model from the
        experiment and run it on the frame."""
        pass

    @abstractmethod
    def train(self, experiment: str, project: int,
        snapshot: Optional[str] = None) -> None:
        """Train a neural network. It should create a new experiment, get the
        dataset from the provided project and use snapshot for initialization
        if it is specified."""
        pass

    @abstractmethod
    def cancel(self, experiment: str) -> None:
        """Cancel the experiment."""
        pass

    @abstractmethod
    def clean(self, experiment: str) -> None:
        """Delete the experiment. The method call should free disk and memory
        for the experiment. The cancel method will be called automatically if
        the experiment isn't finished yet."""
        pass

    @abstractmethod
    def check(self, experiment: str) -> Status:
        """Get the current status of the experiment. It raises an exception
        if the experiment doesn't exist or it has been finished with an
        error."""
        pass


class _ObjectDetectionServiceProxy:
    def __init__(self, service):
        assert isinstance(service, ObjectDetectionService)
        self.service = service
        # It is important to have here only one worker. Thus all requests
        # will be serialized. We don't need to worry that several train
        # operations will be run in parallel. We don't need to worry that
        # inference and training cannot be run in parallel due to resource
        # constrains.
        self.executor = ThreadPoolExecutor(max_workers=1)
        self.jobs = {}

    @property
    def name(self):
        return self.service.name

    @property
    def description(self):
        return self.service.description

    @property
    def logger(self):
        return self.service.logger

    def enumerate(self):
        return self.service.enumerate()

    def predict(self, experiment: str, frame: str) -> List[BoundingBox]:
        if experiment in self.enumerate():
            return self.service.predict(experiment, frame)
        else:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                detail=f'The {experiment} experiment was not found')

    def train(self, experiment: str, project: int,
        snapshot: Optional[str] = None) -> None:

        if experiment in self.jobs:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                detail=f'The {experiment} experiment was created previously')
        else:
            self.jobs[experiment] = self.executor.submit(self.service.train,
                experiment, project, snapshot)

    def cancel(self, experiment: str) -> None:
        job = self.jobs.get(experiment)
        if job:
            job.cancel()
        else:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                detail=f'The {experiment} experiment was not found')

        self.service.cancel(experiment)

    def clean(self, experiment: str) -> None:
        self.cancel(experiment)
        self.service.clean(experiment)

    def check(self, experiment: str) -> _Status:
        job = self.jobs.get(experiment)
        if job:
            status = self.service.check(experiment)
            ...
        else:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                detail=f'The {experiment} experiment was not found')


def run(service_class, **kwargs):
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

    uvicorn.run(app, host="0.0.0.0", **kwargs)
