const JSMpeg = require('./jsmpeg');

/* This function is a modified version of function from jsmpeg
    which converts an image from YCbCr space to RGBA space
*/
function YCbCrToRGBA(y, cb, cr, width, height) {
    const rgba = new Uint8ClampedArray(width * height * 4).fill(255);
    const w = ((width + 15) >> 4) << 4;
    const w2 = w >> 1;

    let yIndex1 = 0;
    let yIndex2 = w;
    const yNext2Lines = w + (w - width);

    let cIndex = 0;
    const cNextLine = w2 - (width >> 1);

    let rgbaIndex1 = 0;
    let rgbaIndex2 = width * 4;
    const rgbaNext2Lines = width * 4;

    const cols = width >> 1;
    const rows = height >> 1;

    let ccb = 0;
    let ccr = 0;
    let r = 0;
    let g = 0;
    let b = 0;

    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            ccb = cb[cIndex];
            ccr = cr[cIndex];
            cIndex++;

            r = (ccb + ((ccb * 103) >> 8)) - 179;
            g = ((ccr * 88) >> 8) - 44 + ((ccb * 183) >> 8) - 91;
            b = (ccr + ((ccr * 198) >> 8)) - 227;

            // Line 1
            const y1 = y[yIndex1++];
            const y2 = y[yIndex1++];
            rgba[rgbaIndex1] = y1 + r;
            rgba[rgbaIndex1 + 1] = y1 - g;
            rgba[rgbaIndex1 + 2] = y1 + b;
            rgba[rgbaIndex1 + 4] = y2 + r;
            rgba[rgbaIndex1 + 5] = y2 - g;
            rgba[rgbaIndex1 + 6] = y2 + b;
            rgbaIndex1 += 8;

            // Line 2
            const y3 = y[yIndex2++];
            const y4 = y[yIndex2++];
            rgba[rgbaIndex2] = y3 + r;
            rgba[rgbaIndex2 + 1] = y3 - g;
            rgba[rgbaIndex2 + 2] = y3 + b;
            rgba[rgbaIndex2 + 4] = y4 + r;
            rgba[rgbaIndex2 + 5] = y4 - g;
            rgba[rgbaIndex2 + 6] = y4 + b;
            rgbaIndex2 += 8;
        }

        yIndex1 += yNext2Lines;
        yIndex2 += yNext2Lines;
        rgbaIndex1 += rgbaNext2Lines;
        rgbaIndex2 += rgbaNext2Lines;
        cIndex += cNextLine;
    }

    return rgba;
}

self.onmessage = function (e) {
    
    const block = e.data.block;
    const start = e.data.start;
    const end   = e.data.end;

    videoDecoder = new JSMpeg.Decoder.MPEG1Video({decodeFirstFrame : false});
    demuxer = new JSMpeg.Demuxer.TS({});
    demuxer.connect(JSMpeg.Demuxer.TS.STREAM.VIDEO_1, videoDecoder);
    demuxer.write(block);

    for (let i = start; i <= end; i++){
        var t0 = performance.now();
        const result = videoDecoder.decode();
        var t_decode = performance.now();
        // console.log("decode " + i + " frame  took " + (t_decode - t0) + " milliseconds.");
        if (!Array.isArray(result)) {
            const message = 'Result must be an array.'
                + `Got ${result}. Possible reasons: `
                + 'bad video file, unpached jsmpeg';
            throw Error(message);
        }
        

        postMessage({fileName : null, index : i, data : YCbCrToRGBA(...result, e.data.width, e.data.height)});
    }

    self.close();
}
