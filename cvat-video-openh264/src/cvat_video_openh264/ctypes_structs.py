# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import ctypes


class OpenH264Version(ctypes.Structure):
    _fields_ = [
        ("major", ctypes.c_uint),
        ("minor", ctypes.c_uint),
        ("revision", ctypes.c_uint),
        ("reserved", ctypes.c_uint),
    ]


class VideoProperty(ctypes.Structure):
    _fields_ = [("size", ctypes.c_uint), ("bitstream_type", ctypes.c_int)]


class DecodingParameters(ctypes.Structure):
    _fields_ = [
        ("reconstructed_file_name", ctypes.c_char_p),
        ("cpu_load", ctypes.c_uint),
        ("target_layer", ctypes.c_ubyte),
        ("error_concealment", ctypes.c_int),
        ("parse_only", ctypes.c_bool),
        ("video_property", VideoProperty),
    ]


class _SystemBuffer(ctypes.Structure):
    _fields_ = [
        ("width", ctypes.c_int),
        ("height", ctypes.c_int),
        ("format", ctypes.c_int),
        ("stride", ctypes.c_int * 2),
    ]


class _BufferUserData(ctypes.Union):
    _fields_ = [("system_buffer", _SystemBuffer)]


class BufferInfo(ctypes.Structure):
    _fields_ = [
        ("buffer_status", ctypes.c_int),
        ("input_timestamp", ctypes.c_ulonglong),
        ("output_timestamp", ctypes.c_ulonglong),
        ("user_data", _BufferUserData),
        ("destination", ctypes.c_void_p * 3),
    ]


_InitializeDecoder = ctypes.CFUNCTYPE(
    ctypes.c_long, ctypes.c_void_p, ctypes.POINTER(DecodingParameters)
)
_UninitializeDecoder = ctypes.CFUNCTYPE(ctypes.c_long, ctypes.c_void_p)
_UnusedDecoderMethod = ctypes.CFUNCTYPE(None)
_DecodeFrameNoDelay = ctypes.CFUNCTYPE(
    ctypes.c_int,
    ctypes.c_void_p,
    ctypes.POINTER(ctypes.c_ubyte),
    ctypes.c_int,
    ctypes.POINTER(ctypes.c_void_p),
    ctypes.POINTER(BufferInfo),
)


class DecoderVTable(ctypes.Structure):
    _fields_ = [
        ("initialize", _InitializeDecoder),
        ("uninitialize", _UninitializeDecoder),
        ("decode_frame", _UnusedDecoderMethod),
        ("decode_frame_no_delay", _DecodeFrameNoDelay),
    ]
