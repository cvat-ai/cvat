# Copy previous skeleton pose regression test

Install the root JavaScript dependencies, then run from the repository root:

```sh
node tests/unit/run-copy-skeleton-pose.cjs
```

The runner bundles the test with the repository's existing webpack and Babel
dependencies and runs it in Node. Generated files go into `node_modules/.cache`.
No CVAT server or annotation data is required.

The test exercises the actual `ObjectState`, `SkeletonTrack`, and annotation
history implementations. It checks current-session edits, coordinate copying,
target attributes and visibility, neighboring keyframes, one-step undo/redo,
no-op behavior, locked points, invalid coordinates, track/frame guards, and
label matching when point order differs. Only SVG label rendering is stubbed.
It does not replace an end-to-end browser test of the button.
