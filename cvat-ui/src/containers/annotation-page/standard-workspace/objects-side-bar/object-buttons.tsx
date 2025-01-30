// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { connect } from 'react-redux';

import { ObjectState, Job } from 'cvat-core-wrapper';
import isAbleToChangeFrame from 'utils/is-able-to-change-frame';
import { ThunkDispatch } from 'utils/redux';
import { updateAnnotationsAsync, changeFrameAsync, changeHideActiveObjectAsync } from 'actions/annotation-actions';
import { CombinedState } from 'reducers';
import ItemButtonsComponent from 'components/annotation-page/standard-workspace/objects-side-bar/object-item-buttons';

interface OwnProps {
    readonly: boolean;
    clientID: number;
    outsideDisabled?: boolean;
    hiddenDisabled?: boolean;
    keyframeDisabled?: boolean;
}

interface StateToProps {
    objectState: ObjectState;
    jobInstance: Job;
    frameNumber: number;
    normalizedKeyMap: Record<string, string>;
    outsideDisabled: boolean;
    hiddenDisabled: boolean;
    keyframeDisabled: boolean;
    editedState: ObjectState | null,
}

interface DispatchToProps {
    updateAnnotations(statesToUpdate: any[]): void;
    changeFrame(frame: number): void;
    changeHideEditedState(value: boolean): void;
}

function mapStateToProps(state: CombinedState, own: OwnProps): StateToProps {
    const {
        annotation: {
            annotations: { states },
            job: { instance: jobInstance },
            player: {
                frame: { number: frameNumber },
            },
            editing: { objectState: editedState },
        },
        shortcuts: { normalizedKeyMap },
    } = state;

    const {
        clientID, outsideDisabled, hiddenDisabled, keyframeDisabled,
    } = own;
    let [objectState] = states.filter((_objectState): boolean => _objectState.clientID === clientID);
    if (!objectState) {
        const elements = states.map((_objectState: any): any[] => _objectState.elements).flat();
        [objectState] = elements.filter((_objectState): boolean => _objectState.clientID === clientID);
    }

    return {
        objectState,
        normalizedKeyMap,
        frameNumber,
        editedState,
        jobInstance: jobInstance as Job,
        outsideDisabled: typeof outsideDisabled === 'undefined' ? false : outsideDisabled,
        hiddenDisabled: typeof hiddenDisabled === 'undefined' ? false : hiddenDisabled,
        keyframeDisabled: typeof keyframeDisabled === 'undefined' ? false : keyframeDisabled,
    };
}

function mapDispatchToProps(dispatch: ThunkDispatch): DispatchToProps {
    return {
        updateAnnotations(states: any[]) {
            dispatch(updateAnnotationsAsync(states));
        },
        changeFrame(frame: number): void {
            dispatch(changeFrameAsync(frame));
        },
        changeHideEditedState(value: boolean): void {
            dispatch(changeHideActiveObjectAsync(value));
        },
    };
}

class ItemButtonsWrapper extends React.PureComponent<StateToProps & DispatchToProps & OwnProps> {
    private navigateFirstKeyframe = (): void => {
        const { objectState, frameNumber } = this.props;
        const { first } = objectState.keyframes as NonNullable<typeof objectState.keyframes>;
        if (first !== null && first !== frameNumber) {
            this.changeFrame(first);
        }
    };

    private navigatePrevKeyframe = (): void => {
        const { objectState, frameNumber } = this.props;
        const { prev } = objectState.keyframes as NonNullable<typeof objectState.keyframes>;
        if (prev !== null && prev !== frameNumber) {
            this.changeFrame(prev);
        }
    };

    private navigateNextKeyframe = (): void => {
        const { objectState, frameNumber } = this.props;
        const { next } = objectState.keyframes as NonNullable<typeof objectState.keyframes>;
        if (next !== null && next !== frameNumber) {
            this.changeFrame(next);
        }
    };

    private navigateLastKeyframe = (): void => {
        const { objectState, frameNumber } = this.props;
        const { last } = objectState.keyframes as NonNullable<typeof objectState.keyframes>;
        if (last !== null && last !== frameNumber) {
            this.changeFrame(last);
        }
    };

    private lock = (): void => {
        const { objectState, readonly } = this.props;
        if (!readonly) {
            objectState.lock = true;
            this.commit();
        }
    };

    private unlock = (): void => {
        const { objectState, readonly } = this.props;
        if (!readonly) {
            objectState.lock = false;
            this.commit();
        }
    };

