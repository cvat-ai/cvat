# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

# Unit tests for the TwelveLabs Pegasus auto-annotation helper.
#
# These tests do not require a running CVAT server or network access: both the
# TwelveLabs client and the CVAT client are replaced with lightweight fakes, so
# only the helper's own logic (event parsing, label matching, timestamp-to-frame
# mapping) is exercised.

import json
import sys
import types
from logging import getLogger

import pytest

cvat_sdk_models = pytest.importorskip("cvat_sdk.models")


def _install_fake_twelvelabs(monkeypatch, events):
    """Install a fake ``twelvelabs`` package that returns the given events."""

    tl = types.ModuleType("twelvelabs")

    class _FakeAnalyzeResponse:
        def __init__(self, data):
            self.data = data

    class _FakeClient:
        last_kwargs = None

        def __init__(self, *, api_key):
            assert api_key  # the helper must pass a key through

        def analyze(self, **kwargs):
            _FakeClient.last_kwargs = kwargs
            return _FakeAnalyzeResponse(json.dumps({"events": events}))

    tl.TwelveLabs = _FakeClient

    video_context = types.ModuleType("twelvelabs.types.video_context")

    class _Url:
        def __init__(self, *, url):
            self.url = url

    class _AssetId:
        def __init__(self, *, asset_id):
            self.asset_id = asset_id

    video_context.VideoContext_Url = _Url
    video_context.VideoContext_AssetId = _AssetId

    sync_response_format = types.ModuleType("twelvelabs.types.sync_response_format")

    class _SyncResponseFormat:
        def __init__(self, *, type, json_schema):
            self.type = type
            self.json_schema = json_schema

    sync_response_format.SyncResponseFormat = _SyncResponseFormat

    types_pkg = types.ModuleType("twelvelabs.types")

    monkeypatch.setitem(sys.modules, "twelvelabs", tl)
    monkeypatch.setitem(sys.modules, "twelvelabs.types", types_pkg)
    monkeypatch.setitem(sys.modules, "twelvelabs.types.video_context", video_context)
    monkeypatch.setitem(sys.modules, "twelvelabs.types.sync_response_format", sync_response_format)
    return _FakeClient


class _FakeLabel:
    def __init__(self, name, id):
        self.name = name
        self.id = id


class _FakeTask:
    def __init__(self, labels, size):
        self._labels = labels
        self._size = size

    def get_labels(self):
        return self._labels

    def get_meta(self):
        return types.SimpleNamespace(size=self._size)


class _FakeAnnotationsApi:
    def __init__(self):
        self.created = None
        self.replaced = None

    def partial_update_annotations(self, action, task_id, *, patched_labeled_data_request):
        self.created = (task_id, patched_labeled_data_request)

    def update_annotations(self, task_id, *, labeled_data_request):
        self.replaced = (task_id, labeled_data_request)


class _FakeClient:
    def __init__(self, labels, size):
        self.logger = getLogger("test")
        self._task = _FakeTask(labels, size)
        self.tasks = types.SimpleNamespace(
            retrieve=lambda task_id: self._task,
            api=_FakeAnnotationsApi(),
        )


def _make_function(monkeypatch, events, **kwargs):
    _install_fake_twelvelabs(monkeypatch, events)
    from cvat_sdk.auto_annotation.functions.twelvelabs_pegasus import create

    kwargs.setdefault("video_url", "https://example.com/v.mp4")
    kwargs.setdefault("api_key", "fake-key")
    return create(**kwargs)


def test_requires_exactly_one_source(monkeypatch):
    _install_fake_twelvelabs(monkeypatch, [])
    from cvat_sdk.auto_annotation.functions.twelvelabs_pegasus import create

    with pytest.raises(ValueError, match="exactly one"):
        create(api_key="k")
    with pytest.raises(ValueError, match="exactly one"):
        create(api_key="k", video_url="u", asset_id="a")


def test_requires_api_key(monkeypatch):
    _install_fake_twelvelabs(monkeypatch, [])
    monkeypatch.delenv("TWELVELABS_API_KEY", raising=False)
    from cvat_sdk.auto_annotation.functions.twelvelabs_pegasus import create

    with pytest.raises(ValueError, match="API key"):
        create(video_url="u")


def test_events_mapped_to_frames_by_fps(monkeypatch):
    events = [
        {"start_time": 0.0, "label": "intro"},
        {"start_time": 2.0, "label": "intro"},
    ]
    fn = _make_function(monkeypatch, events)
    client = _FakeClient([_FakeLabel("intro", 7)], size=100)

    fn.annotate_task(client, 42, fps=30.0)

    task_id, req = client.tasks.api.created
    assert task_id == 42
    frames = sorted(tag.frame for tag in req.tags)
    assert frames == [0, 60]
    assert all(tag.label_id == 7 for tag in req.tags)
    assert all(tag.source == "auto" for tag in req.tags)


def test_frame_clamped_to_task_size(monkeypatch):
    fn = _make_function(monkeypatch, [{"start_time": 1000.0, "label": "intro"}])
    client = _FakeClient([_FakeLabel("intro", 7)], size=10)

    fn.annotate_task(client, 1, fps=30.0)

    (tag,) = client.tasks.api.created[1].tags
    assert tag.frame == 9  # size - 1


def test_no_fps_puts_everything_on_frame_zero(monkeypatch):
    fn = _make_function(monkeypatch, [{"start_time": 5.0, "label": "intro"}])
    client = _FakeClient([_FakeLabel("intro", 7)], size=100)

    fn.annotate_task(client, 1)

    (tag,) = client.tasks.api.created[1].tags
    assert tag.frame == 0


def test_unmatched_label_falls_back_then_skips(monkeypatch):
    events = [{"start_time": 0.0, "label": "unknown-thing"}]

    # No "event" fallback label present -> skipped.
    fn = _make_function(monkeypatch, events)
    client = _FakeClient([_FakeLabel("intro", 7)], size=100)
    fn.annotate_task(client, 1)
    assert client.tasks.api.created[1].tags == []

    # "event" fallback label present -> used.
    fn = _make_function(monkeypatch, events)
    client = _FakeClient([_FakeLabel("event", 9)], size=100)
    fn.annotate_task(client, 1)
    (tag,) = client.tasks.api.created[1].tags
    assert tag.label_id == 9


def test_clear_existing_uses_replace(monkeypatch):
    fn = _make_function(monkeypatch, [{"start_time": 0.0, "label": "intro"}])
    client = _FakeClient([_FakeLabel("intro", 7)], size=100)

    fn.annotate_task(client, 1, fps=30.0, clear_existing=True)

    assert client.tasks.api.created is None
    assert client.tasks.api.replaced is not None
