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
import type { CameraCalibration } from 'cvat-canvas3d-wrapper';
import { ObjectState, ShapeType } from 'cvat-core-wrapper';
import { getObjectStateColor } from 'components/annotation-page/standard-workspace/objects-side-bar/shared';
import { CombinedState } from 'reducers';
import getHiddenZLayers from 'utils/get-hidden-z-layers';
import { shallowEqual, ThunkDispatch } from 'utils/redux';
import { getRelatedImageMetadata } from 'utils/related-image-calibrations';
import { focusObject } from 'utils/annotation';
import { SVGObjectType } from '../context-image-svg-overlay';
import type { SVGObject } from '../context-image-svg-overlay';

interface Params {
    contextImageName: string | undefined;
}

interface CuboidProjectionInteraction {
    objects: SVGObject[];
    onObjectClick(object: SVGObject, event: React.MouseEvent<SVGGElement>): void;
    onObjectMouseEnter(object: SVGObject): void;
    onObjectDoubleClick(object: SVGObject): void;
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
}

export const CuboidProjection = React.memo(({
    calibration,
    cuboidPoints,
    color,
    opacity,
    outlined,
    outlineColor,
    occluded,
    scale,
}: CuboidProjectionProps): JSX.Element | null => {
    const [x, y, z, rotationX, rotationY, rotationZ, width, height, depth] = cuboidPoints;
    const projection = useMemo(
        () => projectCuboid(
            calibration,
            [x, y, z, rotationX, rotationY, rotationZ, width, height, depth],
        ),
        [calibration, x, y, z, rotationX, rotationY, rotationZ, width, height, depth],
    );

    if (!projection) {
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
            {projection.faces.map((face, index) => (
                <polygon
                    key={`face-${index}`}
                    points={face.map((point) => point.join(',')).join(' ')}
                    stroke='none'
                />
            ))}
            {projection.edges.map(([from, to], index) => (
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

export default function useCuboidProjections({ contextImageName }: Params): CuboidProjectionInteraction {
    const dispatch = useDispatch<ThunkDispatch>();
    const {
        annotations,
        canvas,
        calibration,
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
        selectedOpacity,
    ]);

    const onObjectClick = useCallback((object: SVGObject, event: React.MouseEvent<SVGGElement>): void => {
        if (object.type !== SVGObjectType.CUBOID_PROJECTION) {
            return;
        }

        event.stopPropagation();
    }, []);
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
    const onObjectDoubleClick = useCallback((object: SVGObject): void => {
        if (
            object.type !== SVGObjectType.CUBOID_PROJECTION ||
            !object.state ||
            object.state.clientID === null ||
            !canvas
        ) {
            return;
        }

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
