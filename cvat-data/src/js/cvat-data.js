const untar = require ("js-untar");

/*
    JS FMpeg is client side library
    We need additional hacks to require it in node
    We user imports-loader and exports-loader plugins for webpack here
    Nevertheless runtime is only web
*/
window.JSMpeg = require('exports-loader?JSMpeg!./3rdparty/jsmpeg.js');
require ("imports-loader?this=>window!./3rdparty/ts.js");
require ("imports-loader?this=>window!./3rdparty/decoder.js");
require ("imports-loader?this=>window!./3rdparty/buffer.js");
require ("imports-loader?this=>window!./3rdparty/mpeg1.js");
require ("imports-loader?this=>window!./3rdparty/canvas2d.js");


const BlockType = Object.freeze({
    VIDEO: 'video',
    IMAGES: 'images',
});

class FrameProvider {
    constructor(memory, blockType) {
        this._frames = {};
        this._memory = Math.min(1, memory);
        this._blocks = [];
        this._running = false;
        this._blockType = blockType;
        this._videoDecoder = new JSMpeg.Decoder.MPEG1Video({});
        this._demuxer = new JSMpeg.Demuxer.TS({});
        this._demuxer.connect(JSMpeg.Demuxer.TS.STREAM.VIDEO_1, this._videoDecoder);
        this._canvas = document.createElement('canvas');
        this._renderer = new JSMpeg.Renderer.Canvas2D({canvas : this._canvas});
        this._videoDecoder.connect(this._renderer);

        // TODO: You can add any other fields for you needs
    }

    /*
        It is used to remove extra data from a cache
    */
    _cleanup() {
        if (this._blocks.length > this._memory) {
            const shifted = this._blocks.shift();
            const [start, end] = shifted.split(':').map((el) => +el);
            for (let i = start; i < end; i++) {
                delete this._frames[i];
            }
        }
    }

    /*
        @param number {number} - is a frame number
    */
    frame(number) {
        if (number in this._frames) {
            return this._frames[number];
        }

        return null;
    }

    /*
        @param block - is a data from a server as is (I don't know exactly what type it has)
        @param start {number} - is the first frame of a block
        @param end {number} - is the last frame of a block + 1
    */
    decode(block, start, end) {
        return new Promise(async function (resolve, reject) {
            try {
                // no more requests possible during one is running
                if (this._running) {
                    throw new Error('Decoding has already running');
                }
                this._running = true;

                this._blocks.push(`${start}:${end}`);
                // In this block you can use await for functions which are async (return promise)
                this._cleanup();

                if (this._blockType === BlockType.VIDEO) {
                    this._demuxer.write(block);
                    for (let i = start; i < end; i++) {
                       const frame = this._videoDecoder.decode();
                       const ImData = new ImageData(new Uint8ClampedArray(frame.data),
                            frame.width,
                            frame.height                        
                        );

                      this._canvas.getContext('2d').putImageData(ImData, 0, 0);
                      this._frames[i] = this._canvas.toDataURL();

                    }
                    resolve();
                    // TODO: here you can decode a block of video frames [start, end) and save
                    // them in this._frames where dictionary key is a frame number
                } else if (this._blockType === BlockType.IMAGES) {
                    console.log("extracting in progress...");
                    const extractedFiles = await untar(block);
                    for (let i = 0; i < extractedFiles.length; i++)
                    {
                        const reader = new FileReader();
                        reader.onload = () => {
                            this._frames[i] = reader.result;
                            resolve(this._frames[i]);
                        };
                        reader.readAsDataURL(extractedFiles[i].blob);
                    }
                }
            } catch (error) {
                reject(error);
            } finally {
                this._running = false;
            }
        }.bind(this));
    }

    // Returns a list of cached ranges
    // Is an array of strings `start:end`
    get cachedFrames() {
        return [...this._blocks].sort((a, b) => a.split(':')[0] - b.split(':')[0]);
    }
}

module.exports = {
    FrameProvider,
    BlockType,
};
