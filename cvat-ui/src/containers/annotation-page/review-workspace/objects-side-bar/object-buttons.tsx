// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { connect } from 'react-redux';

import { Canvas } from 'cvat-canvas-wrapper';
import { ThunkDispatch } from 'utils/redux';
import { updateAnnotationsAsync, changeFrameAsync } from 'actions/annotation-actions';
import { CombinedState } from 'reducers/interfaces';
import ItemButtonsComponent from 'components/annotation-page/review-workspace/objects-side-bar/object-item-buttons';

interface OwnProps {
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
    canvasInstance: Canvas;
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
            canvas: { instance: canvasInstance },
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
        canvasInstance,
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

class ItemButtonsWrapper extends React.PureComponent<StateToProps & DispatchToProps> {
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

    private changeFrame(frame: number): void {
        const { changeFrame, canvasInstance } = this.props;
        if (canvasInstance.isAbleToChangeFrame()) {
            changeFrame(frame);
        }
    }

    public render(): JSX.Element {
        const { objectState, normalizedKeyMap, frameNumber } = this.props;

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
                objectType={objectState.objectType}
                nextKeyFrameShortcut={normalizedKeyMap.NEXT_KEY_FRAME}
                prevKeyFrameShortcut={normalizedKeyMap.PREV_KEY_FRAME}
                navigateFirstKeyframe={first >= frameNumber || first === null ? null : this.navigateFirstKeyframe}
                navigatePrevKeyframe={prev === frameNumber || prev === null ? null : this.navigatePrevKeyframe}
                navigateNextKeyframe={next === frameNumber || next === null ? null : this.navigateNextKeyframe}
                navigateLastKeyframe={last <= frameNumber || last === null ? null : this.navigateLastKeyframe}
            />
        );
    }
}

export default connect(mapStateToProps, mapDispatchToProps)(ItemButtonsWrapper);
