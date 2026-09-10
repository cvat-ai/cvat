# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import pytest
from pytest_cases import NOT_USED

# Force execution of fixture definitions
from shared.fixtures.data import *  # pylint: disable=wildcard-import
from shared.fixtures.init import *  # pylint: disable=wildcard-import
from shared.fixtures.s3 import *  # pylint: disable=wildcard-import
from shared.fixtures.util import *  # pylint: disable=wildcard-import

# Any value that cannot collide with a real parameter index, which pytest numbers from 0.
_NOT_USED_PARAM_INDEX = -1


@pytest.hookimpl(tryfirst=True)
def pytest_collection_modifyitems(items):
    """
    Workaround the conflict between pytest_cases.fixture(), pytest_cases.parametrize(),
    and fixture scope > "function": using them together results in the fixture scope being
    ignored, so that, e.g., a class-scoped fixture is launched repeatedly for each depending
    test case.

    The workaround gives deactivated fixture union alternatives a parameter index of their own,
    so that pytest can group test nodes by the fixtures they actually use, as intended.

    `@parametrize("...", [fixture_ref(...), ...])` builds a fixture union, which puts
    every alternative into the fixture closure of every test of the class.
    https://smarie.github.io/python-pytest-cases/unions_theory
    https://smarie.github.io/python-pytest-cases/pytest_goodies/#parametrize

    For the test nodes where an alternative is not the selected one, pytest-cases
    deactivates it by parametrizing it with a single dummy `NOT_USED` value:
    https://github.com/smarie/python-pytest-cases/blob/3.10.1/src/pytest_cases/plugin.py#L1149-L1153

    That dummy is injected as a new single-value parametrization, and `Metafunc.parametrize()`
    numbers the values it is given from 0, so `callspec.indices` ends up holding 0 both for
    the real parameter and for the deactivated one. pytest groups test nodes by that index,
    so it cannot distinguish between these two, and leaves the alternatives interleaved:
    https://github.com/pytest-dev/pytest/blob/9.0.3/src/_pytest/fixtures.py#L187

    Interleaving is not just a missed optimization. A *parametrized* fixture is cached by
    pytest under its parameter value, so alternating between the real value and `NOT_USED`
    invalidates the cache and tears the fixture down between two consecutive uses. A
    class-scoped parametrized fixture is then re-created for every test in the class - in
    this suite, one full task creation per test.
    https://github.com/pytest-dev/pytest/blob/9.0.3/src/_pytest/fixtures.py#L1119-L1120

    Correcting the index is enough: pytest's own `reorder_items()` then groups the nodes and
    each fixture is set up once per parameter combination. `callspec` is a frozen dataclass,
    but `indices` is a plain dict, and pytest-cases already writes to it the same way for the
    function-scoped fixtures it deactivates:
    https://github.com/smarie/python-pytest-cases/blob/3.10.1/src/pytest_cases/plugin.py#L1167
    https://github.com/pytest-dev/pytest/blob/9.0.3/src/_pytest/fixtures.py#L217

    The index is also reported as `request.param_index` to the fixture, which is harmless
    here. A deactivated fixture returns (or yields) `NOT_USED` before its body runs, and the
    check it does that on reads `request.param`, never the index; pytest likewise keys the
    fixture cache on `request.param`:
    https://github.com/smarie/python-pytest-cases/blob/3.10.1/src/pytest_cases/fixture_core2.py#L567-L569
    https://github.com/smarie/python-pytest-cases/blob/3.10.1/src/pytest_cases/fixture_core1_unions.py#L203-L213

    Unparametrized fixtures are unaffected by the issue. They have no parameter, so their cache key
    is constant and their scope is already honoured.

    The same defect was reported and fixed for *unparametrized* session- and module-scoped
    fixtures in pytest-cases 2.1.0, by restricting the dummy-parameter hack to function-scoped
    fixtures. The neighbouring branch that handles parametrized fixtures never got that scope
    guard, and cannot trivially get it: a parametrized fixture must carry some parameter
    value, and any value other than the real one busts the cache key.
    https://github.com/smarie/python-pytest-cases/issues/120
    https://github.com/smarie/python-pytest-cases/blob/3.10.1/src/pytest_cases/plugin.py#L1128

    Regrouping these nodes is also what pytest-cases has open as a TODO of its own:
    https://github.com/smarie/python-pytest-cases/blob/3.10.1/src/pytest_cases/plugin.py#L1523

    `pytest_collection_modifyitems` receives every collected item once the
    conftest is loaded. It must run before pytest reorders, hence `tryfirst`.
    https://docs.pytest.org/en/stable/reference/reference.html#pytest.hookspec.pytest_collection_modifyitems
    """
    for item in items:
        callspec = getattr(item, "callspec", None)
        if callspec is None:
            continue

        for argname, value in callspec.params.items():
            if value is NOT_USED:
                callspec.indices[argname] = _NOT_USED_PARAM_INDEX
