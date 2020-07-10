// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import copy from 'copy-to-clipboard';
import {withRouter} from 'react-router-dom';
import { connect } from 'react-redux';
import { RouteComponentProps } from 'react-router';

import { LogType } from 'cvat-logger';
import {
    ActiveControl,
    CombinedState,
    ColorBy,
    ShapeType,
} from 'reducers/interfaces';
import {
    collapseObjectItems,
    changeLabelColorAsync,
    updateAnnotationsAsync,
    changeFrameAsync,
    removeObjectAsync,
    changeGroupColorAsync,
    copyShape as copyShapeAction,
    activateObject as activateObjectAction,
    propagateObject as propagateObjectAction,
    pasteShapeAsync,
    resetTrackerSettings,
    doTracking,
} from 'actions/annotation-actions';

import ObjectStateItemComponent from 'components/annotation-page/standard-workspace/objects-side-bar/object-item';
import { shift } from 'utils/math';

interface OwnProps {
    clientID: number;
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
    colors: string[];
    activeControl: ActiveControl;
    minZLayer: number;
    maxZLayer: number;
    normalizedKeyMap: Record<string, string>;
    tracker_type: string;
    tracker_until: string;
    tracker_frame_number: number;
    tracking: boolean;
}

type PathProps = RouteComponentProps<{tid: string}>;

interface DispatchToProps {
    changeFrame(frame: number): void;
    updateState(objectState: any): void;
    collapseOrExpand(objectStates: any[], collapsed: boolean): void;
    activateObject: (activatedStateID: number | null) => void;
    removeObject: (sessionInstance: any, objectState: any) => void;
    copyShape: (objectState: any) => void;
    propagateObject: (objectState: any) => void;
    changeLabelColor(label: any, color: string): void;
    changeGroupColor(group: number, color: string): void;
    resetTracker(): void;
    handleTracking(data: TrackerPayload, taskId: string): void;
}

function mapStateToProps(state: CombinedState, own: OwnProps): StateToProps {
    const {
        annotation: {
            annotations: {
                states,
                collapsed: statesCollapsed,
                activatedStateID,
                zLayer: {
                    min: minZLayer,
                    max: maxZLayer,
                },
            },
            job: {
                attributes: jobAttributes,
                instance: jobInstance,
                labels,
            },
            player: {
                frame: {
                    number: frameNumber,
                },
            },
            canvas: {
                ready,
                activeControl,
            },
            tracker: {
                tracker_type,
                tracker_until,
                tracker_frame_number,
                tracking,
            },
            colors,
        },
        settings: {
            shapes: {
                colorBy,
            },
        },
        shortcuts: {
            normalizedKeyMap,
        },
    } = state;

    const index = states
        .map((_state: any): number => _state.clientID)
        .indexOf(own.clientID);

    const collapsedState = typeof (statesCollapsed[own.clientID]) === 'undefined'
        ? true : statesCollapsed[own.clientID];

    return {
        objectState: states[index],
        collapsed: collapsedState,
        attributes: jobAttributes[states[index].label.id],
        labels,
        ready,
        activeControl,
        colorBy,
        colors,
        jobInstance,
        frameNumber,
        activated: activatedStateID === own.clientID,
        minZLayer,
        maxZLayer,
        normalizedKeyMap,
        tracker_type,
        tracker_until,
        tracker_frame_number,
        tracking,
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
        changeLabelColor(
            label: any,
            color: string,
        ): void {
            dispatch(changeLabelColorAsync(label, color));
        },
        changeGroupColor(group: number, color: string): void {
            dispatch(changeGroupColorAsync(group, color));
        },
        resetTracker(): void {
            dispatch(resetTrackerSettings());
        },
        handleTracking(data: TrackerPayload, taskId: string): void {
            dispatch(doTracking(data, taskId));
        },
    };
}

interface TrackerPayload {
    jobId: number;
    trackingJob: {
        startFrame: number;
        stopFrame: number;
        track: {
            attributes: any;
            frame: number;
            group: number;
            id: number;
            label_id: number;
            shapes: [
                {
                    frame: number;
                    attributes: any;
                    occluded: boolean;
                    outside: boolean;
                    points: number[];
                    type: string;
                    z_order: number;
                }
            ];
        }
    };

    trackId: number;
    trackerOptions: {
        trackerType: string;
    };
}

