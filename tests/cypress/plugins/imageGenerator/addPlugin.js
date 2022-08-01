// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

// eslint-disable-next-line no-use-before-define
exports.imageGenerator = imageGenerator;

const path = require('path');
const jimp = require('jimp');

function createImage(width, height, color) {
    return new Promise((resolve, reject) => {
        // eslint-disable-next-line new-cap, no-new
        new jimp(width, height, color, ((err, img) => {
            if (err) reject(err);
            resolve(img);
        }));
    });
}

function appendText(image, posX, posY, message, index) {
    return new Promise((resolve, reject) => {
        jimp.loadFont(jimp.FONT_SANS_64_BLACK, (err, font) => {
            if (err) reject(err);
            image.print(font, Number(posX), Number(posY), `${message}. Num ${index}`);
            resolve(image);
        });
    });
}

async function imageGenerator(args) {
    const {
        directory, fileName, width, height, color, posX, posY, message, count, extension,
    } = args;
    const file = path.join(directory, fileName);
    try {
        for (let i = 1; i <= count; i++) {
            let image = await createImage(width, height, color);
            image = await appendText(image, posX, posY, message, i);
            image.write(`${file}_${i}.${extension}`);
        }
    // eslint-disable-next-line no-empty
    } catch (e) {}
    return null;
}
