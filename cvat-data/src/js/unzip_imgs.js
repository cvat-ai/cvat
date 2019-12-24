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
        const fileMapping = {};
        let index = start;
        _zip.forEach((relativePath) => {
            fileMapping[relativePath] = index++;
        });
        index = start;
        let inverseUnzippedFilesCount = end;
        _zip.forEach((relativePath) => {
            const fileIndex = index++;

            _zip.file(relativePath).async('blob').then((fileData) => {
                const reader = new FileReader();
                reader.onload = (() => {
                    postMessage({
                        fileName: relativePath,
                        index: fileIndex,
                        data: reader.result,
                        isEnd: inverseUnzippedFilesCount <= start,
                    });
                    inverseUnzippedFilesCount--;
                    if (inverseUnzippedFilesCount < start) {
                        // eslint-disable-next-line no-restricted-globals
                        close();
                    }
                });

                reader.readAsDataURL(fileData);
            });
        });
    });
};