    private pin = (): void => {
        const { objectState, readonly } = this.props;
        if (!readonly) {
            objectState.pinned = true;
            this.commit();
        }
    };

    private unpin = (): void => {
        const { objectState, readonly } = this.props;
        if (!readonly) {
            objectState.pinned = false;
            this.commit();
        }
    };

    private show = (): void => {
        const { objectState, editedState, changeHideEditedState } = this.props;
        if (objectState.clientID === editedState?.clientID) {
            changeHideEditedState(false);
        } else {
            objectState.hidden = false;
            this.commit();
        }
    };

    private hide = (): void => {
        const { objectState, editedState, changeHideEditedState } = this.props;
        if (objectState.clientID === editedState?.clientID) {
            changeHideEditedState(true);
        } else {
            objectState.hidden = true;
            this.commit();
        }
    };

    private setOccluded = (): void => {
        const { objectState, readonly } = this.props;
        if (!readonly) {
            objectState.occluded = true;
            this.commit();
        }
    };

    private unsetOccluded = (): void => {
        const { objectState, readonly } = this.props;
        if (!readonly) {
            objectState.occluded = false;
            this.commit();
        }
    };

    private setOutside = (): void => {
        const { objectState, readonly } = this.props;
        if (!readonly) {
            objectState.outside = true;
            this.commit();
        }
    };

    private unsetOutside = (): void => {
        const { objectState, readonly } = this.props;
        if (!readonly) {
            objectState.outside = false;
            this.commit();
        }
    };

    private setKeyframe = (): void => {
        const { objectState, readonly } = this.props;
        if (!readonly) {
            objectState.keyframe = true;
            this.commit();
        }
    };

    private unsetKeyframe = (): void => {
        const { objectState, readonly } = this.props;
        if (!readonly) {
            objectState.keyframe = false;
            this.commit();
        }
    };

    private commit(): void {
        const { objectState, updateAnnotations } = this.props;
        updateAnnotations([objectState]);
    }

    private changeFrame(frame: number): void {
        const { changeFrame } = this.props;
        if (isAbleToChangeFrame(frame)) {
            changeFrame(frame);
        }
    }

    public render(): JSX.Element {
        const {
            objectState,
            readonly,
            frameNumber,
            outsideDisabled,
            hiddenDisabled,
            keyframeDisabled,
            normalizedKeyMap,
        } = this.props;

        const {
            first, prev, next, last,
        } = objectState.keyframes || {
            first: null, // shapes don't have keyframes, so we use null
            prev: null,
            next: null,
            last: null,
        };

        const {
            parentID, objectType, shapeType,
            occluded, outside, lock, pinned, hidden, keyframe,
        } = objectState;

        return (
            <ItemButtonsComponent
                readonly={readonly}
                parentID={parentID}
                objectType={objectType}
                shapeType={shapeType}
                occluded={occluded}
                outside={outside}
                locked={lock}
                pinned={pinned}
                hidden={hidden}
                keyframe={keyframe}
                switchOccludedShortcut={normalizedKeyMap.SWITCH_OCCLUDED}
                switchPinnedShortcut={normalizedKeyMap.SWITCH_PINNED}
                switchOutsideShortcut={normalizedKeyMap.SWITCH_OUTSIDE}
                switchLockShortcut={normalizedKeyMap.SWITCH_LOCK}
                switchHiddenShortcut={normalizedKeyMap.SWITCH_HIDDEN}
                switchKeyFrameShortcut={normalizedKeyMap.SWITCH_KEYFRAME}
                nextKeyFrameShortcut={normalizedKeyMap.NEXT_KEY_FRAME}
                prevKeyFrameShortcut={normalizedKeyMap.PREV_KEY_FRAME}
                outsideDisabled={outsideDisabled}
                hiddenDisabled={hiddenDisabled}
                keyframeDisabled={keyframeDisabled || (first === last && keyframe)}
                navigateFirstKeyframe={first === null || first >= frameNumber ? null : this.navigateFirstKeyframe}
                navigatePrevKeyframe={prev === null || prev === frameNumber ? null : this.navigatePrevKeyframe}
                navigateNextKeyframe={next === null || next === frameNumber ? null : this.navigateNextKeyframe}
                navigateLastKeyframe={last === null || last <= frameNumber ? null : this.navigateLastKeyframe}
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
            />
        );
    }
}

export default connect(mapStateToProps, mapDispatchToProps)(ItemButtonsWrapper);
