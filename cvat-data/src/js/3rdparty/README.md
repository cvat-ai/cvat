## 3rdparty components

These files are from the [FMpeg JS](https://github.com/phoboslab/jsmpeg) repository:
- buffer.js
- canvas2d.js
- decoder.js
- jsmpeg.js
- mpeg1.js
- ts.js

Authors don't provide an npm package, so we need to store these components in our repository.
We use this dependency to decode video chunks from a server and split them to frames on client side.
Webpack plugins ``exports-loader`` and ``imports-loader`` are used to make bundle with these files.
