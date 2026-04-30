## Fix duplicate shapes in saveAnnotationsAsync pipeline

**Issue:** When `jobInstance.annotations.save()` rejects after the server persists shapes, the client ends up out of sync with the server. The shapes are marked as unsent on the client while the server has already persisted them with new IDs. The next save re-ships the shapes, creating coordinate-identical duplicates.

**Root Cause:** The `fetchAnnotationsAsync()` reconciliation call was skipped when the save pipeline failed, preventing the client from retrieving the server-assigned shape IDs.

**Solution:** Wrapped the save operations (`frames.save()` and `annotations.save()`) in an inner try-finally block to ensure reconciliation steps (`saveJobEvent.close()`, `saveLogsAsync()`, and `fetchAnnotationsAsync()`) always execute, even when save fails. This ensures the client state is always synchronized with the server, preventing duplicate submissions.

**Related Issue:** #10503
