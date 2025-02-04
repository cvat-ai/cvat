// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

const { inspect } = require('node:util');

// eslint-disable-next-line no-use-before-define
exports.imageGenerator = imageGenerator;
// eslint-disable-next-line no-use-before-define
exports.generateImageFromCanvas = generateImageFromCanvas;

const path = require('path');
const { spawn } = require('node:child_process');
const fs = require('fs-extra');
const jimp = require('jimp');

// const { png } = jimp;
// const { createCanvas } = require('canvas');

function createImage(width, height, color) {
    return new Promise((resolve, reject) => {
        // eslint-disable-next-line new-cap, no-new
        new jimp(width, height, color, ((err, img) => {
            if (err) reject(err);
            resolve(img);
        }));
    });
}
function createImageFromBuffer(arrayBuf, width, height) {
    return new Promise((resolve, reject) => {
        // eslint-disable-next-line new-cap, no-new
        new jimp(arrayBuf, width, height, (err, image) => {
            if (err) reject(err);
            resolve(image);
        });
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

const mkdir = (dirPath) => {
    const cmd = spawn('mkdir', ['-p', dirPath], { shell: true });
    cmd.on('exit', () => {
        console.log(`mkdir:info:${dirPath} created`);
    });
};

async function generateImageFromCanvas(args) {
    /* eslint-disable */
    const {
        directory, fileName,
        width, height,
        backColor, textColor,
        posX, posY,
        message, textWidth, textHeightPx,
        extension,

        buffer,

    } = args;
    const convertToMimeType = (ext) => {
        switch (ext) {
            case 'jpeg':
                return jimp.MIME_JPEG;
            case 'jpg':
                return jimp.MIME_JPEG;
            case 'png':
                return jimp.MIME_PNG;
            default:
                return jimp.MIME_PNG;
        }
    };
    const mimeType = convertToMimeType(extension);
    console.error(args);
    console.error(typeof buffer);
    console.error(inspect(buffer));
    /* const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = backColor;
    ctx.fillRect(0, 0, width, height);

    ctx.font = `${textHeightPx}px Impact`;
    ctx.fillStyle = textColor;
    ctx.fillText(message, posX, posY, textWidth ); */
    // for (let i = 0, px = posX, py = posY; i < 10; i++, px += 100, py += 200) {
    // ctx.fillText('B', py, px, textWidth);
    // }

    // const buf = canvas.toBuffer(mimeType);

    mkdir(directory);
    const file = path.join(directory, `${fileName}.${extension}`);
    const image = await createImageFromBuffer(buffer.data, width, height);
    image.write(`${file}_.${extension}`);
    // TODO: copy data to ArrayBuffer and send it into there
    // }));
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    // fs.writeFile(file, bitmap.buffer, (err) => {
    //     if (err) {
    //         console.log('ERROR FROM WRITING FILE:');
    //         console.log(err);
    //     } else {
    //         console.log(`Image saved as ${file}`);
    //     }
    // });

    // out.on('finish', () => console.log('Image saved as output.png'));

    // eslint-disable-next-line no-empty
    return fs.pathExists(file);
}
