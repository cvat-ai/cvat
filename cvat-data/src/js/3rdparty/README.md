## 3rdparty components

These files are from the [Broadway.js](https://github.com/mbebenita/Broadway) repository:
- Decoder.js
- mp4.js
- avc.wasm

### Why do we store them here?

Authors don't provide an npm package, so we need to store these components in our repository.
We use this dependency to decode video chunks from a server and split them to frames on client side.

We need to run this package in node environent (for example for debug, or for running unit tests).
But there aren't any ways to do that (even with syntetic environment, provided for example by the package ``browser-env``).
For example there are issues with canvas using (webpack doesn't work with binary canvas package for node-js) and others.
So, we have solved to write patch file for this library.
It modifies source code a little to support our scenario of using.

### How to build awc.wasm and Decoder.js

Instructions will be added in the future.

### How work with a patch file
```bash
    # from cvat-data/src/js
    cp -r 3rdparty 3rdparty_edited
    # change 3rdparty edited as we need
    diff -u 3rdparty 3rdparty_edited/ > 3rdparty_patch.diff
    patch -p0 < 3rdparty_patch.diff # apply patch from cvat-data/src/js
```

Also these files have been added to ignore for git in all future revisions:
```bash
    # from cvat-data dir
    git update-index --skip-worktree src/js/3rdparty/*.js
```

This behaviour can be reset with:
```bash
    # from cvat-data dir
    git update-index --no-skip-worktree src/js/3rdparty/*.js
```

[Stackoverflow issue](https://stackoverflow.com/questions/4348590/how-can-i-make-git-ignore-future-revisions-to-a-file)
