// Copyright (C) 2019-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import config from '../config';
import type ObjectState from '../object-state';
import { ArgumentError } from '../exceptions';
import { ShapeType, HistoryActions } from '../enums';
import type { SerializedShape } from '../server-response-types';
import { mask2Rle, rle2Mask } from '../rle-utils';
import { cropMask } from '../object-utils';
import { Shape } from './shape';
import { computeNewSource } from './utils';
import type { AnnotationInjection } from './types';

export class MaskShape extends Shape {
    public left: number;
    public top: number;
    public right: number;
    public bottom: number;

    constructor(data: SerializedShape, clientID: number, color: string, injection: AnnotationInjection) {
        super(data, clientID, color, injection);
        const [left, top, right, bottom] = this.points.slice(-4);
        const { width, height } = this.framesInfo[this.frame];
        if (left < 0 || top < 0 || right >= width || bottom >= height) {
            this.points = cropMask(this.points, width, height);
        }
        [this.left, this.top, this.right, this.bottom] = this.points.splice(-4, 4);
        this.pinned = true;
        this.shapeType = ShapeType.MASK;
    }

    protected validateStateBeforeSave(data: ObjectState, updated: ObjectState['updateFlags'], frame?: number): number[] {
        super.validateStateBeforeSave(data, updated, frame);
        if (updated.points) {
            const { width, height } = this.framesInfo[frame];
            return cropMask(data.points, width, height);
        }
        return [];
    }

    public removeUnderlyingPixels(frame: number):
    {
        clientIDs: number[],
        undo: () => void,
        redo: () => void,
        emptyMaskOccurred: boolean,
    } {
        if (frame !== this.frame) {
            throw new ArgumentError(
                `Wrong "frame" attribute: is not equal to the shape frame (${frame} vs ${this.frame})`,
            );
        }

        const others = this.getMasksOnFrame(frame)
            .filter((mask: MaskShape) => mask.clientID !== this.clientID && !mask.removed);
        const width = this.right - this.left + 1;
        const height = this.bottom - this.top + 1;
        const updatedObjects: Record<number, MaskShape> = {};

        let masks = {};
        const currentMask = rle2Mask(this.points, width, height);
        for (let i = 0; i < currentMask.length; i++) {
            if (currentMask[i]) {
                const imageX = (i % width) + this.left;
                const imageY = Math.trunc(i / width) + this.top;
                for (const other of others) {
                    const box = {
                        left: other.left,
                        top: other.top,
                        right: other.right,
                        bottom: other.bottom,
                    };
                    const translatedX = imageX - box.left;
                    const translatedY = imageY - box.top;
                    const [otherWidth, otherHeight] = [box.right - box.left + 1, box.bottom - box.top + 1];
                    if (translatedX >= 0 && translatedX < otherWidth &&
                        translatedY >= 0 && translatedY < otherHeight) {
                        masks[other.clientID] = masks[other.clientID] ||
                            rle2Mask(other.points, otherWidth, otherHeight);
                        const j = translatedY * otherWidth + translatedX;
                        masks[other.clientID][j] = 0;
                        updatedObjects[other.clientID] = other;
                    }
                }
            }
        }

        const wrapper = {
            stashedPoints: Object.values(updatedObjects).map((object) => object.points),
            stashedRemoved: Object.values(updatedObjects).map((object) => object.removed),
        };

        let emptyMaskOccurred = false;
        for (const object of Object.values(updatedObjects)) {
            const points = mask2Rle(masks[object.clientID]);
            if (points.length < 2) {
                object.removed = true;
                emptyMaskOccurred = true;
            } else {
                object.points = points;
                object.updated = Date.now();
            }
        }
        masks = null;

        const undo = (): void => {
            const updatedStashedPoints = Object.values(updatedObjects).map((object) => object.points);
            const updatedStashedRemoved = Object.values(updatedObjects).map((object) => object.removed);
            for (const [index, object] of Object.values(updatedObjects).entries()) {
                object.points = wrapper.stashedPoints[index];
                object.removed = wrapper.stashedRemoved[index];
                object.updated = Date.now();
            }
            wrapper.stashedPoints = updatedStashedPoints;
            wrapper.stashedRemoved = updatedStashedRemoved;
        };

        const redo = undo;
        return {
            clientIDs: Object.keys(updatedObjects).map((clientID) => +clientID),
            emptyMaskOccurred,
            undo,
            redo,
        };
    }

    protected savePoints(maskPoints: number[], frame: number): void {
        const undoPoints = this.points;
        const undoLeft = this.left;
        const undoRight = this.right;
        const undoTop = this.top;
        const undoBottom = this.bottom;
        const undoSource = this.source;

        const [redoLeft, redoTop, redoRight, redoBottom] = maskPoints.splice(-4);
        const points = maskPoints;

        const redoPoints = points;
        const redoSource = computeNewSource(this.source);

        const undo = (): void => {
            this.points = undoPoints;
            this.source = undoSource;
            this.left = undoLeft;
            this.top = undoTop;
            this.right = undoRight;
            this.bottom = undoBottom;
            this.updated = Date.now();
        };

        const redo = (): void => {
            this.points = redoPoints;
            this.source = redoSource;
            this.left = redoLeft;
            this.top = redoTop;
            this.right = redoRight;
            this.bottom = redoBottom;
            this.updated = Date.now();
        };

        redo();
        if (config.removeUnderlyingMaskPixels.enabled) {
            const {
                clientIDs,
                emptyMaskOccurred,
                undo: undoWithUnderlyingPixels,
                redo: redoWithUnderlyingPixels,
            } = this.removeUnderlyingPixels(frame);
            if (emptyMaskOccurred) {
                config.removeUnderlyingMaskPixels?.onEmptyMaskOccurrence();
            }
            this.history.do(
                HistoryActions.CHANGED_POINTS,
                () => {
                    undoWithUnderlyingPixels();
                    undo();
                },
                () => {
                    redoWithUnderlyingPixels();
                    redo();
                },
                [this.clientID, ...clientIDs],
                frame,
            );
        } else {
            this.history.do(
                HistoryActions.CHANGED_POINTS,
                undo,
                redo,
                [this.clientID],
                frame,
            );
        }
    }

    static distance(rle: number[], x: number, y: number): number | null {
        const [left, top, right, bottom] = rle.slice(-4);
        const [width, height] = [right - left + 1, bottom - top + 1];
        const [translatedX, translatedY] = [x - left, y - top];
        if (translatedX < 0 || translatedX >= width || translatedY < 0 || translatedY >= height) {
            return null;
        }

        const offset = Math.floor(translatedY) * width + Math.floor(translatedX);
        let sum = 0;
        let value = 0;

        for (const count of rle) {
            sum += count;
            if (sum > offset) {
                return value || null;
            }
            value = Math.abs(value - 1);
        }

        return null;
    }
}

MaskShape.prototype.toJSON = function () {
    const result = Shape.prototype.toJSON.call(this);
    result.points = this.points.slice();
    result.points.push(this.left, this.top, this.right, this.bottom);
    return result;
};

MaskShape.prototype.get = function (frame) {
    const result = Shape.prototype.get.call(this, frame);
    result.points = this.points.slice(0);
    result.points.push(this.left, this.top, this.right, this.bottom);
    return result;
};
