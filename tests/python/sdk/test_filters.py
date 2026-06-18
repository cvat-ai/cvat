# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import pytest

from cvat_sdk.core.filters import Filter, all_, any_, not_


def test_and_combines_two_filters():
    result = (Filter({"==": [{"var": "a"}, 1]}) & Filter({"==": [{"var": "b"}, 2]})).to_json_logic()
    assert result == {"and": [{"==": [{"var": "a"}, 1]}, {"==": [{"var": "b"}, 2]}]}


def test_and_flattens_same_operator():
    f = Filter({"==": [{"var": "a"}, 1]}) & Filter({"==": [{"var": "b"}, 2]}) & Filter({"==": [{"var": "c"}, 3]})
    assert f.to_json_logic() == {
        "and": [{"==": [{"var": "a"}, 1]}, {"==": [{"var": "b"}, 2]}, {"==": [{"var": "c"}, 3]}]
    }


def test_or_combines():
    f = Filter({"==": [{"var": "a"}, 1]}) | Filter({"==": [{"var": "b"}, 2]})
    assert f.to_json_logic() == {"or": [{"==": [{"var": "a"}, 1]}, {"==": [{"var": "b"}, 2]}]}


def test_invert():
    assert (~Filter({"==": [{"var": "a"}, 1]})).to_json_logic() == {"!": {"==": [{"var": "a"}, 1]}}


def test_all_single_is_unwrapped():
    assert all_(Filter({"var": "x"})).to_json_logic() == {"var": "x"}


def test_all_multiple_wraps_in_and():
    assert all_(Filter({"var": "x"}), Filter({"var": "y"})).to_json_logic() == {
        "and": [{"var": "x"}, {"var": "y"}]
    }


def test_any_multiple_wraps_in_or():
    assert any_(Filter({"var": "x"}), Filter({"var": "y"})).to_json_logic() == {
        "or": [{"var": "x"}, {"var": "y"}]
    }


def test_not_wraps():
    assert not_(Filter({"var": "x"})).to_json_logic() == {"!": {"var": "x"}}


def test_all_empty_raises():
    with pytest.raises(ValueError):
        all_()


from cvat_sdk.core.filters import F, Field


def test_field_eq():
    assert (F.status == "completed").to_json_logic() == {"==": [{"var": "status"}, "completed"]}


def test_field_ne_uses_not_eq():
    assert (F.id != 5).to_json_logic() == {"!": {"==": [{"var": "id"}, 5]}}


def test_field_ordering_operators():
    assert (F.id < 5).to_json_logic() == {"<": [{"var": "id"}, 5]}
    assert (F.id <= 5).to_json_logic() == {"<=": [{"var": "id"}, 5]}
    assert (F.id > 5).to_json_logic() == {">": [{"var": "id"}, 5]}
    assert (F.id >= 5).to_json_logic() == {">=": [{"var": "id"}, 5]}


def test_field_one_of():
    assert F.project_id.one_of([1, 2, 3]).to_json_logic() == {"in": [{"var": "project_id"}, [1, 2, 3]]}


def test_field_contains():
    assert F.name.contains("demo").to_json_logic() == {"in": ["demo", {"var": "name"}]}


def test_field_between():
    assert F.id.between(10, 20).to_json_logic() == {"<=": [10, {"var": "id"}, 20]}


def test_field_is_set():
    assert F.assignee.is_set().to_json_logic() == {"var": "assignee"}


def test_field_getitem():
    assert (F["weird-name"] == 1).to_json_logic() == {"==": [{"var": "weird-name"}, 1]}


def test_dsl_composition_example():
    f = (F.status == "completed") & F.project_id.one_of([1, 2, 3])
    assert f.to_json_logic() == {
        "and": [{"==": [{"var": "status"}, "completed"]}, {"in": [{"var": "project_id"}, [1, 2, 3]]}]
    }
