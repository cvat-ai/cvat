"""Content revisions and atomic, idempotent proposal creation for this CVAT fork."""

import hashlib
import json


def annotation_revision(annotations):
    """JS-safe 52-bit content token; CVAT's native version is always zero."""
    content = {name: annotations.get(name, []) for name in ("tags", "shapes", "tracks", "intervals")}
    encoded = json.dumps(content, sort_keys=True, separators=(",", ":"), allow_nan=False).encode()
    return int(hashlib.sha256(encoded).hexdigest()[:13], 16)


def guarded_create(
    *, job_id, data, expected_revision, proposal_id, transaction, job_model, get_annotations, patch_annotations
):
    """Use the same job row lock as CVAT annotation writers, not a local mutex."""
    with transaction.atomic():
        job_model.objects.select_for_update().get(pk=job_id)
        current = get_annotations(job_id)
        identity = "vlm-proposal:" + proposal_id
        # A lost HTTP response can be retried with the original content token.
        if any(any(a.get("value") == identity for a in t.get("attributes", [])) for t in current.get("tracks", [])):
            return 200, {**current, "autolabel_revision": annotation_revision(current)}
        if str(annotation_revision(current)) != expected_revision:
            return 409, {"detail": "CVAT annotations changed; save and refresh before accepting"}
        if not any(any(a.get("value") == identity for a in t.get("attributes", [])) for t in data.get("tracks", [])):
            return 400, {"detail": "Proposal identity must be stored in the new track"}
        patch_annotations(job_id, data, "create")
        updated = get_annotations(job_id)
        return 200, {**updated, "autolabel_revision": annotation_revision(updated)}
