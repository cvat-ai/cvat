// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import { ImageProcessing } from './opencv-interfaces';

export interface HistogramEqualization extends ImageProcessing{
    processImage: (src:ImageData, frameNumber: number)=>ImageData;
    restoreImage: ()=>ImageData|undefined;
}

interface HashedImage{
    frameNumber: number,
    frameData: ImageData,
    timestamp: number,
}

export default class HistogramEqualizationImplementation implements HistogramEqualization {
    private readonly bufferSize: number = 20;
    private cv:any;
    private histHash: HashedImage[];
    private currentUnequalized: ImageData | undefined;
    public currentProcessedImage: number | undefined;

    constructor(cv:any) {
        this.cv = cv;
        this.histHash = [];
    }

    public processImage(src:ImageData, frameNumber: number) : ImageData {
        const hashedFrame = this.isHashed(frameNumber);
        if (!hashedFrame) {
            const { cv } = this;
            let matImage = null;
            const RGBImage = new cv.Mat();
            const YUVImage = new cv.Mat();
            const RGBDist = new cv.Mat();
            const YUVDist = new cv.Mat();
            const RGBADist = new cv.Mat();
            let channels = new cv.MatVector();
            const equalizedY = new cv.Mat();
            try {
                this.currentUnequalized = src;
                this.currentProcessedImage = frameNumber;
                matImage = cv.matFromImageData(src);
                cv.cvtColor(matImage, RGBImage, cv.COLOR_RGBA2RGB, 0);
                cv.cvtColor(RGBImage, YUVImage, cv.COLOR_RGB2YUV, 0);
                cv.split(YUVImage, channels);
                const [Y, U, V] = [channels.get(0), channels.get(1), channels.get(2)];
                channels.delete();
                channels = null;
                cv.equalizeHist(Y, equalizedY);
                Y.delete();
                channels = new cv.MatVector();
                channels.push_back(equalizedY); equalizedY.delete();
                channels.push_back(U); U.delete();
                channels.push_back(V); V.delete();
                cv.merge(channels, YUVDist);
                cv.cvtColor(YUVDist, RGBDist, cv.COLOR_YUV2RGB, 0);
                cv.cvtColor(RGBDist, RGBADist, cv.COLOR_RGB2RGBA, 0);
                const arr = new Uint8ClampedArray(RGBADist.data, RGBADist.cols, RGBADist.rows);
                const imgData = new ImageData(arr, src.width, src.height);
                this.hashFrame(imgData, frameNumber);
                return imgData;
            } catch (e) {
                console.log('Histogram equalization error', e);
                return src;
            } finally {
                if (matImage) matImage.delete();
                if (channels) channels.delete();
                RGBImage.delete();
                YUVImage.delete();
                RGBDist.delete();
                YUVDist.delete();
                RGBADist.delete();
            }
        } else {
            this.currentUnequalized = src;
            this.currentProcessedImage = frameNumber;
            return hashedFrame;
        }
    }

    private isHashed(frameNumber: number): ImageData|undefined {
        for (const elem of this.histHash) {
            if (elem.frameNumber === frameNumber) {
                elem.timestamp = window.performance.now();
                return elem.frameData;
            }
        }
        return undefined;
    }

    public restoreImage():ImageData|undefined {
        return this.currentUnequalized;
    }

    private hashFrame(frameData:ImageData, frameNumber:number):void{
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
            frameData,
            frameNumber,
            timestamp: window.performance.now(),
        });
    }
}
