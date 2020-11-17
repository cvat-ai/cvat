// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React, { MutableRefObject } from 'react';
import copy from 'copy-to-clipboard';
import { connect } from 'react-redux';

import { LogType } from 'cvat-logger';
import {
    ActiveControl, CombinedState, ColorBy, ShapeType,
} from 'reducers/interfaces';
import {
    collapseObjectItems,
    updateAnnotationsAsync,
    changeFrameAsync,
    removeObjectAsync,
    changeGroupColorAsync,
    copyShape as copyShapeAction,
    activateObject as activateObjectAction,
    propagateObject as propagateObjectAction,
    pasteShapeAsync,
} from 'actions/annotation-actions';

import ObjectStateItemComponent from 'components/annotation-page/standard-workspace/objects-side-bar/object-item';
import { ToolsControlComponent } from 'components/annotation-page/standard-workspace/controls-side-bar/tools-control';
import { shift } from 'utils/math';

interface OwnProps {
    clientID: number;
    objectStates: any[];
    initialCollapsed: boolean;
}

interface StateToProps {
    objectState: any;
    collapsed: boolean;
    labels: any[];
    attributes: any[];
    jobInstance: any;
    frameNumber: number;
    activated: boolean;
    colorBy: ColorBy;
    ready: boolean;
    activeControl: ActiveControl;
    minZLayer: number;
    maxZLayer: number;
    normalizedKeyMap: Record<string, string>;
    aiToolsRef: MutableRefObject<ToolsControlComponent>;
}

interface DispatchToProps {
    changeFrame(frame: number): void;
    updateState(objectState: any): void;
    collapseOrExpand(objectStates: any[], collapsed: boolean): void;
    activateObject: (activatedStateID: number | null) => void;
    removeObject: (sessionInstance: any, objectState: any) => void;
    copyShape: (objectState: any) => void;
    propagateObject: (objectState: any) => void;
    changeGroupColor(group: number, color: string): void;
}

function mapStateToProps(state: CombinedState, own: OwnProps): StateToProps {
    const {
        annotation: {
            annotations: {
                collapsed: statesCollapsed,
                activatedStateID,
                zLayer: { min: minZLayer, max: maxZLayer },
            },
            job: { attributes: jobAttributes, instance: jobInstance, labels },
            player: {
                frame: { number: frameNumber },
            },
            canvas: { ready, activeControl },
            aiToolsRef,
        },
        settings: {
            shapes: { colorBy },
        },
        shortcuts: { normalizedKeyMap },
    } = state;

    const { objectStates: states, initialCollapsed, clientID } = own;
    const stateIDs = states.map((_state: any): number => _state.clientID);
    const index = stateIDs.indexOf(clientID);

    const collapsedState =
        typeof statesCollapsed[clientID] === 'undefined' ? initialCollapsed : statesCollapsed[clientID];

    return {
        objectState: states[index],
        collapsed: collapsedState,
        attributes: jobAttributes[states[index].label.id],
        labels,
        ready,
        activeControl,
        colorBy,
        jobInstance,
        frameNumber,
        activated: activatedStateID === clientID,
        minZLayer,
        maxZLayer,
        normalizedKeyMap,
        aiToolsRef,
    };
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        changeFrame(frame: number): void {
            dispatch(changeFrameAsync(frame));
        },
        updateState(state: any): void {
            dispatch(updateAnnotationsAsync([state]));
        },
        collapseOrExpand(objectStates: any[], collapsed: boolean): void {
            dispatch(collapseObjectItems(objectStates, collapsed));
        },
        activateObject(activatedStateID: number | null): void {
            dispatch(activateObjectAction(activatedStateID, null));
        },
        removeObject(sessionInstance: any, objectState: any): void {
            dispatch(removeObjectAsync(sessionInstance, objectState, true));
        },
        copyShape(objectState: any): void {
            dispatch(copyShapeAction(objectState));
            dispatch(pasteShapeAsync());
        },
        propagateObject(objectState: any): void {
            dispatch(propagateObjectAction(objectState));
        },
        changeGroupColor(group: number, color: string): void {
            dispatch(changeGroupColorAsync(group, color));
        },
    };
}

type Props = StateToProps & DispatchToProps;
class ObjectItemContainer extends React.PureComponent<Props> {
    private copy = (): void => {
        const { objectState, copyShape } = this.props;
        copyShape(objectState);
    };

    private propagate = (): void => {
        const { objectState, propagateObject } = this.props;
        propagateObject(objectState);
    };

    private remove = (): void => {
        const { objectState, removeObject, jobInstance } = this.props;

        removeObject(jobInstance, objectState);
    };

    private createURL = (): void => {
        const { objectState, frameNumber } = this.props;

        const { origin, pathname } = window.location;

        const search = `frame=${frameNumber}&type=${objectState.objectType}&serverID=${objectState.serverID}`;
        const url = `${origin}${pathname}?${search}`;
        copy(url);
    };

    private switchOrientation = (): void => {
        const { objectState, updateState } = this.props;
        if (objectState.shapeType === ShapeType.CUBOID) {
            this.switchCuboidOrientation();
            return;
        }

        const reducedPoints = objectState.points.reduce(
            (acc: number[][], _: number, index: number, array: number[]): number[][] => {
                if (index % 2) {
                    acc.push([array[index - 1], array[index]]);
                }

                return acc;
            },
            [],
        );

        if (objectState.shapeType === ShapeType.POLYGON) {
            objectState.points = reducedPoints.slice(0, 1).concat(reducedPoints.reverse().slice(0, -1)).flat();
            updateState(objectState);
        } else if (objectState.shapeType === ShapeType.POLYLINE) {
            objectState.points = reducedPoints.reverse().flat();
            updateState(objectState);
        }
    };

