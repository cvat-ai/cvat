# Copyright (C) 2023 Intel Corporation
#
# SPDX-License-Identifier: MIT

from contextlib import contextmanager

from django.db import connection, transaction


@contextmanager
def transaction_with_repeatable_read():
    with transaction.atomic():
        match connection.vendor:
            case "postgresql":
                connection.cursor().execute("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;")
                connection.cursor().execute("SET TRANSACTION READ ONLY;")
            case "sqlite":
                pass
            case _:
                raise NotImplementedError(
                    "transaction_with_repeatable_read is not implemented "
                    f"for {connection.vendor} backend"
                )
        yield
