// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import PropTypes from 'prop-types';

import { connect } from 'react-redux';
import GlobalHotKeys, { KeyMap } from 'utils/mousetrap-react';

import ObjectsListComponent from 'components/annotation-page/standard-workspace/objects-side-bar/objects-list';
import {
    updateAnnotationsAsync,
    changeFrameAsync,
    collapseObjectItems,
    changeGroupColorAsync,
    copyShape as copyShapeAction,
    propagateObject as propagateObjectAction,
    removeObject as removeObjectAction,
} from 'actions/annotation-actions';
import isAbleToChangeFrame from 'utils/is-able-to-change-frame';
import {
    CombinedState, StatesOrdering, ObjectType, ColorBy,
} from 'reducers';
import { ObjectState, ShapeType } from 'cvat-core-wrapper';

interface OwnProps {
    readonly: boolean;
}

interface StateToProps {
    jobInstance: any;
    frameNumber: any;
    statesHidden: boolean;
    statesLocked: boolean;
    statesCollapsedAll: boolean;
    collapsedStates: Record<number, boolean>;
    objectStates: ObjectState[];
    annotationsFilters: any[];
    colors: string[];
    colorBy: ColorBy;
    activatedStateID: number | null;
    activatedElementID: number | null;
    minZLayer: number;
    maxZLayer: number;
    keyMap: KeyMap;
    normalizedKeyMap: Record<string, string>;
}

interface DispatchToProps {
    updateAnnotations(states: any[]): void;
    collapseStates(states: any[], value: boolean): void;
    removeObject: (objectState: any, force: boolean) => void;
    copyShape: (objectState: any) => void;
    propagateObject: (objectState: any) => void;
    changeFrame(frame: number): void;
    changeGroupColor(group: number, color: string): void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const {
        annotation: {
            annotations: {
                states: objectStates,
                filters: annotationsFilters,
                collapsed,
                collapsedAll,
                activatedStateID,
                activatedElementID,
                zLayer: { min: minZLayer, max: maxZLayer },
            },
            job: { instance: jobInstance },
            player: {
                frame: { number: frameNumber },
            },
            colors,
        },
        settings: {
            shapes: { colorBy },
        },
        shortcuts: { keyMap, normalizedKeyMap },
    } = state;

    let statesHidden = true;
    let statesLocked = true;

    objectStates.forEach((objectState: ObjectState) => {
        const { lock } = objectState;
        if (!lock) {
            if (objectState.objectType !== ObjectType.TAG) {
                if (objectState.shapeType === ShapeType.SKELETON) {
                    objectState.elements.forEach((element: ObjectState) => {
                        statesHidden = statesHidden && (element.lock || element.hidden);
                    });
                } else {
                    statesHidden = statesHidden && objectState.hidden;
                }
            }
            statesLocked = statesLocked && objectState.lock;
        }
    });

    return {
        statesHidden,
        statesLocked,
        statesCollapsedAll: collapsedAll,
        collapsedStates: collapsed,
        objectStates,
        frameNumber,
        jobInstance,
        annotationsFilters,
        colors,
        colorBy,
        activatedStateID,
        activatedElementID,
        minZLayer,
        maxZLayer,
        keyMap,
        normalizedKeyMap,
    };
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        updateAnnotations(states: ObjectState[]): void {
            dispatch(updateAnnotationsAsync(states));
        },
        collapseStates(states: ObjectState[], collapsed: boolean): void {
            dispatch(collapseObjectItems(states, collapsed));
        },
        removeObject(objectState: ObjectState, force: boolean): void {
            dispatch(removeObjectAction(objectState, force));
        },
        copyShape(objectState: ObjectState): void {
            dispatch(copyShapeAction(objectState));
        },
        propagateObject(objectState: ObjectState): void {
            dispatch(propagateObjectAction(objectState));
        },
        changeFrame(frame: number): void {
            dispatch(changeFrameAsync(frame));
        },
        changeGroupColor(group: number, color: string): void {
            dispatch(changeGroupColorAsync(group, color));
        },
    };
}

