// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

// eslint-disable-next-line no-use-before-define
exports.imageGenerator = imageGenerator;
// eslint-disable-next-line no-use-before-define
exports.generateImageFromCanvas = generateImageFromCanvas;

const path = require('path');
const { spawn } = require('node:child_process');
// const { spawn } = require('node:buffer');
const fs = require('fs-extra');
const jimp = require('jimp');
const { createCanvas } = require('canvas');

const mkdir = (dirPath) => {
    const cmd = spawn('mkdir', ['-p', dirPath], { shell: true });
    cmd.on('exit', () => {
        console.log(`mkdir:info:${dirPath} created`);
    });
};

function createImage(width, height, color) {
    return new Promise((resolve, reject) => {
        // eslint-disable-next-line new-cap, no-new
        new jimp(width, height, color, ((err, img) => {
            if (err) reject(err);
            resolve(img);
        }));
    });
}

async function generateImageFromCanvas(args) {
    const {
        directory, fileName, width, height, color, posX, posY, message, textWidth, textHeightPx, extension,

    } = args;
    console.error(args);
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);

    ctx.font = `${textHeightPx}px Impact`;
    ctx.fillStyle = color;
    ctx.fillText(message, posX, posY, textWidth);
    // for (let i = 0, px = posX, py = posY; i < 10; i++, px += 100, py += 200) {
    // ctx.fillText('B', py, px, textWidth);
    // }

    mkdir(directory);
    const file = path.join(directory, `${fileName}.${extension}`);
    const mimeType = extension === 'jpg' ? 'image/jpeg' : `image/${extension}`;
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    fs.writeFile(file, canvas.toBuffer(mimeType), (err) => {
        if (err) {
            console.log('ERROR FROM WRITING FILE:');
            console.log(err);
        } else {
            console.log(`Image saved as ${file}`);
        }
    });

    // out.on('finish', () => console.log('Image saved as output.png'));

    // eslint-disable-next-line no-empty
    return fs.pathExists(file);
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
