// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { connect } from 'react-redux';
import { GlobalHotKeys, KeyMap } from 'react-hotkeys';

import ObjectsListComponent from 'components/annotation-page/standard-workspace/objects-side-bar/objects-list';
import {
    updateAnnotationsAsync,
    removeObjectAsync,
    changeFrameAsync,
    collapseObjectItems,
    copyShape as copyShapeAction,
    propagateObject as propagateObjectAction,
} from 'actions/annotation-actions';

import {
    CombinedState,
    StatesOrdering,
    ObjectType,
} from 'reducers/interfaces';

interface StateToProps {
    jobInstance: any;
    frameNumber: any;
    listHeight: number;
    statesHidden: boolean;
    statesLocked: boolean;
    statesCollapsed: boolean;
    objectStates: any[];
    annotationsFilters: string[];
    activatedStateID: number | null;
    minZLayer: number;
    maxZLayer: number;
    annotationsFiltersHistory: string[];
}

interface DispatchToProps {
    updateAnnotations(states: any[]): void;
    collapseStates(states: any[], value: boolean): void;
    removeObject: (sessionInstance: any, objectState: any, force: boolean) => void;
    copyShape: (objectState: any) => void;
    propagateObject: (objectState: any) => void;
    changeFrame(frame: number): void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const {
        annotation: {
            annotations: {
                states: objectStates,
                filters: annotationsFilters,
                filtersHistory: annotationsFiltersHistory,
                collapsed,
                activatedStateID,
                zLayer: {
                    min: minZLayer,
                    max: maxZLayer,
                },
            },
            job: {
                instance: jobInstance,
            },
            player: {
                frame: {
                    number: frameNumber,
                },
            },
            tabContentHeight: listHeight,
        },
    } = state;

    let statesHidden = true;
    let statesLocked = true;
    let statesCollapsed = true;

    objectStates.forEach((objectState: any) => {
        const { clientID, lock } = objectState;
        if (!lock) {
            if (objectState.objectType !== ObjectType.TAG) {
                statesHidden = statesHidden && objectState.hidden;
            }
            statesLocked = statesLocked && objectState.lock;
        }
        const stateCollapsed = clientID in collapsed ? collapsed[clientID] : true;
        statesCollapsed = statesCollapsed && stateCollapsed;
    });

    return {
        listHeight,
        statesHidden,
        statesLocked,
        statesCollapsed,
        objectStates,
        frameNumber,
        jobInstance,
        annotationsFilters,
        activatedStateID,
        minZLayer,
        maxZLayer,
        annotationsFiltersHistory,
    };
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        updateAnnotations(states: any[]): void {
            dispatch(updateAnnotationsAsync(states));
        },
        collapseStates(states: any[], collapsed: boolean): void {
            dispatch(collapseObjectItems(states, collapsed));
        },
        removeObject(sessionInstance: any, objectState: any, force: boolean): void {
            dispatch(removeObjectAsync(sessionInstance, objectState, force));
        },
        copyShape(objectState: any): void {
            dispatch(copyShapeAction(objectState));
        },
        propagateObject(objectState: any): void {
            dispatch(propagateObjectAction(objectState));
        },
        changeFrame(frame: number): void {
            dispatch(changeFrameAsync(frame));
        },
    };
}

