/*
* Copyright (C) 2019 Intel Corporation
* SPDX-License-Identifier: MIT
*/

/* global
    require:true
*/

const JSMpeg = require('./3rdparty/jsmpeg');
JSMpeg.BitBuffer = require('./3rdparty/buffer');
JSMpeg.Decoder.Base = require('./3rdparty/decoder');
JSMpeg.Decoder.MPEG1Video = require('./3rdparty/mpeg1');
JSMpeg.Demuxer.TS = require('./3rdparty/ts.js');

module.exports = JSMpeg;
