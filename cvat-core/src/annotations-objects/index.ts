// Copyright (C) 2019-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { DataError } from '../exceptions';
import { colors, ShapeType } from '../enums';
import type { SerializedShape, SerializedTrack } from '../server-response-types';
import { Shape } from './shape';
import { Track } from './track';
import type { AnnotationInjection } from './types';
import { RectangleShape } from './rectangle-shape';
import { EllipseShape } from './ellipse-shape';
import { PolygonShape } from './polygon-shape';
import { PolylineShape } from './polyline-shape';
import { PointsShape } from './points-shape';
import { CuboidShape } from './cuboid-shape';
import { MaskShape } from './mask-shape';
// eslint-disable-next-line import/no-cycle
import { SkeletonShape } from './skeleton-shape';
import { RectangleTrack } from './rectangle-track';
import { EllipseTrack } from './ellipse-track';
import { PolygonTrack } from './polygon-track';
import { PolylineTrack } from './polyline-track';
import { PointsTrack } from './points-track';
import { CuboidTrack } from './cuboid-track';
// eslint-disable-next-line import/no-cycle
import { SkeletonTrack } from './skeleton-track';
import { AudioInterval } from './audio-interval';

export type { BasicInjection, InterpolatedPosition } from './types';
export { InterpolationNotPossibleError } from './image-object';
export { Shape };
export { Track };
export { Tag } from './tag';
export { AudioInterval };
export {
    RectangleShape, EllipseShape, PolygonShape, PolylineShape, PointsShape,
    CuboidShape, SkeletonShape, MaskShape,
};
export {
    RectangleTrack, EllipseTrack, PolygonTrack, PolylineTrack, PointsTrack,
    CuboidTrack, SkeletonTrack,
};

export function shapeFactory(
    data: SerializedShape | SerializedShape['elements'][0],
    clientID: number,
    injection: AnnotationInjection,
): Shape {
    const { type } = data;
    const color = colors[clientID % colors.length];

    let shapeModel = null;
    switch (type) {
        case ShapeType.RECTANGLE:
            shapeModel = new RectangleShape(data as SerializedShape, clientID, color, injection);
            break;
        case ShapeType.POLYGON:
            shapeModel = new PolygonShape(data as SerializedShape, clientID, color, injection);
            break;
        case ShapeType.POLYLINE:
            shapeModel = new PolylineShape(data as SerializedShape, clientID, color, injection);
            break;
        case ShapeType.POINTS:
            shapeModel = new PointsShape(data, clientID, color, injection);
            break;
        case ShapeType.ELLIPSE:
            shapeModel = new EllipseShape(data as SerializedShape, clientID, color, injection);
            break;
        case ShapeType.CUBOID:
            shapeModel = new CuboidShape(data as SerializedShape, clientID, color, injection);
            break;
        case ShapeType.MASK:
            shapeModel = new MaskShape(data as SerializedShape, clientID, color, injection);
            break;
        case ShapeType.SKELETON:
            shapeModel = new SkeletonShape(data as SerializedShape, clientID, color, injection);
            break;
        default:
            throw new DataError(`An unexpected type of shape "${type}"`);
    }

    return shapeModel;
}

export function trackFactory(
    trackData: SerializedTrack | SerializedTrack['elements'][0],
    clientID: number,
    injection: AnnotationInjection,
): Track {
    if (trackData.shapes.length) {
        const { type } = trackData.shapes[0];
        const color = colors[clientID % colors.length];

        let trackModel = null;
        switch (type) {
            case ShapeType.RECTANGLE:
                trackModel = new RectangleTrack(trackData as SerializedTrack, clientID, color, injection);
                break;
            case ShapeType.POLYGON:
                trackModel = new PolygonTrack(trackData as SerializedTrack, clientID, color, injection);
                break;
            case ShapeType.POLYLINE:
                trackModel = new PolylineTrack(trackData as SerializedTrack, clientID, color, injection);
                break;
            case ShapeType.POINTS:
                trackModel = new PointsTrack(trackData, clientID, color, injection);
                break;
            case ShapeType.ELLIPSE:
                trackModel = new EllipseTrack(trackData as SerializedTrack, clientID, color, injection);
                break;
            case ShapeType.CUBOID:
                trackModel = new CuboidTrack(trackData as SerializedTrack, clientID, color, injection);
                break;
            case ShapeType.SKELETON:
                trackModel = new SkeletonTrack(trackData as SerializedTrack, clientID, color, injection);
                break;
            default:
                throw new DataError(`An unexpected type of track "${type}"`);
        }

        return trackModel;
    }

    console.warn('The track without any shapes had been found. It was ignored.');
    return null;
}
