// Copyright (C) 2020-2021 Intel Corporation
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

function saveImage(image, posX, posY, message, file, index, extension) {
    return new Promise((resolve, reject) => {
        jimp.loadFont(jimp.FONT_SANS_64_BLACK, (err, font) => {
            if (err) reject(err);
            image.print(font, Number(posX), Number(posY), `${message}. Num ${index}`)
                .write(`${file}_${index}.${extension}`);
            resolve(null);
        });
    });
}

async function imageGenerator(args) {
    const { directory } = args;
    const { fileName } = args;
    const { width } = args;
    const { height } = args;
    const { color } = args;
    const { posX } = args;
    const { posY } = args;
    const { message } = args;
    const file = path.join(directory, fileName);
    const { count } = args;
    const { extension } = args;
    try {
        for (let i = 1; i <= count; i++) {
            const image = await createImage(width, height, color);
            await saveImage(image, posX, posY, message, file, i, extension);
        }
    // eslint-disable-next-line no-empty
    } catch (e) {}
    return null;
}
