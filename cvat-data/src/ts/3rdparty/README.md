## 3rdparty components

These files are from the [Broadway.js](https://github.com/mbebenita/Broadway) repository:
- Decoder.worker.js
- mp4.js
- avc.wasm

### Why do we store them here?

Authors don't provide an npm package, so we need to store these components in our repository.
We use this dependency to decode video chunks from a server and split them to frames on client side.

We need to run this package in node environment (for example for debug, or for running unit tests).
But there aren't any ways to do that (even with synthetic environment, provided for example by the package ``browser-env``).
For example there are issues with canvas using (webpack doesn't work with binary canvas package for node-js) and others.
So, we have solved to write patch file for this library.
It modifies source code a little to support our scenario of using.

### How to build awc.wasm and Decoder.cjs
1. Clone Emscripten SDK, install and activate the latest fastcomp SDK:
   ```sh
   git clone https://github.com/emscripten-core/emsdk.git && cd emsdk
   ```
   ```sh
   ./emsdk install latest-fastcomp
   ```
   ```sh
   ./emsdk activate latest-fastcomp
   ```

1. Clone Broadway.js
   ```sh
   git clone https://github.com/mbebenita/Broadway.git && cd Broadway/Decoder
   ```

1. Edit `make.py`:
   - Remove or comment the following options:
     `'-s', 'NO_BROWSER=1',`\
     `'-s', 'PRECISE_I64_MATH=0',`
   - Remove `"HEAP8", "HEAP16", "HEAP32"` from the `EXPORTED_FUNCTIONS` list.
   - Increase total memory to make possible decode 4k videos
   (or try to enable `ALLOW_MEMORY_GROWTH`, but this option has not been tested):\
       `'-s', 'TOTAL_MEMORY=' + str(100*1024*1024),`
   - Add the following options:\
     `'-s', "ENVIRONMENT='worker'",`\
     `'-s', 'WASM=1',`

1. Activate emsdk environment and build Broadway.js:
   ```sh
   . /tmp/emsdk/emsdk_env.sh
   ```
   ```sh
   python2 make.py
   ```

1. Copy the following files to cvat-data 3rdparty source folder:
   ```sh
   cd ..
   ```
   ```sh
   cp Player/avc.wasm  Player/Decoder.cjs Player/mp4.js <CVAT_FOLDER>/cvat-data/src/
   ```
   ```sh
   js/3rdparty
   ```
