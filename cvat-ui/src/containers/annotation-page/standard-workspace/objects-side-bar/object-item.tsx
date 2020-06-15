// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import copy from 'copy-to-clipboard';
import { connect } from 'react-redux';

import { LogType } from 'cvat-logger';
import { Canvas, isAbleToChangeFrame } from 'cvat-canvas-wrapper';
import { ActiveControl, CombinedState, ColorBy } from 'reducers/interfaces';
import {
    collapseObjectItems,
    changeLabelColorAsync,
    createAnnotationsAsync,
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
    canvasInstance: Canvas;
}

interface DispatchToProps {
    changeFrame(frame: number): void;
    updateState(objectState: any): void;
    createAnnotations(sessionInstance: any, frameNumber: number, state: any): void;
    collapseOrExpand(objectStates: any[], collapsed: boolean): void;
    activateObject: (activatedStateID: number | null) => void;
    removeObject: (sessionInstance: any, objectState: any) => void;
    copyShape: (objectState: any) => void;
    propagateObject: (objectState: any) => void;
    changeLabelColor(label: any, color: string): void;
    changeGroupColor(group: number, color: string): void;
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
                instance: canvasInstance,
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
        canvasInstance,
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
        createAnnotations(sessionInstance: any, frameNumber: number, state: any): void {
            dispatch(createAnnotationsAsync(sessionInstance, frameNumber, state));
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
    };
}

type Props = StateToProps & DispatchToProps;
class ObjectItemContainer extends React.PureComponent<Props> {
    private navigateFirstKeyframe = (): void => {
        const { objectState, frameNumber } = this.props;
        const { first } = objectState.keyframes;
        if (first !== frameNumber) {
            this.changeFrame(first);
        }
    };

    private navigatePrevKeyframe = (): void => {
        const { objectState, frameNumber } = this.props;
        const { prev } = objectState.keyframes;
        if (prev !== null && prev !== frameNumber) {
            this.changeFrame(prev);
        }
    };

    private navigateNextKeyframe = (): void => {
        const { objectState, frameNumber } = this.props;
        const { next } = objectState.keyframes;
        if (next !== null && next !== frameNumber) {
            this.changeFrame(next);
        }
    };

    private navigateLastKeyframe = (): void => {
        const { objectState, frameNumber } = this.props;
        const { last } = objectState.keyframes;
        if (last !== frameNumber) {
            this.changeFrame(last);
        }
    };

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

    private lock = (): void => {
        const { objectState, jobInstance } = this.props;
        jobInstance.logger.log(LogType.lockObject, { locked: true });
        objectState.lock = true;
        this.commit();
    };

    private unlock = (): void => {
        const { objectState, jobInstance } = this.props;
        jobInstance.logger.log(LogType.lockObject, { locked: false });
        objectState.lock = false;
        this.commit();
    };

    private pin = (): void => {
        const { objectState } = this.props;
        objectState.pinned = true;
        this.commit();
    };

    private unpin = (): void => {
        const { objectState } = this.props;
        objectState.pinned = false;
        this.commit();
    };

    private show = (): void => {
        const { objectState } = this.props;
        objectState.hidden = false;
        this.commit();
    };

    private hide = (): void => {
        const { objectState } = this.props;
        objectState.hidden = true;
        this.commit();
    };

    private setOccluded = (): void => {
        const { objectState } = this.props;
        objectState.occluded = true;
        this.commit();
    };

    private unsetOccluded = (): void => {
        const { objectState } = this.props;
        objectState.occluded = false;
        this.commit();
    };

    private setOutside = (): void => {
        const { objectState } = this.props;
        objectState.outside = true;
        this.commit();
    };

    private unsetOutside = (): void => {
        const { objectState } = this.props;
        objectState.outside = false;
        this.commit();
    };

    private setKeyframe = (): void => {
        const { objectState } = this.props;
        objectState.keyframe = true;
        this.commit();
    };

    private unsetKeyframe = (): void => {
        const { objectState } = this.props;
        objectState.keyframe = false;
        this.commit();
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

    private changeFrame(frame: number): void {
        const { changeFrame, canvasInstance } = this.props;
        if (isAbleToChangeFrame(canvasInstance)) {
            changeFrame(frame);
        }
    }

    private commit(): void {
        const {
            objectState,
            updateState,
        } = this.props;

        updateState(objectState);
    }

    public render(): JSX.Element {
        const {
            objectState,
            collapsed,
            labels,
            attributes,
            frameNumber,
            activated,
            colorBy,
            colors,
            normalizedKeyMap,
        } = this.props;

        const {
            first,
            prev,
            next,
            last,
        } = objectState.keyframes || {
            first: null, // shapes don't have keyframes, so we use null
            prev: null,
            next: null,
            last: null,
        };

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
                occluded={objectState.occluded}
                outside={objectState.outside}
                locked={objectState.lock}
                pinned={objectState.pinned}
                hidden={objectState.hidden}
                keyframe={objectState.keyframe}
                attrValues={{ ...objectState.attributes }}
                labelID={objectState.label.id}
                color={stateColor}
                colors={colors}
                attributes={attributes}
                normalizedKeyMap={normalizedKeyMap}
                labels={labels}
                collapsed={collapsed}
                navigateFirstKeyframe={
                    first >= frameNumber || first === null
                        ? null : this.navigateFirstKeyframe
                }
                navigatePrevKeyframe={
                    prev === frameNumber || prev === null
                        ? null : this.navigatePrevKeyframe
                }
                navigateNextKeyframe={
                    next === frameNumber || next === null
                        ? null : this.navigateNextKeyframe
                }
                navigateLastKeyframe={
                    last <= frameNumber || last === null
                        ? null : this.navigateLastKeyframe
                }
                activate={this.activate}
                remove={this.remove}
                copy={this.copy}
                propagate={this.propagate}
                createURL={this.createURL}
                toBackground={this.toBackground}
                toForeground={this.toForeground}
                setOccluded={this.setOccluded}
                unsetOccluded={this.unsetOccluded}
                setOutside={this.setOutside}
                unsetOutside={this.unsetOutside}
                setKeyframe={this.setKeyframe}
                unsetKeyframe={this.unsetKeyframe}
                lock={this.lock}
                unlock={this.unlock}
                pin={this.pin}
                unpin={this.unpin}
                hide={this.hide}
                show={this.show}
                changeColor={this.changeColor}
                changeLabel={this.changeLabel}
                changeAttribute={this.changeAttribute}
                collapse={this.collapse}
                switchCuboidOrientation={this.switchCuboidOrientation}
                resetCuboidPerspective={() => this.resetCuboidPerspective()}
            />
        );
    }
}

export default connect<StateToProps, DispatchToProps, OwnProps, CombinedState>(
    mapStateToProps,
    mapDispatchToProps,
)(ObjectItemContainer);
