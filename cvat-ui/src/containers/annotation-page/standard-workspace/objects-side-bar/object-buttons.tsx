// Copyright (C) 2020-2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { connect } from 'react-redux';

import { LogType } from 'cvat-logger';
import isAbleToChangeFrame from 'utils/is-able-to-change-frame';
import { ThunkDispatch } from 'utils/redux';
import { updateAnnotationsAsync, changeFrameAsync } from 'actions/annotation-actions';
import { CombinedState } from 'reducers/interfaces';
import ItemButtonsComponent from 'components/annotation-page/standard-workspace/objects-side-bar/object-item-buttons';

interface OwnProps {
    readonly: boolean;
    clientID: number;
    outsideDisabled?: boolean;
    hiddenDisabled?: boolean;
    keyframeDisabled?: boolean;
}

interface StateToProps {
    objectState: any;
    jobInstance: any;
    frameNumber: number;
    normalizedKeyMap: Record<string, string>;
    outsideDisabled: boolean;
    hiddenDisabled: boolean;
    keyframeDisabled: boolean;
}

interface DispatchToProps {
    updateAnnotations(statesToUpdate: any[]): void;
    changeFrame(frame: number): void;
}

function mapStateToProps(state: CombinedState, own: OwnProps): StateToProps {
    const {
        annotation: {
            annotations: { states },
            job: { instance: jobInstance },
            player: {
                frame: { number: frameNumber },
            },
        },
        shortcuts: { normalizedKeyMap },
    } = state;

    const {
        clientID, outsideDisabled, hiddenDisabled, keyframeDisabled,
    } = own;
    const [objectState] = states.filter((_objectState): boolean => _objectState.clientID === clientID);

    return {
        objectState,
        normalizedKeyMap,
        frameNumber,
        jobInstance,
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
    };
}

class ItemButtonsWrapper extends React.PureComponent<StateToProps & DispatchToProps & OwnProps> {
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

    private lock = (): void => {
        const { objectState, jobInstance, readonly } = this.props;
        if (!readonly) {
            jobInstance.logger.log(LogType.lockObject, { locked: true });
            objectState.lock = true;
            this.commit();
        }
    };

    private unlock = (): void => {
        const { objectState, jobInstance, readonly } = this.props;
        if (!readonly) {
            jobInstance.logger.log(LogType.lockObject, { locked: false });
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
        const { objectState, readonly } = this.props;
        if (!readonly) {
            objectState.hidden = false;
            this.commit();
        }
    };

    private hide = (): void => {
        const { objectState, readonly } = this.props;
        if (!readonly) {
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
        const { objectState, readonly, updateAnnotations } = this.props;

        if (!readonly) {
            updateAnnotations([objectState]);
        }
    }

    private changeFrame(frame: number): void {
        const { changeFrame } = this.props;
        if (isAbleToChangeFrame()) {
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

        return (
            <ItemButtonsComponent
                readonly={readonly}
                objectType={objectState.objectType}
                shapeType={objectState.shapeType}
                occluded={objectState.occluded}
                outside={objectState.outside}
                locked={objectState.lock}
                pinned={objectState.pinned}
                hidden={objectState.hidden}
                keyframe={objectState.keyframe}
                switchOccludedShortcut={normalizedKeyMap.SWITCH_OCCLUDED}
                switchOutsideShortcut={normalizedKeyMap.SWITCH_OUTSIDE}
                switchLockShortcut={normalizedKeyMap.SWITCH_LOCK}
                switchHiddenShortcut={normalizedKeyMap.SWITCH_HIDDEN}
                switchKeyFrameShortcut={normalizedKeyMap.SWITCH_KEYFRAME}
                nextKeyFrameShortcut={normalizedKeyMap.NEXT_KEY_FRAME}
                prevKeyFrameShortcut={normalizedKeyMap.PREV_KEY_FRAME}
                outsideDisabled={outsideDisabled}
                hiddenDisabled={hiddenDisabled}
                keyframeDisabled={keyframeDisabled}
                navigateFirstKeyframe={first >= frameNumber || first === null ? null : this.navigateFirstKeyframe}
                navigatePrevKeyframe={prev === frameNumber || prev === null ? null : this.navigatePrevKeyframe}
                navigateNextKeyframe={next === frameNumber || next === null ? null : this.navigateNextKeyframe}
                navigateLastKeyframe={last <= frameNumber || last === null ? null : this.navigateLastKeyframe}
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