type Props = StateToProps & DispatchToProps & PathProps & OwnProps;
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
        const {
            objectState,
            removeObject,
            jobInstance,
        } = this.props;

        removeObject(jobInstance, objectState);
    };

    private createURL = (): void => {
        const {
            objectState,
            frameNumber,
        } = this.props;

        const {
            origin,
            pathname,
        } = window.location;

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
            }, [],
        );

        if (objectState.shapeType === ShapeType.POLYGON) {
            objectState.points = reducedPoints.slice(0, 1)
                .concat(reducedPoints.reverse().slice(0, -1)).flat();
            updateState(objectState);
        } else if (objectState.shapeType === ShapeType.POLYLINE) {
            objectState.points = reducedPoints.reverse().flat();
            updateState(objectState);
        }
    };

    private toBackground = (): void => {
        const {
            objectState,
            minZLayer,
        } = this.props;

        objectState.zOrder = minZLayer - 1;
        this.commit();
    };

    private toForeground = (): void => {
        const {
            objectState,
            maxZLayer,
        } = this.props;

        objectState.zOrder = maxZLayer + 1;
        this.commit();
    };

    private activate = (): void => {
        const {
            activateObject,
            objectState,
            ready,
            activeControl,
        } = this.props;

        if (ready && activeControl === ActiveControl.CURSOR) {
            activateObject(objectState.clientID);
        }
    };

    private collapse = (): void => {
        const {
            collapseOrExpand,
            objectState,
            collapsed,
        } = this.props;

        collapseOrExpand([objectState], !collapsed);
    };

    private changeColor = (color: string): void => {
        const {
            objectState,
            colorBy,
            changeLabelColor,
            changeGroupColor,
        } = this.props;

        if (colorBy === ColorBy.INSTANCE) {
            objectState.color = color;
            this.commit();
        } else if (colorBy === ColorBy.GROUP) {
            changeGroupColor(objectState.group.id, color);
        } else if (colorBy === ColorBy.LABEL) {
            changeLabelColor(objectState.label, color);
        }
    };

    private changeLabel = (labelID: string): void => {
        const {
            objectState,
            labels,
        } = this.props;

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

        objectState.points = shift(objectState.points,
            cuboidOrientationIsLeft(objectState.points) ? 4 : -4);

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
        const {
            objectState,
            updateState,
        } = this.props;

        updateState(objectState);
    }

    private createTrackerPayload = (): TrackerPayload => {
        const {
            tracker_type,
            tracker_until,
            tracker_frame_number,
            resetTracker,
            jobInstance,
            objectState,
            match,
            frameNumber
        } = this.props;


        return {
            jobId: jobInstance.id,
            trackingJob: {
                startFrame: frameNumber,
                stopFrame: tracker_frame_number ? frameNumber + tracker_frame_number : frameNumber + 50,
                track: {
                    attributes: objectState.attributes,
                    frame: objectState.frame,
                    group: objectState.group,
                    id: 4,
                    label_id: objectState.label.id,
                    shapes: [
                        {
                            frame: objectState.frame,
                            attributes: objectState.attributes,
                            occluded: objectState.occluded,
                            outside: objectState.outside,
                            points: objectState.points,
                            type: objectState.shapeType,
                            z_order: objectState.zOrder,
                        }
                    ],
                }

            },
            trackId: 4,
            trackerOptions: {
                trackerType: tracker_type
            }
        }
    }

    private onTrackerClick = (): void => {
        const {
            match,
            handleTracking,
            resetTracker,
        } = this.props;
        console.log(this.props);
        let payload: TrackerPayload = this.createTrackerPayload();
        handleTracking(payload, match.params.tid);
        // resetTracker();
    }

    public render(): JSX.Element {
        const {
            objectState,
            collapsed,
            labels,
            attributes,
            activated,
            colorBy,
            colors,
            normalizedKeyMap,
            tracking
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
                colors={colors}
                attributes={attributes}
                normalizedKeyMap={normalizedKeyMap}
                labels={labels}
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
                resetCuboidPerspective={() => this.resetCuboidPerspective()}
                onTrackerClick={this.onTrackerClick}
                tracking={tracking}
            />
        );
    }
}

export default withRouter(connect<StateToProps, DispatchToProps, OwnProps, CombinedState>(
    mapStateToProps,
    mapDispatchToProps,
)(ObjectItemContainer));