function sortAndMap(objectStates: ObjectState[], ordering: StatesOrdering): number[] {
    let sorted = [];
    if (ordering === StatesOrdering.ID_ASCENT) {
        sorted = [...objectStates].sort((a: any, b: any): number => a.clientID - b.clientID);
    } else if (ordering === StatesOrdering.ID_DESCENT) {
        sorted = [...objectStates].sort((a: any, b: any): number => b.clientID - a.clientID);
    } else {
        sorted = [...objectStates].sort((a: any, b: any): number => b.updated - a.updated);
    }

    return sorted.map((state: any) => state.clientID);
}

type Props = StateToProps & DispatchToProps & OwnProps;

interface State {
    statesOrdering: StatesOrdering;
    objectStates: ObjectState[];
    sortedStatesID: number[];
}

class ObjectsListContainer extends React.PureComponent<Props, State> {
    static propTypes = {
        readonly: PropTypes.bool,
    };

    static defaultProps = {
        readonly: false,
    };

    public constructor(props: Props) {
        super(props);
        this.state = {
            statesOrdering: StatesOrdering.ID_ASCENT,
            objectStates: [],
            sortedStatesID: [],
        };
    }

    static getDerivedStateFromProps(props: Props, state: State): State | null {
        if (props.objectStates === state.objectStates) {
            return null;
        }

        return {
            ...state,
            objectStates: props.objectStates,
            sortedStatesID: sortAndMap(props.objectStates, state.statesOrdering),
        };
    }

    private onChangeStatesOrdering = (statesOrdering: StatesOrdering): void => {
        const { objectStates } = this.props;
        this.setState({
            statesOrdering,
            sortedStatesID: sortAndMap(objectStates, statesOrdering),
        });
    };

    private onLockAllStates = (): void => {
        this.lockAllStates(true);
    };

    private onUnlockAllStates = (): void => {
        this.lockAllStates(false);
    };

    private onCollapseAllStates = (): void => {
        this.collapseAllStates(true);
    };

    private onExpandAllStates = (): void => {
        this.collapseAllStates(false);
    };

    private onHideAllStates = (): void => {
        this.hideAllStates(true);
    };

    private onShowAllStates = (): void => {
        this.hideAllStates(false);
    };

    private lockAllStates(locked: boolean): void {
        const { objectStates, updateAnnotations, readonly } = this.props;

        if (!readonly) {
            for (const objectState of objectStates) {
                objectState.lock = locked;
            }

            updateAnnotations(objectStates);
        }
    }

    private hideAllStates(hidden: boolean): void {
        const { objectStates, updateAnnotations, readonly } = this.props;

        if (!readonly) {
            for (const objectState of objectStates) {
                objectState.hidden = hidden;
            }

            updateAnnotations(objectStates);
        }
    }

    private collapseAllStates(collapsed: boolean): void {
        const { objectStates, collapseStates } = this.props;

        collapseStates(objectStates, collapsed);
    }

