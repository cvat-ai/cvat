# Copyright (C) 2026 CVAT Custom Vision Module
# SPDX-License-Identifier: MIT

"""Orochi Vision "chapters": the document On-Prem pushes after it uploads a session.

Everything in it is in the clock of the video CVAT references for the task -- the
trimmed clip when On-Prem cut the stops out, the raw recording otherwise -- so a
player can draw it straight onto its own timeline.

    {
      "schema_version": 1,
      "session_id": "1786288643",
      "video": {"duration_s": 54.8, "fps": 25.0, "trimmed": true,
                "analysed_camera": "cam5", "timings_apply_to": "all_cameras"},
      "train": {"truncated_start": true, "truncated_end": false},
      "needs_review": false,
      "cars": [{"index": 1, "start_s": 0.0, "end_s": 5.2,
                "partial_start": true, "partial_end": false, "spans_cut": false}],
      "stoppages": [{"start_s": 12.3, "end_s": 18.1}],          # stops still in the video
      "cuts": [{"at_s": 17.72, "removed_s": 40.32}],           # seams where a stop was cut
      "provenance": {"pipeline_image": "sha-...", "cars_schema_version": 3,
                     "config_fingerprint": "18ac5193a8b3", "outcome": "trimmed",
                     "trim_ratio": 0.579}
    }

This module is Django-free on purpose: validation and the scalar summary are plain
functions so they can be unit-tested without a database.
"""

CHAPTERS_SCHEMA_VERSION = 1


def _num(x) -> bool:
    return isinstance(x, (int, float)) and not isinstance(x, bool)


def validate_chapters(doc) -> list:
    """Reasons the document cannot be stored; empty when it is acceptable.

    Deliberately checks only what a consumer would crash on -- the version, the
    duration a player divides by, and that every car has a numeric window.
    Unknown keys pass through untouched so the contract can grow additively.
    """
    if not isinstance(doc, dict):
        return ["body must be a JSON object"]
    errs = []
    if doc.get("schema_version") != CHAPTERS_SCHEMA_VERSION:
        errs.append(f"schema_version must be {CHAPTERS_SCHEMA_VERSION}")
    video = doc.get("video")
    if not isinstance(video, dict) or not _num(video.get("duration_s")) or video["duration_s"] <= 0:
        errs.append("video.duration_s must be a positive number")
    cars = doc.get("cars")
    if not isinstance(cars, list):
        errs.append("cars must be a list")
    else:
        for i, c in enumerate(cars):
            if not (isinstance(c, dict) and _num(c.get("start_s")) and _num(c.get("end_s"))
                    and c["end_s"] > c["start_s"]):
                errs.append(f"cars[{i}] needs numeric start_s < end_s")
    for key in ("stoppages", "cuts"):
        if not isinstance(doc.get(key, []), list):
            errs.append(f"{key} must be a list")
    return errs


def summarize(doc: dict) -> dict:
    """The scalar columns copied out of the document, so task lists and filters
    never have to open the JSON."""
    video = doc.get("video") or {}
    train = doc.get("train") or {}
    prov = doc.get("provenance") or {}
    return {
        "car_count": len(doc.get("cars") or []),
        "needs_review": bool(doc.get("needs_review", False)),
        "truncated_start": train.get("truncated_start"),
        "truncated_end": train.get("truncated_end"),
        "trimmed": bool(video.get("trimmed", False)),
        "trim_ratio": prov.get("trim_ratio"),
        "video_duration_s": video.get("duration_s"),
        "analysed_camera": video.get("analysed_camera") or "",
        "outcome": prov.get("outcome") or "",
        "pipeline_image": prov.get("pipeline_image"),
    }
