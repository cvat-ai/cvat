// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

// eslint-disable-next-line no-use-before-define
exports.videoGenerator = videoGenerator;

const path = require('path');
const videoshow = require('videoshow');

const defaultVideoOptions = {
    fps: 25,
    loop: 5,
    transition: true,
    transitionDuration: 1,
    videoBitrate: 1024,
    videoCodec: 'libx264',
    size: '640x?',
    audioBitrate: '128k',
    audioChannels: 2,
    format: 'mp4',
    pixelFormat: 'yuv420p',
};

async function videoGenerator({ images, options, videoOptions = defaultVideoOptions }) {
    const {
        directory, fileName, count, extension = 'mp4',
    } = options;
    console.log(images);
    const file = path.join(directory, fileName);
    const promises = Array(count).fill(undefined).map((_, index) => new Promise((resolve, reject) => {
        videoshow(images, videoOptions)
            .save(`${file}_${index}.${extension}`)
            .on('error', reject)
            .on('end', resolve);
    }));
    Promise.all(promises);
    return null;
}
