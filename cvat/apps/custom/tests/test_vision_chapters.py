# Copyright (C) 2026 CVAT Custom Vision Module
# SPDX-License-Identifier: MIT

import unittest

from cvat.apps.custom.vision import summarize, validate_chapters

DOC = {
    "schema_version": 1,
    "session_id": "1786288643",
    "video": {"duration_s": 54.8, "fps": 25.0, "trimmed": True,
              "analysed_camera": "cam5", "timings_apply_to": "all_cameras"},
    "train": {"truncated_start": True, "truncated_end": False},
    "needs_review": False,
    "cars": [{"index": 1, "start_s": 0.0, "end_s": 5.2, "partial_start": True,
              "partial_end": False, "spans_cut": False},
             {"index": 2, "start_s": 5.2, "end_s": 30.0, "partial_start": False,
              "partial_end": False, "spans_cut": True}],
    "stoppages": [],
    "cuts": [{"at_s": 17.72, "removed_s": 40.32}],
    "provenance": {"pipeline_image": "sha-abc", "cars_schema_version": 3,
                   "config_fingerprint": "18ac5193a8b3", "outcome": "trimmed",
                   "trim_ratio": 0.579},
}


class ValidateAndSummarizeTest(unittest.TestCase):
    """Django-free: the contract checks and the scalar summary."""

    def test_accepts_the_reference_document(self):
        self.assertEqual(validate_chapters(DOC), [])

    def test_rejects_wrong_version_missing_duration_and_bad_car(self):
        bad = dict(DOC, schema_version=2, video={"fps": 25},
                   cars=[{"index": 1, "start_s": 5, "end_s": 5}])
        errs = validate_chapters(bad)
        self.assertEqual(len(errs), 3, errs)

    def test_rejects_non_object(self):
        self.assertEqual(validate_chapters([1, 2]), ["body must be a JSON object"])

    def test_summary_copies_the_scalars_out(self):
        s = summarize(DOC)
        self.assertEqual((s["car_count"], s["needs_review"], s["trimmed"], s["trim_ratio"]),
                         (2, False, True, 0.579))
        self.assertEqual((s["truncated_start"], s["truncated_end"]), (True, False))
        self.assertEqual((s["video_duration_s"], s["analysed_camera"], s["outcome"]),
                         (54.8, "cam5", "trimmed"))

    def test_summary_tolerates_a_minimal_document(self):
        s = summarize({"schema_version": 1, "video": {"duration_s": 10}, "cars": []})
        self.assertEqual((s["car_count"], s["needs_review"], s["trimmed"], s["outcome"]),
                         (0, False, False, ""))
