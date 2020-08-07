/*
 * Copyright (C) 2020 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.imageGenerator = imageGenerator;

var jimp = require('jimp');
var path = require('path');
var fs = require('fs-extra');

function imageGenerator(args) {
    var directory = args.directory;
    var fileName = args.fileName;
    var width = args.width;
    var height = args.height;
    var color = args.color;
    var message = args.message;
    var image = new jimp(width, height, color, function (err, image) {
        if (err) throw err;
    });
    var posX = 10;
    var posY = 10;
    jimp.loadFont(jimp.FONT_SANS_64_BLACK).then(function (font) {
        image.print(font, posX, posY, message);
        return image;
    }).then(function (image) {
        var file = path.join(directory, fileName);
        return image.write(file);
    });

    if (fs.existsSync(path.join(directory, fileName))) {
        return 'Path to image: ' + path.join(directory, fileName);
    } else {
        return 'Image ' + fileName + ' not generate';
    }
}
