# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import os


def is_debugging_enabled() -> bool:
    return os.environ.get("CVAT_DEBUG_ENABLED") == "yes"


if is_debugging_enabled():
    import debugpy

    class RemoteDebugger:
        """
        Support for VS code debugger.

        Supports both single- and multi-thread scenarios.

        Read docs: https://github.com/microsoft/debugpy
        Read more: https://modwsgi.readthedocs.io/en/develop/user-guides/debugging-techniques.html
        """

        ENV_VAR_PORT = "CVAT_DEBUG_PORT"
        ENV_VAR_WAIT = "CVAT_DEBUG_WAIT"
        __debugger_initialized = False

        @classmethod
        def _singleton_init(cls):
            if cls.__debugger_initialized:
                return

            try:
                port = int(os.environ[cls.ENV_VAR_PORT])

                # The only intended use is in Docker.
                # Using 127.0.0.1 will not allow host connections
                addr = ("0.0.0.0", port)  # nosec - B104:hardcoded_bind_all_interfaces

                # Debugpy is a singleton
                # We put it in the main thread of the process and then report new threads
                debugpy.listen(addr)

                # In most cases it makes no sense to debug subprocesses
                # Feel free to enable if needed.
                debugpy.configure({"subProcess": False})

                if os.environ.get(cls.ENV_VAR_WAIT) == "yes":
                    debugpy.wait_for_client()
            except Exception as ex:
                raise Exception("failed to set debugger") from ex

            cls.__debugger_initialized = True

        def __init__(self) -> None:
            self._singleton_init()

        def attach_current_thread(self) -> None:
            debugpy.debug_this_thread()
