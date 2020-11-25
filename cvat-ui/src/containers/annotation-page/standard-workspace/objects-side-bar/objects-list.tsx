// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { connect } from 'react-redux';
import { GlobalHotKeys, ExtendedKeyMapOptions } from 'react-hotkeys';

import ObjectsListComponent from 'components/annotation-page/standard-workspace/objects-side-bar/objects-list';
import {
    updateAnnotationsAsync,
    removeObjectAsync,
    changeFrameAsync,
    collapseObjectItems,
    copyShape as copyShapeAction,
    propagateObject as propagateObjectAction,
    changeGroupColorAsync,
} from 'actions/annotation-actions';
import { Canvas } from 'cvat-canvas-wrapper';
import { CombinedState, StatesOrdering, ObjectType, ColorBy } from 'reducers/interfaces';

interface StateToProps {
    jobInstance: any;
    frameNumber: any;
    listHeight: number;
    statesHidden: boolean;
    statesLocked: boolean;
    statesCollapsedAll: boolean;
    collapsedStates: Record<number, boolean>;
    objectStates: any[];
    annotationsFilters: string[];
    colors: string[];
    colorBy: ColorBy;
    activatedStateID: number | null;
    minZLayer: number;
    maxZLayer: number;
    annotationsFiltersHistory: string[];
    keyMap: Record<string, ExtendedKeyMapOptions>;
    normalizedKeyMap: Record<string, string>;
    canvasInstance: Canvas;
}

interface DispatchToProps {
    updateAnnotations(states: any[]): void;
    collapseStates(states: any[], value: boolean): void;
    removeObject: (sessionInstance: any, objectState: any, force: boolean) => void;
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
                filtersHistory: annotationsFiltersHistory,
                collapsed,
                collapsedAll,
                activatedStateID,
                zLayer: { min: minZLayer, max: maxZLayer },
            },
            job: { instance: jobInstance },
            player: {
                frame: { number: frameNumber },
            },
            canvas: { instance: canvasInstance },
            tabContentHeight: listHeight,
            colors,
        },
        settings: {
            shapes: { colorBy },
        },
        shortcuts: { keyMap, normalizedKeyMap },
    } = state;

    let statesHidden = true;
    let statesLocked = true;

    objectStates.forEach((objectState: any) => {
        const { lock } = objectState;
        if (!lock) {
            if (objectState.objectType !== ObjectType.TAG) {
                statesHidden = statesHidden && objectState.hidden;
            }
            statesLocked = statesLocked && objectState.lock;
        }
    });

    return {
        listHeight,
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
        minZLayer,
        maxZLayer,
        annotationsFiltersHistory,
        keyMap,
        normalizedKeyMap,
        canvasInstance,
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
        changeGroupColor(group: number, color: string): void {
            dispatch(changeGroupColorAsync(group, color));
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
        const { objectStates, updateAnnotations } = this.props;
        for (const objectState of objectStates) {
            objectState.lock = locked;
        }

        updateAnnotations(objectStates);
    }

    private hideAllStates(hidden: boolean): void {
        const { objectStates, updateAnnotations } = this.props;
        for (const objectState of objectStates) {
            objectState.hidden = hidden;
        }

        updateAnnotations(objectStates);
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
            jobInstance,
            updateAnnotations,
            changeGroupColor,
            removeObject,
            copyShape,
            propagateObject,
            changeFrame,
            maxZLayer,
            minZLayer,
            keyMap,
            normalizedKeyMap,
            canvasInstance,
            colors,
            colorBy,
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
        };

        const preventDefault = (event: KeyboardEvent | undefined): void => {
            if (event) {
                event.preventDefault();
            }
        };

        const activatedStated = (): any | null => {
            if (activatedStateID !== null) {
                const [state] = objectStates.filter(
                    (objectState: any): boolean => objectState.clientID === activatedStateID,
                );

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
            CHANGE_OBJECT_COLOR: (event: KeyboardEvent | undefined) => {
                preventDefault(event);
                const state = activatedStated();
                if (state) {
                    if (colorBy === ColorBy.GROUP) {
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
                    const frame = typeof state.keyframes.next === 'number' ? state.keyframes.next : null;
                    if (frame !== null && canvasInstance.isAbleToChangeFrame()) {
                        changeFrame(frame);
                    }
                }
            },
            PREV_KEY_FRAME: (event: KeyboardEvent | undefined) => {
                preventDefault(event);
                const state = activatedStated();
                if (state && state.objectType === ObjectType.TRACK) {
                    const frame = typeof state.keyframes.prev === 'number' ? state.keyframes.prev : null;
                    if (frame !== null && canvasInstance.isAbleToChangeFrame()) {
                        changeFrame(frame);
                    }
                }
            },
        };

        return (
            <>
                <GlobalHotKeys keyMap={subKeyMap} handlers={handlers} allowChanges />
                <ObjectsListComponent
                    {...this.props}
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

export default connect(mapStateToProps, mapDispatchToProps)(ObjectsListContainer);
