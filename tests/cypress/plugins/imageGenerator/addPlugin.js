// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

// eslint-disable-next-line no-use-before-define
exports.imageGenerator = imageGenerator;
// eslint-disable-next-line no-use-before-define
exports.imageGeneratorManyObjects = imageGeneratorManyObjects;

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

async function imageGeneratorManyObjects(args) {
    const {
        directory, fileName, width, height, color, posXs, posYs, message, imagesCount, extension,
    } = args;

    // FIXME: try invoking assertions from here
    // function validateArrays(a, b) {
    //     assert(Array.isArray(a), `${a} should be an array`);
    //     assert(Array.isArray(b), `${b} should be an array`);

    //     assert(a.length === b.length, 'arrays should have same length');
    // }

    // validateArrays(posXs, posYs);

    // eslint-disable-next-line prefer-const
    let file = path.join(directory, fileName);
    // eslint-disable-next-line prefer-const
    // let ws = [];

    try {
        const arraysLength = posXs.length;
        for (let i = 1; i <= imagesCount; i++) {
            let image = await createImage(width, height, color);
            for (let j = 0; j < arraysLength; j++) {
                image = await appendText(image, posXs[j], posYs[j], message, j + 1);
                // ws.push(image);
            }
            await image.write(`${file}.${extension}`); // NOTE: where this line should be?
        }
    // eslint-disable-next-line no-empty
    } catch (e) {}
    return null;
}
