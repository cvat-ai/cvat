// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { activateObject, collapseObjectItems } from 'actions/annotation-actions';
import {
    Canvas3d,
    projectCuboid,
} from 'cvat-canvas3d-wrapper';
import type { CameraCalibration, ProjectedPoint } from 'cvat-canvas3d-wrapper';
import { ObjectState, ShapeType } from 'cvat-core-wrapper';
import { getObjectStateColor } from 'components/annotation-page/standard-workspace/objects-side-bar/shared';
import { ActiveControl, CombinedState } from 'reducers';
import getHiddenZLayers from 'utils/get-hidden-z-layers';
import { shallowEqual, ThunkDispatch } from 'utils/redux';
import { getRelatedImageMetadata } from 'utils/related-image-calibrations';
import { focusObject } from 'utils/annotation';
import type { Size } from 'utils/geometry';
import { SVGObjectType } from '../context-image-svg-overlay';
import type { SVGObject } from '../context-image-svg-overlay';

interface Params {
    contextImageName: string | undefined;
    imageSize: Size;
}

interface CuboidProjectionInteraction {
    objects: SVGObject[];
    onObjectClick(object: SVGObject, event: React.MouseEvent<SVGGElement>): void;
    onObjectMouseEnter(object: SVGObject): void;
    onObjectDoubleClick(object: SVGObject, event: React.MouseEvent<SVGGElement>): void;
}

interface CuboidProjectionProps {
    calibration: CameraCalibration;
    cuboidPoints: number[];
    color: string;
    opacity: number;
    outlined: boolean;
    outlineColor: string;
    occluded: boolean;
    scale: number;
    imageSize: Size;
}

function boundaryDistance(
    point: ProjectedPoint,
    axis: 0 | 1,
    // Pixel coordinate of the boundary on the selected axis.
    boundary: number,
): number {
    // Axis 0 is x and 1 is y. The zero boundary is a minimum side;
    // other boundaries are maximum sides.
    return boundary === 0 ? point[axis] : boundary - point[axis];
}

function findBoundaryIntersection(
    [fromX, fromY]: ProjectedPoint,
    [toX, toY]: ProjectedPoint,
    fromDistance: number,
    toDistance: number,
): ProjectedPoint {
    const ratio = fromDistance / (fromDistance - toDistance);
    return [fromX + ratio * (toX - fromX), fromY + ratio * (toY - fromY)];
}

function clipPolygonAtBoundary(
    polygon: ProjectedPoint[],
    axis: 0 | 1,
    boundary: number,
): ProjectedPoint[] {
    if (!polygon.length) {
        return polygon;
    }

    const clippedPoints: ProjectedPoint[] = [];
    let previousPoint = polygon[polygon.length - 1];
    let previousDistance = boundaryDistance(previousPoint, axis, boundary);
    let previousInside = previousDistance >= 0;

    for (const currentPoint of polygon) {
        const currentDistance = boundaryDistance(currentPoint, axis, boundary);
        const currentInside = currentDistance >= 0;
        if (currentInside !== previousInside) {
            clippedPoints.push(findBoundaryIntersection(
                previousPoint,
                currentPoint,
                previousDistance,
                currentDistance,
            ));
        }

        if (currentInside) {
            clippedPoints.push(currentPoint);
        }

        previousPoint = currentPoint;
        previousDistance = currentDistance;
        previousInside = currentInside;
    }

    return clippedPoints;
}

function clipLineAtBoundary(
    [from, to]: [ProjectedPoint, ProjectedPoint],
    axis: 0 | 1,
    boundary: number,
): [ProjectedPoint, ProjectedPoint] | null {
    const fromDistance = boundaryDistance(from, axis, boundary);
    const toDistance = boundaryDistance(to, axis, boundary);
    const fromInside = fromDistance >= 0;
    const toInside = toDistance >= 0;

    if (!fromInside && !toInside) {
        return null;
    }

    if (fromInside === toInside) {
        return [from, to];
    }

    const intersection = findBoundaryIntersection(from, to, fromDistance, toDistance);
    return fromInside ? [from, intersection] : [intersection, to];
}

function clipPolygon(polygon: ProjectedPoint[], { width, height }: Size): ProjectedPoint[] {
    const leftClipped = clipPolygonAtBoundary(polygon, 0, 0);
    const rightClipped = clipPolygonAtBoundary(leftClipped, 0, width);
    const topClipped = clipPolygonAtBoundary(rightClipped, 1, 0);
    return clipPolygonAtBoundary(topClipped, 1, height);
}

function clipLine(
    line: [ProjectedPoint, ProjectedPoint],
    { width, height }: Size,
): [ProjectedPoint, ProjectedPoint] | null {
    const leftClipped = clipLineAtBoundary(line, 0, 0);
    if (!leftClipped) {
        return null;
    }

    const rightClipped = clipLineAtBoundary(leftClipped, 0, width);
    if (!rightClipped) {
        return null;
    }

    const topClipped = clipLineAtBoundary(rightClipped, 1, 0);
    if (!topClipped) {
        return null;
    }

    return clipLineAtBoundary(topClipped, 1, height);
}