    private toBackground = (): void => {
        const { objectState, minZLayer } = this.props;

        objectState.zOrder = minZLayer - 1;
        this.commit();
    };

    private toForeground = (): void => {
        const { objectState, maxZLayer } = this.props;

        objectState.zOrder = maxZLayer + 1;
        this.commit();
    };

    private activate = (): void => {
        const {
            activateObject, objectState, ready, activeControl,
        } = this.props;

        if (ready && activeControl === ActiveControl.CURSOR) {
            activateObject(objectState.clientID);
        }
    };

    private collapse = (): void => {
        const { collapseOrExpand, objectState, collapsed } = this.props;

        collapseOrExpand([objectState], !collapsed);
    };

    private activateTracking = (): void => {
        const { objectState, aiToolsRef } = this.props;
        if (aiToolsRef.current && aiToolsRef.current.trackingAvailable()) {
            aiToolsRef.current.trackState(objectState);
        }
    };

    private changeColor = (color: string): void => {
        const { objectState, colorBy, changeGroupColor } = this.props;

        if (colorBy === ColorBy.INSTANCE) {
            objectState.color = color;
            this.commit();
        } else if (colorBy === ColorBy.GROUP) {
            changeGroupColor(objectState.group.id, color);
        }
    };

    private changeLabel = (labelID: string): void => {
        const { objectState, labels } = this.props;

        const [label] = labels.filter((_label: any): boolean => _label.id === +labelID);
        objectState.label = label;
        this.commit();
    };

    private changeAttribute = (id: number, value: string): void => {
        const { objectState, jobInstance } = this.props;
        jobInstance.logger.log(LogType.changeAttribute, {
            id,
            value,
            object_id: objectState.clientID,
        });
        const attr: Record<number, string> = {};
        attr[id] = value;
        objectState.attributes = attr;
        this.commit();
    };

    private switchCuboidOrientation = (): void => {
        function cuboidOrientationIsLeft(points: number[]): boolean {
            return points[12] > points[0];
        }

        const { objectState } = this.props;

        this.resetCuboidPerspective(false);

        objectState.points = shift(objectState.points, cuboidOrientationIsLeft(objectState.points) ? 4 : -4);

        this.commit();
    };

    private resetCuboidPerspective = (commit = true): void => {
        function cuboidOrientationIsLeft(points: number[]): boolean {
            return points[12] > points[0];
        }

        const { objectState } = this.props;
        const { points } = objectState;
        const minD = {
            x: (points[6] - points[2]) * 0.001,
            y: (points[3] - points[1]) * 0.001,
        };

        if (cuboidOrientationIsLeft(points)) {
            points[14] = points[10] + points[2] - points[6] + minD.x;
            points[15] = points[11] + points[3] - points[7];
            points[8] = points[10] + points[4] - points[6];
            points[9] = points[11] + points[5] - points[7] + minD.y;
            points[12] = points[14] + points[0] - points[2];
            points[13] = points[15] + points[1] - points[3] + minD.y;
        } else {
            points[10] = points[14] + points[6] - points[2] - minD.x;
            points[11] = points[15] + points[7] - points[3];
            points[12] = points[14] + points[0] - points[2];
            points[13] = points[15] + points[1] - points[3] + minD.y;
            points[8] = points[12] + points[4] - points[0] - minD.x;
            points[9] = points[13] + points[5] - points[1];
        }

        objectState.points = points;
        if (commit) this.commit();
    };

    private commit(): void {
        const { objectState, updateState } = this.props;

        updateState(objectState);
    }

    public render(): JSX.Element {
        const {
            objectState, collapsed, labels, attributes, activated, colorBy, normalizedKeyMap,
        } = this.props;

        let stateColor = '';
        if (colorBy === ColorBy.INSTANCE) {
            stateColor = objectState.color;
        } else if (colorBy === ColorBy.GROUP) {
            stateColor = objectState.group.color;
        } else if (colorBy === ColorBy.LABEL) {
            stateColor = objectState.label.color;
        }

        return (
            <ObjectStateItemComponent
                activated={activated}
                objectType={objectState.objectType}
                shapeType={objectState.shapeType}
                clientID={objectState.clientID}
                serverID={objectState.serverID}
                locked={objectState.lock}
                attrValues={{ ...objectState.attributes }}
                labelID={objectState.label.id}
                color={stateColor}
                attributes={attributes}
                normalizedKeyMap={normalizedKeyMap}
                labels={labels}
                colorBy={colorBy}
                collapsed={collapsed}
                activate={this.activate}
                remove={this.remove}
                copy={this.copy}
                propagate={this.propagate}
                createURL={this.createURL}
                switchOrientation={this.switchOrientation}
                toBackground={this.toBackground}
                toForeground={this.toForeground}
                changeColor={this.changeColor}
                changeLabel={this.changeLabel}
                changeAttribute={this.changeAttribute}
                collapse={this.collapse}
                activateTracking={this.activateTracking}
                resetCuboidPerspective={() => this.resetCuboidPerspective()}
            />
        );
    }
}

export default connect<StateToProps, DispatchToProps, OwnProps, CombinedState>(
    mapStateToProps,
    mapDispatchToProps,
)(ObjectItemContainer);
