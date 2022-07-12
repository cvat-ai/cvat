from enum import Enum


class FrameQuality(Enum):
    COMPRESSED = 0
    ORIGINAL = 100


class FrameType(Enum):
    BUFFER = 0
    PIL = 1
    NUMPY_ARRAY = 2
