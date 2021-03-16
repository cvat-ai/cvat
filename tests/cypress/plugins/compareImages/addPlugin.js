// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

// eslint-disable-next-line no-undef
exports.compareImages = compareImages;

const Jimp = require('jimp');

async function compareImages(args) {
    const imgBase = await Jimp.read(args.imgBase);
    const imgAfterChanges = await Jimp.read(args.imgAfterChanges);
    const diff = Jimp.diff(imgBase, imgAfterChanges);

    return diff.percent;
}