function sortAndMap(objectStates: any[], ordering: StatesOrdering): number[] {
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

type Props = StateToProps & DispatchToProps;

interface State {
    statesOrdering: StatesOrdering;
    objectStates: any[];
    sortedStatesID: number[];
}

class ObjectsListContainer extends React.PureComponent<Props, State> {
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
        const {
            objectStates,
            updateAnnotations,
        } = this.props;
        for (const objectState of objectStates) {
            objectState.lock = locked;
        }

        updateAnnotations(objectStates);
    }

    private hideAllStates(hidden: boolean): void {
        const {
            objectStates,
            updateAnnotations,
        } = this.props;
        for (const objectState of objectStates) {
            objectState.hidden = hidden;
        }

        updateAnnotations(objectStates);
    }

    private collapseAllStates(collapsed: boolean): void {
        const {
            objectStates,
            collapseStates,
        } = this.props;

        collapseStates(objectStates, collapsed);
    }

    public render(): JSX.Element {
        const {
            statesHidden,
            statesLocked,
            activatedStateID,
            objectStates,
            jobInstance,
            updateAnnotations,
            removeObject,
            copyShape,
            propagateObject,
            changeFrame,
            maxZLayer,
            minZLayer,
        } = this.props;
        const {
            sortedStatesID,
            statesOrdering,
        } = this.state;

        const keyMap = {
            SWITCH_ALL_LOCK: {
                name: 'Lock/unlock all objects',
                description: 'Change locked state for all objects in the side bar',
                sequence: 't+l',
                action: 'keydown',
            },
            SWITCH_LOCK: {
                name: 'Lock/unlock an object',
                description: 'Change locked state for an active object',
                sequence: 'l',
                action: 'keydown',
            },
            SWITCH_ALL_HIDDEN: {
                name: 'Hide/show all objects',
                description: 'Change hidden state for objects in the side bar',
                sequence: 't+h',
                action: 'keydown',
            },
            SWITCH_HIDDEN: {
                name: 'Hide/show an object',
                description: 'Change hidden state for an active object',
                sequence: 'h',
                action: 'keydown',
            },
            SWITCH_OCCLUDED: {
                name: 'Switch occluded',
                description: 'Change occluded property for an active object',
                sequences: ['q', '/'],
                action: 'keydown',
            },
            SWITCH_KEYFRAME: {
                name: 'Switch keyframe',
                description: 'Change keyframe property for an active track',
                sequence: 'k',
                action: 'keydown',
            },
            SWITCH_OUTSIDE: {
                name: 'Switch outside',
                description: 'Change outside property for an active track',
                sequence: 'o',
                action: 'keydown',
            },
            DELETE_OBJECT: {
                name: 'Delete object',
                description: 'Delete an active object. Use shift to force delete of locked objects',
                sequences: ['del', 'shift+del'],
                action: 'keydown',
            },
            TO_BACKGROUND: {
                name: 'To background',
                description: 'Put an active object "farther" from the user (decrease z axis value)',
                sequences: ['-', '_'],
                action: 'keydown',
            },
            TO_FOREGROUND: {
                name: 'To foreground',
                description: 'Put an active object "closer" to the user (increase z axis value)',
                sequences: ['+', '='],
                action: 'keydown',
            },
            COPY_SHAPE: {
                name: 'Copy shape',
                description: 'Copy shape to CVAT internal clipboard',
                sequence: 'ctrl+c',
                action: 'keydown',
            },
            PROPAGATE_OBJECT: {
                name: 'Propagate object',
                description: 'Make a copy of the object on the following frames',
                sequence: 'ctrl+b',
                action: 'keydown',
            },
            NEXT_KEY_FRAME: {
                name: 'Next keyframe',
                description: 'Go to the next keyframe of an active track',
                sequence: 'r',
                action: 'keydown',
            },
            PREV_KEY_FRAME: {
                name: 'Previous keyframe',
                description: 'Go to the previous keyframe of an active track',
                sequence: 'e',
                action: 'keydown',
            },
        };

        const preventDefault = (event: KeyboardEvent | undefined): void => {
            if (event) {
                event.preventDefault();
            }
        };

        const activatedStated = (): any | null => {
            if (activatedStateID !== null) {
                const [state] = objectStates
                    .filter((objectState: any): boolean => (
                        objectState.clientID === activatedStateID
                    ));

                return state || null;
            }

            return null;
        };

        const handlers = {
            SWITCH_ALL_LOCK: (event: KeyboardEvent | undefined) => {
                preventDefault(event);
                this.lockAllStates(!statesLocked);
            },
            SWITCH_LOCK: (event: KeyboardEvent | undefined) => {
                preventDefault(event);
                const state = activatedStated();
                if (state) {
                    state.lock = !state.lock;
                    updateAnnotations([state]);
                }
            },
            SWITCH_ALL_HIDDEN: (event: KeyboardEvent | undefined) => {
                preventDefault(event);
                this.hideAllStates(!statesHidden);
            },
            SWITCH_HIDDEN: (event: KeyboardEvent | undefined) => {
                preventDefault(event);
                const state = activatedStated();
                if (state) {
                    state.hidden = !state.hidden;
                    updateAnnotations([state]);
                }
            },
            SWITCH_OCCLUDED: (event: KeyboardEvent | undefined) => {
                preventDefault(event);
                const state = activatedStated();
                if (state && state.objectType !== ObjectType.TAG) {
                    state.occluded = !state.occluded;
                    updateAnnotations([state]);
                }
            },
            SWITCH_KEYFRAME: (event: KeyboardEvent | undefined) => {
                preventDefault(event);
                const state = activatedStated();
                if (state && state.objectType === ObjectType.TRACK) {
                    state.keyframe = !state.keyframe;
                    updateAnnotations([state]);
                }
            },
            SWITCH_OUTSIDE: (event: KeyboardEvent | undefined) => {
                preventDefault(event);
                const state = activatedStated();
                if (state && state.objectType === ObjectType.TRACK) {
                    state.outside = !state.outside;
                    updateAnnotations([state]);
                }
            },
            DELETE_OBJECT: (event: KeyboardEvent | undefined) => {
                preventDefault(event);
                const state = activatedStated();
                if (state) {
                    removeObject(jobInstance, state, event ? event.shiftKey : false);
                }
            },
            TO_BACKGROUND: (event: KeyboardEvent | undefined) => {
                preventDefault(event);
                const state = activatedStated();
                if (state && state.objectType !== ObjectType.TAG) {
                    state.zOrder = minZLayer - 1;
                    updateAnnotations([state]);
                }
            },
            TO_FOREGROUND: (event: KeyboardEvent | undefined) => {
                preventDefault(event);
                const state = activatedStated();
                if (state && state.objectType !== ObjectType.TAG) {
                    state.zOrder = maxZLayer + 1;
                    updateAnnotations([state]);
                }
            },
            COPY_SHAPE: (event: KeyboardEvent | undefined) => {
                preventDefault(event);
                const state = activatedStated();
                if (state) {
                    copyShape(state);
                }
            },
            PROPAGATE_OBJECT: (event: KeyboardEvent | undefined) => {
                preventDefault(event);
                const state = activatedStated();
                if (state) {
                    propagateObject(state);
                }
            },
            NEXT_KEY_FRAME: (event: KeyboardEvent | undefined) => {
                preventDefault(event);
                const state = activatedStated();
                if (state && state.objectType === ObjectType.TRACK) {
                    const frame = typeof (state.keyframes.next) === 'number'
                        ? state.keyframes.next : null;
                    if (frame !== null) {
                        changeFrame(frame);
                    }
                }
            },
            PREV_KEY_FRAME: (event: KeyboardEvent | undefined) => {
                preventDefault(event);
                const state = activatedStated();
                if (state && state.objectType === ObjectType.TRACK) {
                    const frame = typeof (state.keyframes.prev) === 'number'
                        ? state.keyframes.prev : null;
                    if (frame !== null) {
                        changeFrame(frame);
                    }
                }
            },
        };

        return (
            <>
                <GlobalHotKeys keyMap={keyMap as any as KeyMap} handlers={handlers} allowChanges />
                <ObjectsListComponent
                    {...this.props}
                    statesOrdering={statesOrdering}
                    sortedStatesID={sortedStatesID}
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

export default connect(
    mapStateToProps,
    mapDispatchToProps,
)(ObjectsListContainer);
