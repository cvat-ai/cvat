// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { activateObject, collapseObjectItems } from 'actions/annotation-actions';
import {
    Canvas3d,
    CUBOID_EDGES,
    CUBOID_FACES,
    projectCuboid,
} from 'cvat-canvas3d-wrapper';
import { ObjectState, ShapeType } from 'cvat-core-wrapper';
import { getObjectStateColor } from 'components/annotation-page/standard-workspace/objects-side-bar/shared';
import { CombinedState } from 'reducers';
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
    onObjectMouseEnter(object: SVGObject): void;
    onObjectDoubleClick(object: SVGObject): void;
}

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
                annotation.outside
            ) {
                return projectionObjects;
            }

            const projection = projectCuboid(calibration, annotation.points);
            if (!projection) {
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
                    <g
                        fill={color}
                        fillOpacity={isActive ? selectedOpacity : opacity}
                        stroke={outlined ? outlineColor || 'black' : color}
                        strokeDasharray={annotation.occluded ? `${4 / scale} ${4 / scale}` : undefined}
                        strokeWidth={1 / scale}
                    >
                        {CUBOID_FACES.map((face) => (
                            <polygon
                                key={face.join('-')}
                                points={face.map((index) => projection[index].join(',')).join(' ')}
                            />
                        ))}
                        {CUBOID_EDGES.map(([from, to]) => (
                            <line
                                key={`${from}-${to}`}
                                x1={projection[from][0]}
                                x2={projection[to][0]}
                                y1={projection[from][1]}
                                y2={projection[to][1]}
                            />
                        ))}
                    </g>
                ),
            });

            return projectionObjects;
        }, []);
    }, [activatedStateID, annotations, calibration, colorBy, opacity, outlineColor, outlined, selectedOpacity]);

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
        onObjectMouseEnter,
        onObjectDoubleClick,
    };
}
