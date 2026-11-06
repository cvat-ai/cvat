# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

"""ctypes mirrors of the OpenH264 C API this package uses.

Names follow the OpenH264 headers (``codec_api.h``, ``codec_app_def.h``, ``codec_def.h``)
exactly, so every declaration can be checked side by side against its C original.
"""

import ctypes

from .exceptions import VideoDecoderUnavailableError


# codec_app_def.h
class OpenH264Version(ctypes.Structure):
    _fields_ = [
        ("uMajor", ctypes.c_uint),
        ("uMinor", ctypes.c_uint),
        ("uRevision", ctypes.c_uint),
        ("uReserved", ctypes.c_uint),
    ]


# codec_app_def.h
class SVideoProperty(ctypes.Structure):
    _fields_ = [("size", ctypes.c_uint), ("eVideoBsType", ctypes.c_int)]


# codec_app_def.h
class SDecodingParam(ctypes.Structure):
    _fields_ = [
        ("pFileNameRestructed", ctypes.c_char_p),  # spellchecker:disable-line
        ("uiCpuLoad", ctypes.c_uint),
        ("uiTargetDqLayer", ctypes.c_ubyte),
        ("eEcActiveIdc", ctypes.c_int),
        ("bParseOnly", ctypes.c_bool),
        ("sVideoProperty", SVideoProperty),
    ]


# codec_def.h
class SSysMEMBuffer(ctypes.Structure):
    _fields_ = [
        ("iWidth", ctypes.c_int),
        ("iHeight", ctypes.c_int),
        ("iFormat", ctypes.c_int),
        ("iStride", ctypes.c_int * 2),
    ]


# The type of ``SBufferInfo.UsrData``, which the header declares as an unnamed union.
class _UsrData(ctypes.Union):
    _fields_ = [("sSystemBuffer", SSysMEMBuffer)]


# codec_def.h
class SBufferInfo(ctypes.Structure):
    _fields_ = [
        ("iBufferStatus", ctypes.c_int),
        ("uiInBsTimeStamp", ctypes.c_ulonglong),
        ("uiOutYuvTimeStamp", ctypes.c_ulonglong),
        ("UsrData", _UsrData),
        ("pDst", ctypes.c_void_p * 3),
    ]


# Signatures of the ``ISVCDecoderVtbl`` entries; the header declares them inline.
_InitializeDecoder = ctypes.CFUNCTYPE(
    ctypes.c_long, ctypes.c_void_p, ctypes.POINTER(SDecodingParam)
)
_UninitializeDecoder = ctypes.CFUNCTYPE(ctypes.c_long, ctypes.c_void_p)
_UnusedDecoderMethod = ctypes.CFUNCTYPE(None)
_DecodeFrameNoDelay = ctypes.CFUNCTYPE(
    ctypes.c_int,
    ctypes.c_void_p,
    # const unsigned char* pSrc: c_char_p takes bytes as is and keeps them alive for the call.
    ctypes.c_char_p,
    ctypes.c_int,
    ctypes.POINTER(ctypes.c_void_p),
    ctypes.POINTER(SBufferInfo),
)


# codec_api.h
class ISVCDecoderVtbl(ctypes.Structure):
    _fields_ = [
        ("Initialize", _InitializeDecoder),
        ("Uninitialize", _UninitializeDecoder),
        ("DecodeFrame", _UnusedDecoderMethod),
        ("DecodeFrameNoDelay", _DecodeFrameNoDelay),
    ]


# codec_api.h: typedef const ISVCDecoderVtbl* ISVCDecoder;
ISVCDecoder = ctypes.POINTER(ISVCDecoderVtbl)


def declare_functions(library: ctypes.CDLL) -> None:
    """Declare the C signatures of the ``codec_api.h`` functions this package calls."""

    try:
        # long WelsCreateDecoder (ISVCDecoder** ppDecoder);
        library.WelsCreateDecoder.argtypes = [ctypes.POINTER(ctypes.POINTER(ISVCDecoder))]
        library.WelsCreateDecoder.restype = ctypes.c_long

        # void WelsDestroyDecoder (ISVCDecoder* pDecoder);
        library.WelsDestroyDecoder.argtypes = [ctypes.POINTER(ISVCDecoder)]
        library.WelsDestroyDecoder.restype = None

        # void WelsGetCodecVersionEx (OpenH264Version* pVersion);
        library.WelsGetCodecVersionEx.argtypes = [ctypes.POINTER(OpenH264Version)]
        library.WelsGetCodecVersionEx.restype = None
    except AttributeError as exc:
        raise VideoDecoderUnavailableError(
            f"The library is not a compatible OpenH264 library: {exc}"
        ) from exc
