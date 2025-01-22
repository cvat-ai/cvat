// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

// eslint-disable-next-line no-use-before-define
exports.imageGenerator = imageGenerator;
// eslint-disable-next-line no-use-before-define
exports.generateImageFromCanvas = generateImageFromCanvas;

const path = require('path');
// const fs = require('fs');
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

function createImageFromBuffer(buf) {
    return new Promise((resolve, reject) => {
        // eslint-disable-next-line new-cap, no-new
        new jimp(buf, ((err, img) => {
            if (err) reject(err);
            resolve(img);
        }));
    });
}

async function generateImageFromCanvas(blb) {
    // const {
    //     canvas, directory, fileName, extension,
    // } = args;
    // const text = 'Hello #';
    // const width = 500;
    // const height = 500;
    try {
        const buf = Buffer.from(blb, 'binary');
        const img = await createImageFromBuffer(buf);
        img.write('/home/azureuser/cvat_testing/tests/cypress/fixtures/out.png');
        // sharp({
        //     create: {p
        //         width,
        //         height,
        //         channels: 4,
        //         background: {
        //             r: 255, g: , b: 255, alpha: 1,
        //         }, // белый фон
        //     },
        //     text: {
        //         text,
        //         font: 'Arial',
        //         fontSize: 100,
        //         fill: '#000000', // цвет текста (чёрный)
        //         x: Math.floor(width / 2), // расположение по оси X (центр)
        //         y: Math.floor(height / 2), // расположение по оси Y (центр)
        //         align: 'center', // выравнивание
        //         baseline: 'middle', // выравнивание по середине по вертикали
        //     },
        // }).png().toFile('/home/azureuser/cvat_testing/tests/cypress/fixtures/out.png');

        // .toFile('output.png', (err, info) => {
        //     if (err) {
        //         console.error('Ошибка при создании изображения:', err);
        //     } else {
        //         console.log('Изображение создано:', info);
        //     }
        // });
        // eslint-disable-next-line no-empty
    } catch (e) {}
    return null;
}

function appendText(image, posX, posY, message, index) {
    return new Promise((resolve, reject) => {
        jimp.loadFont(jimp.FONT_SANS_64_BLACK, (err, font) => {
            if (err) reject(err);
            const str = `${message}. Num ${index}`;
            const [textw, texth] = [
                jimp.measureText(font, str),
                jimp.measureTextHeight(font, str),
            ];
            image.print(font, Number(posX), Number(posY), `(${textw},${texth})`);
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
