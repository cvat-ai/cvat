// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { connect } from 'react-redux';

import {
    activateObject as activateObjectAction,
    switchSimplifyVisibility as switchSimplifyVisibilityAction,
    updateAnnotationsAsync,
} from 'actions/annotation-actions';
import PolySimplifyControl from 'components/annotation-page/standard-workspace/controls-side-bar/poly-simplify-control';
import { Canvas, CanvasMode } from 'cvat-canvas-wrapper';
import { Canvas3d } from 'cvat-canvas3d-wrapper';
import { Job, ObjectState, ShapeType } from 'cvat-core-wrapper';
import { CombinedState } from 'reducers';
import openCVWrapper from 'utils/opencv-wrapper/opencv-wrapper';
import { getObjectStateByClientID } from 'utils/objects-sidebar';
import { ThunkDispatch } from 'utils/redux';

interface StateToProps {
    objectState: ObjectState | null;
    originalPoints: number[] | null;
    jobInstance: Job | null;
    canvasInstance: Canvas | Canvas3d | null;
    frameNumber: number;
    defaultApproxPolyAccuracy: number;
    repeatDrawShapeShortcut: { sequences: string[] };
}

interface DispatchToProps {
    activateObject(clientID: number): void;
    updateState(objectState: ObjectState): Promise<void>;
    close(clientID: number): void;
}

type Props = StateToProps & DispatchToProps;

interface SessionProps extends Omit<Props, 'objectState' | 'jobInstance'> {
    objectState: ObjectState;
    jobInstance: Job;
}

interface SessionState {
    active: boolean;
    approxPolyAccuracy: number;
}

class PolySimplifySession extends React.PureComponent<SessionProps, SessionState> {
    private readonly originalPoints: number[];
    private mounted = false;
    private frozen = false;
    private finished = false;
    private finishing = false;

    public constructor(props: SessionProps) {
        super(props);
        this.originalPoints = props.originalPoints ? [...props.originalPoints] : [...(props.objectState.points || [])];
        this.state = {
            active: false,
            approxPolyAccuracy: props.defaultApproxPolyAccuracy,
        };
    }

    public componentDidMount(): void {
        this.mounted = true;
        this.start();
    }

    public componentDidUpdate(prevProps: SessionProps): void {
        if (prevProps.frameNumber !== this.props.frameNumber ||
            prevProps.jobInstance !== this.props.jobInstance
        ) {
            this.cancel();
        } else if (!this.state.active &&
            prevProps.defaultApproxPolyAccuracy !== this.props.defaultApproxPolyAccuracy
        ) {
            this.setState({ approxPolyAccuracy: this.props.defaultApproxPolyAccuracy });
        }
    }

    public componentWillUnmount(): void {
        this.mounted = false;
        if (!this.finished) {
            if (this.state.active) {
                this.props.objectState.points = [...this.originalPoints];
                this.props.updateState(this.props.objectState);
            }
            this.unfreeze();
            this.props.close(this.props.objectState.clientID as number);
        }
    }

    private unfreeze = async (): Promise<void> => {
        if (this.frozen) {
            this.frozen = false;
            await this.props.jobInstance.actions.freeze(false);
        }
    };

    private start = async (): Promise<void> => {
        const {
            objectState, canvasInstance, activateObject, jobInstance, close,
        } = this.props;
        if (![ShapeType.POLYGON, ShapeType.POLYLINE].includes(objectState.shapeType)) {
            close(objectState.clientID as number);
            return;
        }

        activateObject(objectState.clientID as number);
        if (canvasInstance instanceof Canvas && canvasInstance.mode() !== CanvasMode.IDLE) {
            canvasInstance.cancel();
        }

        try {
            await jobInstance.actions.freeze(true);
            this.frozen = true;
            if (this.mounted) {
                this.setState({ active: true });
            } else {
                await this.unfreeze();
            }
        } catch (_error) {
            await this.unfreeze();
            if (this.mounted) {
                close(objectState.clientID as number);
            }
        }
    };

