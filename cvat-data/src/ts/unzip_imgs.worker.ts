// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import JSZip from 'jszip';

onmessage = (e) => {
    let errored = false;
    function handleError(error): void {
        try {
            if (!errored) {
                postMessage({ error });
            }
        } finally {
            errored = true;
        }
    }

    try {
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
                                if (!errored) {
                                    // do not need to read the rest of block if an error already occured
                                    if (dimension === dimension2D) {
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
                                        });
                                    }
                                }
                            }).catch(handleError);
                    }
                });
            }).catch(handleError);
        }
    } catch (error) {
        handleError(error);
    }
};
