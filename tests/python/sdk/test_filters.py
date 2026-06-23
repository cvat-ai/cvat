# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import json as _json
from unittest import mock

import pytest
from cvat_sdk.core.filters import (
    F,
    Filter,
    all_,
    any_,
    build_filter_param,
    not_,
    pop_lookup_conditions,
)


def test_and_combines_two_filters():
    result = (Filter({"==": [{"var": "a"}, 1]}) & Filter({"==": [{"var": "b"}, 2]})).to_json_logic()
    assert result == {"and": [{"==": [{"var": "a"}, 1]}, {"==": [{"var": "b"}, 2]}]}


def test_filter_constructor_accepts_conditions():
    assert Filter(Filter({"var": "x"})).to_json_logic() == {"var": "x"}
    assert Filter('{"var": "x"}').to_json_logic() == {"var": "x"}


def test_filter_constructor_rejects_unsupported_conditions():
    with pytest.raises(TypeError):
        Filter(1)
    with pytest.raises(TypeError):
        Filter("[]")


def test_and_flattens_same_operator():
    f = (
        Filter({"==": [{"var": "a"}, 1]})
        & Filter({"==": [{"var": "b"}, 2]})
        & Filter({"==": [{"var": "c"}, 3]})
    )
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
    assert F.project_id.one_of([1, 2, 3]).to_json_logic() == {
        "in": [{"var": "project_id"}, [1, 2, 3]]
    }


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
        "and": [
            {"==": [{"var": "status"}, "completed"]},
            {"in": [{"var": "project_id"}, [1, 2, 3]]},
        ]
    }


def test_pop_lookup_in():
    kwargs = {"project_id__in": [1, 2, 3]}
    conditions = pop_lookup_conditions(kwargs)
    assert kwargs == {}
    assert conditions == [{"in": [{"var": "project_id"}, [1, 2, 3]]}]


def test_pop_lookup_all_operators():
    kwargs = {
        "name__contains": "demo",
        "id__lt": 5,
        "id__lte": 5,
        "id__gt": 5,
        "id__gte": 5,
        "status__ne": "completed",
        "id__between": (10, 20),
        "assignee__isset": True,
    }
    conditions = pop_lookup_conditions(kwargs)
    assert kwargs == {}
    assert conditions == [
        {"in": ["demo", {"var": "name"}]},
        {"<": [{"var": "id"}, 5]},
        {"<=": [{"var": "id"}, 5]},
        {">": [{"var": "id"}, 5]},
        {">=": [{"var": "id"}, 5]},
        {"!": {"==": [{"var": "status"}, "completed"]}},
        {"<=": [10, {"var": "id"}, 20]},
        {"var": "assignee"},
    ]


def test_pop_lookup_isset_false():
    kwargs = {"assignee__isset": False}
    assert pop_lookup_conditions(kwargs) == [{"!": {"var": "assignee"}}]


def test_pop_lookup_leaves_plain_and_unknown_kwargs():
    kwargs = {"status": "completed", "page_size": 50, "unknown_filter": True}
    assert pop_lookup_conditions(kwargs) == []
    assert kwargs == {"status": "completed", "page_size": 50, "unknown_filter": True}


def test_build_filter_param_none():
    assert build_filter_param(None, []) is None


def test_build_filter_param_single_lookup_unwrapped():
    out = build_filter_param(None, [{"var": "x"}])
    assert _json.loads(out) == {"var": "x"}


def test_build_filter_param_merges_lookups_and_filter_with_and():
    out = build_filter_param(F.name.contains("v2"), [{"==": [{"var": "status"}, "completed"]}])
    assert _json.loads(out) == {
        "and": [{"==": [{"var": "status"}, "completed"]}, {"in": ["v2", {"var": "name"}]}]
    }


def test_build_filter_param_dict_passthrough_serialized():
    out = build_filter_param({"==": [{"var": "id"}, 1]}, [])
    assert _json.loads(out) == {"==": [{"var": "id"}, 1]}


def test_build_filter_param_string_passthrough_verbatim():
    raw = _json.dumps({"==": [{"var": "id"}, 1]})
    assert build_filter_param(raw, []) == raw


def _make_fake_repo():
    from cvat_sdk.core.proxies import model_proxy

    class FakeRepo(model_proxy.ModelListMixin):
        def __init__(self):
            self.api = mock.Mock()
            self._client = mock.Mock()
            self._entity_type = lambda client, model: model

    return model_proxy, FakeRepo()


def test_list_merges_dsl_and_lookups_into_filter_kwarg():
    model_proxy, repo = _make_fake_repo()

    with mock.patch.object(model_proxy, "get_paginated_collection", return_value=[]) as gpc:
        repo.list(status="completed", project_id__in=[1, 2, 3], filter=F.name.contains("v2"))

    forwarded = gpc.call_args.kwargs
    # plain kwarg passes through untouched
    assert forwarded["status"] == "completed"
    # project_id__in was consumed into the filter, not forwarded as a raw kwarg
    assert "project_id__in" not in forwarded
    assert _json.loads(forwarded["filter"]) == {
        "and": [
            {"in": [{"var": "project_id"}, [1, 2, 3]]},
            {"in": ["v2", {"var": "name"}]},
        ]
    }


def test_list_without_filter_args_sends_no_filter_kwarg():
    model_proxy, repo = _make_fake_repo()

    with mock.patch.object(model_proxy, "get_paginated_collection", return_value=[]) as gpc:
        repo.list(page_size=50)

    forwarded = gpc.call_args.kwargs
    assert "filter" not in forwarded
    assert forwarded["page_size"] == 50
