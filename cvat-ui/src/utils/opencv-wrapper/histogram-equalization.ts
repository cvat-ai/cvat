// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

export interface HistogramEqualization {
    equalize: (src:ImageData, frameNumber: number)=>Promise<ImageBitmap | undefined> ;
    restoreImage: ()=>Promise<ImageBitmap|undefined>;
    currentEqualizedNumber: number | undefined;
}

interface HashedImage{
    frameNumber: number,
    bitmap: ImageBitmap,
    timestamp: number,
}

export default class HistogramEqualizationImplementation implements HistogramEqualization {
    private readonly bufferSize: number = 20;
    private cv:any;
    private histHash: HashedImage[];
    private currentUnequalized: ImageData | undefined;
    public currentEqualizedNumber: number | undefined;
    private matImage: any;
    private channels: any;
    private dist: any;

    constructor(cv:any) {
        this.cv = cv;
        this.histHash = [];
    }

    public async equalize(src:ImageData, frameNumber: number) : Promise<ImageBitmap | undefined> {
        const hashedFrame = this.isHashed(frameNumber);
        let matImage = null;
        if (!hashedFrame) {
            const { cv } = this;
            const dist = new cv.Mat();
            const channels = new cv.MatVector();
            try {
                this.currentUnequalized = src;
                this.currentEqualizedNumber = frameNumber;
                matImage = cv.matFromImageData(src);
                cv.cvtColor(matImage, matImage, cv.COLOR_RGBA2RGB, 0);
                cv.cvtColor(matImage, matImage, cv.COLOR_RGB2YUV, 0);
                cv.split(matImage, channels);
                cv.equalizeHist(channels.get(0), channels.get(0));
                cv.merge(channels, dist);
                cv.cvtColor(dist, dist, cv.COLOR_YUV2RGB, 0);
                cv.cvtColor(dist, dist, cv.COLOR_RGB2RGBA, 0);
                const arr = new Uint8ClampedArray(dist.data, dist.cols, dist.rows);
                const imgData = new ImageData(arr, src.width, src.height);
                return createImageBitmap(imgData).then((bitmap:ImageBitmap) => {
                    this.hashFrame(bitmap, frameNumber);
                    return bitmap;
                });
            } catch (e) {
                console.log('error in eq');
                console.log(e);
                return undefined;
            } finally {
                if (matImage) {
                    matImage.delete();
                }
                dist.delete();
                channels.delete();
            }
        } else {
            return hashedFrame;
        }
    }

    private isHashed(frameNumber: number): ImageBitmap|undefined {
        for (const elem of this.histHash) {
            if (elem.frameNumber === frameNumber) {
                elem.timestamp = window.performance.now();
                return elem.bitmap;
            }
        }
        return undefined;
    }

    public async restoreImage():Promise<ImageBitmap|undefined> {
        if (this.currentUnequalized) {
            return createImageBitmap(this.currentUnequalized);
        }
        return undefined;
    }

    private hashFrame(bitmap:ImageBitmap, frameNumber:number):void{
        if (this.histHash.length >= this.bufferSize) {
            const leastRecentlyUsed = this.histHash[0];
            const currentTimestamp = window.performance.now();
            let diff = currentTimestamp - leastRecentlyUsed.timestamp;
            let leastIndex = 0;
            for (let i = 1; i < this.histHash.length; i++) {
                const currentDiff = currentTimestamp - this.histHash[i].timestamp;
                if (currentDiff > diff) {
                    diff = currentDiff;
                    leastIndex = i;
                }
            }
            this.histHash.splice(leastIndex, 1);
        }
        this.histHash.push({
            bitmap,
            frameNumber,
            timestamp: window.performance.now(),
        });
    }
}
