# Package test-fixture notice

The package test suite checks in no binary media assets.

Its sole generated media fixture is a deterministic, repository-owned byte sequence created by
`tests._mp4_fixtures.make_cvat_chunk()`. It contains MP4 box structures, dummy AVC parameter sets,
and one dummy AVC access-unit payload sufficient to exercise CVAT's parser boundary. It is not a
recording of a person or place and contains no private, confidential, or personal data.

The machine-readable provenance, checksum, license, derivation, media properties, and protected
assertions are recorded in `inventory.json`. The inventory checker fails when a fixture lacks
provenance, a checksum, or approved redistribution permission.