const CuboidProjection = React.memo(({
    calibration,
    cuboidPoints,
    color,
    opacity,
    outlined,
    outlineColor,
    occluded,
    scale,
    imageSize,
}: CuboidProjectionProps): JSX.Element | null => {
    const [x, y, z, rotationX, rotationY, rotationZ, width, height, depth] = cuboidPoints;
    const projection = useMemo(
        () => projectCuboid(
            calibration,
            [x, y, z, rotationX, rotationY, rotationZ, width, height, depth],
        ),
        [calibration, x, y, z, rotationX, rotationY, rotationZ, width, height, depth],
    );
    const boundedProjection = useMemo(
        () => projection && {
            faces: projection.faces
                .map((face) => clipPolygon(face, imageSize))
                .filter((face) => face.length >= 3),
            edges: projection.edges
                .map((edge) => clipLine(edge, imageSize))
                .filter((edge): edge is [ProjectedPoint, ProjectedPoint] => edge !== null),
        },
        [imageSize.height, imageSize.width, projection],
    );

    if (!boundedProjection) {
        return null;
    }

    return (
        <g
            fill={color}
            fillOpacity={opacity}
            stroke={outlined ? outlineColor || 'black' : color}
            strokeDasharray={occluded ? `${4 / scale} ${4 / scale}` : undefined}
            strokeWidth={1 / scale}
        >
            {boundedProjection.faces.map((face, index) => (
                <polygon
                    key={`face-${index}`}
                    points={face.map((point) => point.join(',')).join(' ')}
                    stroke='none'
                />
            ))}
            {boundedProjection.edges.map(([from, to], index) => (
                <line
                    key={`edge-${index}`}
                    x1={from[0]}
                    x2={to[0]}
                    y1={from[1]}
                    y2={to[1]}
                />
            ))}
        </g>
    );
});

export default function useCuboidProjections({
    contextImageName,
    imageSize,
}: Params): CuboidProjectionInteraction {
    const dispatch = useDispatch<ThunkDispatch>();
    const {
        annotations,
        canvas,
        calibration,
        isCursorActive,
        activatedStateID,
        colorBy,
        opacity,
        selectedOpacity,
        outlined,
        outlineColor,
        hiddenZLayers,
    } = useSelector((state: CombinedState) => {
        const calibratedRelatedImagesMetadata = state.annotation.player.frame.data?.calibratedRelatedImagesMetadata;
        const { shapes } = state.settings;

        return {
            annotations: state.annotation.annotations.states as ObjectState[],
            canvas: state.annotation.canvas.instance as Canvas3d | null,
            isCursorActive: state.annotation.canvas.activeControl === ActiveControl.CURSOR,
            activatedStateID: state.annotation.annotations.activatedStateID,
            colorBy: shapes.colorBy,
            opacity: shapes.opacity / 100,
            selectedOpacity: shapes.selectedOpacity / 100,
            outlined: shapes.outlined,
            outlineColor: shapes.outlineColor,
            hiddenZLayers: getHiddenZLayers(state),
            calibration: contextImageName && calibratedRelatedImagesMetadata?.length ?
                getRelatedImageMetadata(calibratedRelatedImagesMetadata, contextImageName) :
                null,
        };
    }, shallowEqual);

    const objects = useMemo<SVGObject[]>(() => {
        if (!calibration) {
            return [];
        }

        return annotations.reduce<SVGObject[]>((projectionObjects, annotation) => {
            if (
                annotation.shapeType !== ShapeType.CUBOID ||
                !annotation.points ||
                annotation.hidden ||
                hiddenZLayers.has(annotation.zOrder) ||
                annotation.outside
            ) {
                return projectionObjects;
            }

            const isActive = annotation.clientID === activatedStateID;
            const color = getObjectStateColor(annotation, colorBy).hex;
            projectionObjects.push({
                id: `cuboid-projection:${annotation.clientID}`,
                type: SVGObjectType.CUBOID_PROJECTION,
                state: annotation,
                className: 'cvat-context-image-cuboid-projection',
                render: (scale): JSX.Element => (
                    <CuboidProjection
                        calibration={calibration}
                        cuboidPoints={annotation.points!}
                        color={color}
                        opacity={isActive ? selectedOpacity : opacity}
                        outlined={outlined}
                        outlineColor={outlineColor}
                        occluded={annotation.occluded}
                        scale={scale}
                        imageSize={imageSize}
                    />
                ),
            });

            return projectionObjects;
        }, []);
    }, [
        activatedStateID,
        annotations,
        calibration,
        colorBy,
        hiddenZLayers,
        opacity,
        outlineColor,
        outlined,
        imageSize,
        selectedOpacity,
    ]);

    const onObjectClick = useCallback((object: SVGObject, event: React.MouseEvent<SVGGElement>): void => {
        if (object.type !== SVGObjectType.CUBOID_PROJECTION || !isCursorActive) {
            return;
        }

        event.stopPropagation();
    }, [isCursorActive]);
    const onObjectMouseEnter = useCallback((object: SVGObject): void => {
        if (
            object.type !== SVGObjectType.CUBOID_PROJECTION ||
            !object.state ||
            object.state.clientID === null ||
            object.state.clientID === activatedStateID
        ) {
            return;
        }

        dispatch(activateObject(object.state.clientID, null, null));
    }, [activatedStateID, dispatch]);
    const onObjectDoubleClick = useCallback((object: SVGObject, event: React.MouseEvent<SVGGElement>): void => {
        if (
            object.type !== SVGObjectType.CUBOID_PROJECTION ||
            !object.state ||
            object.state.clientID === null ||
            !canvas
        ) {
            return;
        }

        event.stopPropagation();
        focusObject(object.state, canvas);
        dispatch(collapseObjectItems([object.state], false));
    }, [canvas, dispatch]);

    return {
        objects,
        onObjectClick,
        onObjectMouseEnter,
        onObjectDoubleClick,
    };
}