    private apply = async (simplifiedPoints: number[]): Promise<void> => {
        if (this.finishing || !this.state.active) {
            return;
        }
        this.finishing = true;
        const { objectState, updateState, close } = this.props;

        try {
            if (!openCVWrapper.isInitialized) {
                await openCVWrapper.initialize(() => {});
            }
            if (!this.mounted) return;

            // Preserve the existing undo/history behavior: restore the original before saving the result.
            objectState.points = [...this.originalPoints];
            await updateState(objectState);
            if (!this.mounted) return;

            await this.unfreeze();
            if (!this.mounted) return;

            objectState.points = [...simplifiedPoints];
            await updateState(objectState);
            if (!this.mounted) return;

            this.finished = true;
            close(objectState.clientID as number);
        } catch (error) {
            this.finishing = false;
            await this.cancel();
            throw error;
        } finally {
            this.finishing = false;
        }
    };

    private cancel = async (): Promise<void> => {
        if (this.finishing || this.finished) {
            return;
        }
        this.finishing = true;
        const { objectState, updateState, close } = this.props;

        try {
            if (this.state.active) {
                objectState.points = [...this.originalPoints];
                await updateState(objectState);
            }
        } finally {
            await this.unfreeze();
            if (this.mounted) {
                this.finished = true;
                close(objectState.clientID as number);
            }
            this.finishing = false;
        }
    };

    private updatePreview = async (points: number[]): Promise<void> => {
        if (this.mounted && this.state.active && !this.finishing) {
            const { objectState, updateState } = this.props;
            objectState.points = points;
            await updateState(objectState);
        }
    };

    private onChangeAccuracy = (approxPolyAccuracy: number): void => {
        this.setState({ approxPolyAccuracy });
    };

    public render(): JSX.Element | null {
        if (!this.state.active) {
            return null;
        }

        return (
            <PolySimplifyControl
                objectState={this.props.objectState}
                approxPolyAccuracy={this.state.approxPolyAccuracy}
                repeatDrawShapeShortcut={this.props.repeatDrawShapeShortcut}
                onChangeAccuracy={this.onChangeAccuracy}
                onApply={this.apply}
                onCancel={this.cancel}
                onUpdatePreview={this.updatePreview}
            />
        );
    }
}

function PolySimplifyController(props: Props): JSX.Element | null {
    const { objectState, jobInstance } = props;
    return objectState && jobInstance ? (
        <PolySimplifySession
            {...props}
            key={`${jobInstance.id}-${objectState.clientID}`}
            objectState={objectState}
            jobInstance={jobInstance}
        />
    ) : null;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const {
        annotation: {
            simplify: { objectState: requestedState, originalPoints },
            annotations: { states },
            job: { instance: jobInstance },
            canvas: { instance: canvasInstance },
            player: { frame: { number: frameNumber } },
        },
        settings: { workspace: { defaultApproxPolyAccuracy } },
        shortcuts: { keyMap },
    } = state;

    return {
        objectState: requestedState ?
            getObjectStateByClientID(states, requestedState.clientID as number) || requestedState : null,
        originalPoints,
        jobInstance: jobInstance as Job | null,
        canvasInstance: canvasInstance as Canvas | Canvas3d | null,
        frameNumber,
        defaultApproxPolyAccuracy,
        repeatDrawShapeShortcut: keyMap.SWITCH_DRAW_MODE_STANDARD_CONTROLS,
    };
}

function mapDispatchToProps(dispatch: ThunkDispatch): DispatchToProps {
    return {
        activateObject(clientID: number): void {
            dispatch(activateObjectAction(clientID, null, null));
        },
        updateState(objectState: ObjectState): Promise<void> {
            return dispatch(updateAnnotationsAsync([objectState]));
        },
        close(clientID: number): void {
            dispatch((innerDispatch, getState): void => {
                if (getState().annotation.simplify.objectState?.clientID === clientID) {
                    innerDispatch(switchSimplifyVisibilityAction(null));
                }
            });
        },
    };
}

export default connect<StateToProps, DispatchToProps, Record<string, unknown>, CombinedState>(
    mapStateToProps,
    mapDispatchToProps,
)(PolySimplifyController);
