// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

exports.imageGenerator = imageGenerator;

const jimp = require('jimp');
const path = require('path');

function imageGenerator(args) {
    const directory = args.directory;
    const fileName = args.fileName;
    const width = args.width;
    const height = args.height;
    const color = args.color;
    const posX = args.posX;
    const posY = args.posY;
    const message = args.message;
    const file = path.join(directory, fileName);
    const count = args.count;
    return new Promise((resolve, reject) => {
        for (let i = 1; i <= count; i++) {
            new jimp(width, height, color, function (err, image) {
                if (err) reject(err);
                jimp.loadFont(jimp.FONT_SANS_64_BLACK, function (err, font) {
                    if (err) reject(err);
                    image.print(font, Number(posX), Number(posY), `${message}. Num ${i}`).write(`${file}_${i}.png`);
                });
            });
        }
        setTimeout(() => resolve(null), '1000');
    });
}
