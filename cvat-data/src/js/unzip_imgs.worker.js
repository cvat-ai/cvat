// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

const JSZip = require('jszip');

onmessage = (e) => {
    const zip = new JSZip();
    if (e.data) {
        const {
            start, end, block, dimension, dimension2D,
        } = e.data;

        zip.loadAsync(block).then((_zip) => {
            let index = start;
            _zip.forEach((relativePath) => {
                const fileIndex = index++;
                if (fileIndex <= end) {
                    _zip.file(relativePath)
                        .async('blob')
                        .then((fileData) => {
                            // eslint-disable-next-line no-restricted-globals
                            if (dimension === dimension2D && self.createImageBitmap) {
                                createImageBitmap(fileData).then((img) => {
                                    postMessage({
                                        fileName: relativePath,
                                        index: fileIndex,
                                        data: img,
                                    });
                                });
                            } else {
                                postMessage({
                                    fileName: relativePath,
                                    index: fileIndex,
                                    data: fileData,
                                    isRaw: true,
                                });
                            }
                        });
                }
            });
        });
    }
};
