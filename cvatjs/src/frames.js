/*
* Copyright (C) 2018 Intel Corporation
* SPDX-License-Identifier: MIT
*/

/* global
    global:false
*/

(() => {
    class FrameData {
        constructor(tid, number) {
            Object.defineProperties(this, {
                width: {
                    value: 1024,
                    writable: false,
                },
                height: {
                    value: 768,
                    writable: false,
                },
                image: {
                    value: async () => {
                        const { api } = global.cvat.config;
                        const { host } = global.cvat.config;
                        return new Promise((resolve) => {
                            resolve(`${host}/api/${api}/tasks/${tid}/frames/${number}`);
                        });
                    },
                    writable: false,
                },
            });
        }
    }

    module.exports = FrameData;
})();