    public render(): JSX.Element {
        const {
            statesHidden,
            statesLocked,
            activatedStateID,
            activatedElementID,
            maxZLayer,
            minZLayer,
            keyMap,
            normalizedKeyMap,
            colors,
            colorBy,
            readonly,
            statesCollapsedAll,
            updateAnnotations,
            changeGroupColor,
            removeObject,
            copyShape,
            propagateObject,
            changeFrame,
        } = this.props;
        const { objectStates, sortedStatesID, statesOrdering } = this.state;

        const subKeyMap = {
            SWITCH_ALL_LOCK: keyMap.SWITCH_ALL_LOCK,
            SWITCH_LOCK: keyMap.SWITCH_LOCK,
            SWITCH_ALL_HIDDEN: keyMap.SWITCH_ALL_HIDDEN,
            SWITCH_HIDDEN: keyMap.SWITCH_HIDDEN,
            SWITCH_OCCLUDED: keyMap.SWITCH_OCCLUDED,
            SWITCH_KEYFRAME: keyMap.SWITCH_KEYFRAME,
            SWITCH_OUTSIDE: keyMap.SWITCH_OUTSIDE,
            DELETE_OBJECT: keyMap.DELETE_OBJECT,
            TO_BACKGROUND: keyMap.TO_BACKGROUND,
            TO_FOREGROUND: keyMap.TO_FOREGROUND,
            COPY_SHAPE: keyMap.COPY_SHAPE,
            PROPAGATE_OBJECT: keyMap.PROPAGATE_OBJECT,
            NEXT_KEY_FRAME: keyMap.NEXT_KEY_FRAME,
            PREV_KEY_FRAME: keyMap.PREV_KEY_FRAME,
            CHANGE_OBJECT_COLOR: keyMap.CHANGE_OBJECT_COLOR,
            TILT_UP: keyMap.TILT_UP,
            TILT_DOWN: keyMap.TILT_DOWN,
            ROTATE_LEFT: keyMap.ROTATE_LEFT,
            ROTATE_RIGHT: keyMap.ROTATE_RIGHT,
            MOVE_UP: keyMap.MOVE_UP,
            MOVE_DOWN: keyMap.MOVE_DOWN,
            MOVE_LEFT: keyMap.MOVE_LEFT,
            MOVE_RIGHT: keyMap.MOVE_RIGHT,
            ZOOM_IN: keyMap.ZOOM_IN,
            ZOOM_OUT: keyMap.ZOOM_OUT,
        };

        const preventDefault = (event: KeyboardEvent | undefined): void => {
            if (event) {
                event.preventDefault();
            }
        };

        const activatedState = (): ObjectState | null => {
            if (activatedStateID !== null) {
                const state = objectStates
                    .find((objectState: ObjectState): boolean => objectState.clientID === activatedStateID);

                if (state && activatedElementID !== null) {
                    const element = state.elements
                        .find((_element: ObjectState): boolean => _element.clientID === activatedElementID);
                    return element || null;
                }

                return state || null;
            }

            return null;
        };

        const handlers = {
            TILT_UP: () => {}, // Handled by CVAT 3D Independently
            TILT_DOWN: () => {},
            ROTATE_LEFT: () => {},
            ROTATE_RIGHT: () => {},
            MOVE_UP: () => {},
            MOVE_DOWN: () => {},
            MOVE_LEFT: () => {},
            MOVE_RIGHT: () => {},
            ZOOM_IN: () => {},
            ZOOM_OUT: () => {},
            SWITCH_ALL_LOCK: (event: KeyboardEvent | undefined) => {
                preventDefault(event);
                this.lockAllStates(!statesLocked);
            },
            SWITCH_LOCK: (event: KeyboardEvent | undefined) => {
                preventDefault(event);
                const state = activatedState();
                if (state && !readonly) {
                    state.lock = !state.lock;
                    updateAnnotations([state]);
                }
            },
            SWITCH_ALL_HIDDEN: (event: KeyboardEvent | undefined) => {
                preventDefault(event);
                if (!readonly) {
                    this.hideAllStates(!statesHidden);
                }
            },
            SWITCH_HIDDEN: (event: KeyboardEvent | undefined) => {
                preventDefault(event);
                const state = activatedState();
                if (state && !readonly) {
                    state.hidden = !state.hidden;
                    updateAnnotations([state]);
                }
            },
            SWITCH_OCCLUDED: (event: KeyboardEvent | undefined) => {
                preventDefault(event);
                const state = activatedState();
                if (state && !readonly && state.objectType !== ObjectType.TAG) {
                    state.occluded = !state.occluded;
                    updateAnnotations([state]);
                }
            },
            SWITCH_KEYFRAME: (event: KeyboardEvent | undefined) => {
                preventDefault(event);
                const state = activatedState();
                if (state && !readonly && state.objectType === ObjectType.TRACK) {
                    state.keyframe = !state.keyframe;
                    updateAnnotations([state]);
                }
            },
            SWITCH_OUTSIDE: (event: KeyboardEvent | undefined) => {
                preventDefault(event);
                const state = activatedState();
                if (state && !readonly && (state.objectType === ObjectType.TRACK || state.parentID)) {
                    state.outside = !state.outside;
                    updateAnnotations([state]);
                }
            },
            DELETE_OBJECT: (event: KeyboardEvent | undefined) => {
                preventDefault(event);
                const state = activatedState();
                if (state && !readonly) {
                    removeObject(state, event ? event.shiftKey : false);
                }
            },
            CHANGE_OBJECT_COLOR: (event: KeyboardEvent | undefined) => {
                preventDefault(event);
                const state = activatedState();
                if (state) {
                    if (colorBy === ColorBy.GROUP && state.group) {
                        const colorID = (colors.indexOf(state.group.color) + 1) % colors.length;
                        changeGroupColor(state.group.id, colors[colorID]);
                        return;
                    }

                    if (colorBy === ColorBy.INSTANCE) {
                        const colorID = (colors.indexOf(state.color) + 1) % colors.length;
                        state.color = colors[colorID];
                        updateAnnotations([state]);
                    }
                }
            },
            TO_BACKGROUND: (event: KeyboardEvent | undefined) => {
                preventDefault(event);
                const state = activatedState();
                if (state && !readonly && state.objectType !== ObjectType.TAG) {
                    state.zOrder = minZLayer - 1;
                    updateAnnotations([state]);
                }
            },
            TO_FOREGROUND: (event: KeyboardEvent | undefined) => {
                preventDefault(event);
                const state = activatedState();
                if (state && !readonly && state.objectType !== ObjectType.TAG) {
                    state.zOrder = maxZLayer + 1;
                    updateAnnotations([state]);
                }
            },
            COPY_SHAPE: (event: KeyboardEvent | undefined) => {
                preventDefault(event);
                const state = activatedState();
                if (state && !readonly) {
                    copyShape(state);
                }
            },
            PROPAGATE_OBJECT: (event: KeyboardEvent | undefined) => {
                preventDefault(event);
                const state = activatedState();
                if (state && !readonly) {
                    propagateObject(state);
                }
            },
            NEXT_KEY_FRAME: (event: KeyboardEvent | undefined) => {
                preventDefault(event);
                const state = activatedState();
                if (state && state.keyframes) {
                    const frame = typeof state.keyframes.next === 'number' ? state.keyframes.next : null;
                    if (frame !== null && isAbleToChangeFrame()) {
                        changeFrame(frame);
                    }
                }
            },
            PREV_KEY_FRAME: (event: KeyboardEvent | undefined) => {
                preventDefault(event);
                const state = activatedState();
                if (state && state.keyframes) {
                    const frame = typeof state.keyframes.prev === 'number' ? state.keyframes.prev : null;
                    if (frame !== null && isAbleToChangeFrame()) {
                        changeFrame(frame);
                    }
                }
            },
        };

        return (
            <>
                <GlobalHotKeys keyMap={subKeyMap} handlers={handlers} />
                <ObjectsListComponent
                    statesHidden={statesHidden}
                    statesLocked={statesLocked}
                    statesCollapsedAll={statesCollapsedAll}
                    readonly={readonly || false}
                    statesOrdering={statesOrdering}
                    sortedStatesID={sortedStatesID}
                    objectStates={objectStates}
                    switchHiddenAllShortcut={normalizedKeyMap.SWITCH_ALL_HIDDEN}
                    switchLockAllShortcut={normalizedKeyMap.SWITCH_ALL_LOCK}
                    changeStatesOrdering={this.onChangeStatesOrdering}
                    lockAllStates={this.onLockAllStates}
                    unlockAllStates={this.onUnlockAllStates}
                    collapseAllStates={this.onCollapseAllStates}
                    expandAllStates={this.onExpandAllStates}
                    hideAllStates={this.onHideAllStates}
                    showAllStates={this.onShowAllStates}
                />
            </>
        );
    }
}

export default connect<StateToProps, DispatchToProps, OwnProps, CombinedState>(
    mapStateToProps, mapDispatchToProps,
)(ObjectsListContainer);
