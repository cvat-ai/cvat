# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT


def parse_exception_message(msg: str) -> str:
    parsed_msg = msg
    try:
        if "ErrorDetail" in msg:
            # msg like: 'rest_framework.exceptions.ValidationError:
            # [ErrorDetail(string="...", code=\'invalid\')]\n'
            parsed_msg = msg.split("string=")[1].split(", code=")[0].strip('"')
        elif msg.startswith("rest_framework.exceptions."):
            parsed_msg = msg.split(":")[1].strip()
    except Exception:  # nosec
        pass
    return parsed_msg
