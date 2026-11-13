# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

"""OpenH264 constants this package uses; the ones from OpenH264 keep their source names."""

import enum

# The bindings mirror the OpenH264 2.x headers.
SUPPORTED_MAJOR_VERSION = 2

# The version `python -m cvat_mp4_h264 install` downloads.
INSTALL_VERSION = "2.7.0"

# codec_app_def.h: VIDEO_BITSTREAM_TYPE
VIDEO_BITSTREAM_AVC = 0

# codec_app_def.h: ERROR_CON_IDC
ERROR_CON_DISABLE = 0

# codec_def.h: EVideoFormatType
videoFormatI420 = 23

# codec/decoder/core/inc/wels_const.h (internal): the largest access unit OpenH264 accepts.
MAX_ACCESS_UNIT_CAPACITY = 7077888


# codec_app_def.h
class DECODING_STATE(enum.IntFlag):
    dsErrorFree = 0x00
    dsFramePending = 0x01
    dsRefLost = 0x02
    dsBitstreamError = 0x04
    dsDepLayerLost = 0x08
    dsNoParamSets = 0x10
    dsDataErrorConcealed = 0x20
    dsRefListNullPtrs = 0x40
    dsInvalidArgument = 0x1000
    dsInitialOptExpected = 0x2000
    dsOutOfMemory = 0x4000
    dsDstBufNeedExpan = 0x8000
