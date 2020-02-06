/*
* Copyright (C) 2019 Intel Corporation
* SPDX-License-Identifier: MIT
*/

/* global
   require:true
*/

const JSZip = require('jszip');

onmessage = (e) => {
    const zip = new JSZip();
    const { start, end, block } = e.data;

    zip.loadAsync(block).then((_zip) => {
        let index = start;
        let inverseUnzippedFilesCount = end;
        _zip.forEach((relativePath) => {
            const fileIndex = index++;
            _zip.file(relativePath).async('blob').then((fileData) => {
                createImageBitmap(fileData).then((img) => {
                    postMessage({
                        fileName: relativePath,
                        index: fileIndex,
                        data: img,
                        isEnd: inverseUnzippedFilesCount <= start,
                    });
                    inverseUnzippedFilesCount--;
                });
            });
        });
    });
};
