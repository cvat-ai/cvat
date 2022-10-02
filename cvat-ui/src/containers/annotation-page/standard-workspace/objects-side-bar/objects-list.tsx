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
    changeGroupColorAsync,
    copyShape as copyShapeAction,
    propagateObject as propagateObjectAction,
    removeObjects as removeObjectsAction,
    collapseAll,
    collapseLabelGroups,
} from 'actions/annotation-actions';
import isAbleToChangeFrame from 'utils/is-able-to-change-frame';
import {
    CombinedState, StatesOrdering, ObjectType, ColorBy,
} from 'reducers';
import { Label, ObjectState, ShapeType } from 'cvat-core-wrapper';
import { groupAndSort } from './object-list-sorter';

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
    collapsedLabelStates: Record<number, boolean>;
    objectStates: ObjectState[];
    annotationsFilters: any[];
    colors: string[];
    colorBy: ColorBy;
    activatedStateIDs: number[];
    activatedElementID: number | null;
    minZLayer: number;
    maxZLayer: number;
    keyMap: KeyMap;
    normalizedKeyMap: Record<string, string>;
}

interface DispatchToProps {
    updateAnnotations(states: any[]): void;
    collapseAll(value: boolean): void;
    collapseLabelGroups(labelIDs: number[], value: boolean): void;
    removeObjects: (objectStates: ObjectState[], force: boolean) => void;
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
                collapsedLabels,
                collapsedAll,
                activatedStateIDs,
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
        collapsedLabelStates: collapsedLabels,
        objectStates,
        frameNumber,
        jobInstance,
        annotationsFilters,
        colors,
        colorBy,
        activatedStateIDs,
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
        collapseAll(value: boolean): void {
            dispatch(collapseAll(value));
        },
        collapseLabelGroups(labelIDs: number[], value: boolean): void {
            dispatch(collapseLabelGroups(labelIDs, value));
        },
        removeObjects(objectStates: ObjectState[], force: boolean): void {
            dispatch(removeObjectsAction(objectStates, force));
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

type Props = StateToProps & DispatchToProps & OwnProps;

interface State {
    statesOrdering: StatesOrdering;
    objectStates: ObjectState[];
    groupedObjects: (Label | ObjectState)[];
    collapsedStates: Record<number, boolean>;
    collapsedLabelStates: Record<number, boolean>;
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
            groupedObjects: [],
            collapsedStates: [],
            collapsedLabelStates: [],
        };
    }

    static getDerivedStateFromProps(props: Props, state: State): State | null {
        // Only re-render if objectStates or label collapsed-ness has changed
        if (props.objectStates === state.objectStates && props.collapsedLabelStates === state.collapsedLabelStates && props.collapsedStates === state.collapsedStates) {
            return null;
        }
        return {
            ...state,
            objectStates: props.objectStates,
            groupedObjects: groupAndSort(props.objectStates, state.statesOrdering, props.collapsedLabelStates),
            collapsedStates: props.collapsedStates,
            collapsedLabelStates: props.collapsedLabelStates,
        };
    }

    private onChangeStatesOrdering = (statesOrdering: StatesOrdering): void => {
        const { objectStates } = this.props;
        this.setState({
            statesOrdering,
            groupedObjects: groupAndSort(objectStates, statesOrdering, this.props.collapsedLabelStates),
        });
    };

    private onLockAllStates = (): void => {
        this.lockAllStates(true);
    };

    private onUnlockAllStates = (): void => {
        this.lockAllStates(false);
    };

    private onCollapseAllStates = (): void => {
        this.props.collapseAll(true);
    };

    private onExpandAllStates = (): void => {
        this.props.collapseAll(false);
    };

    private onHideAllStates = (): void => {
        this.hideAllStates(true);
    };

    private onShowAllStates = (): void => {
        this.hideAllStates(false);
    };

    private onCollapseLabelGroup = (labelID: number, value: boolean): void => {
        this.props.collapseLabelGroups([labelID], value);
    }

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

    public render(): JSX.Element {
        const {
            statesHidden,
            statesLocked,
            activatedStateIDs,
            activatedElementID,
            maxZLayer,
            minZLayer,
            keyMap,
            normalizedKeyMap,
            colors,
            colorBy,
            readonly,
            statesCollapsedAll,
            collapsedStates,
            collapsedLabelStates,
            updateAnnotations,
            changeGroupColor,
            removeObjects,
            copyShape,
            propagateObject,
            changeFrame,
        } = this.props;
        const { objectStates, groupedObjects, statesOrdering } = this.state;

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

        const getActivatedStates = (): any[] => {
            if (activatedElementID !== null) {
                const state = objectStates
                    .find((objectState: ObjectState): boolean => objectState.clientID === activatedStateIDs[0]);
                if (state && activatedElementID !== null) {
                    const element = state.elements
                        .find((_element: ObjectState): boolean => _element.clientID === activatedElementID);
                    return element ? [element] : [];
                }
            }
            return objectStates.filter((s) => s.clientID !== null && activatedStateIDs.includes(s.clientID));
        };

        const handlers = {
            TILT_UP: () => { }, // Handled by CVAT 3D Independently
            TILT_DOWN: () => { },
            ROTATE_LEFT: () => { },
            ROTATE_RIGHT: () => { },
            MOVE_UP: () => { },
            MOVE_DOWN: () => { },
            MOVE_LEFT: () => { },
            MOVE_RIGHT: () => { },
            ZOOM_IN: () => { },
            ZOOM_OUT: () => { },
            SWITCH_ALL_LOCK: (event: KeyboardEvent | undefined) => {
                preventDefault(event);
                this.lockAllStates(!statesLocked);
            },
            SWITCH_LOCK: (event: KeyboardEvent | undefined) => {
                preventDefault(event);
                const states = getActivatedStates();
                if (!readonly && states.length) {
                    for (const state of states) {
                        state.lock = !state.lock;
                    }
                    updateAnnotations(states);
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
                const states = getActivatedStates();
                if (!readonly && states.length) {
                    for (const state of states) {
                        state.hidden = !state.hidden;
                    }
                    updateAnnotations(states);
                }
            },
            SWITCH_OCCLUDED: (event: KeyboardEvent | undefined) => {
                preventDefault(event);
                const states = getActivatedStates().filter((state) => state.objectType !== ObjectType.TAG);
                if (!readonly && states.length) {
                    for (const state of states) {
                        state.occluded = !state.occluded;
                    }
                    updateAnnotations(states);
                }
            },
            SWITCH_KEYFRAME: (event: KeyboardEvent | undefined) => {
                preventDefault(event);
                const states = getActivatedStates().filter((state) => state.objectType === ObjectType.TRACK);
                if (!readonly && states.length) {
                    for (const state of states) {
                        state.keyframe = !state.keyframe;
                    }
                    updateAnnotations(states);
                }
            },
            SWITCH_OUTSIDE: (event: KeyboardEvent | undefined) => {
                preventDefault(event);
                const states = getActivatedStates().filter((state) => state.objectType === ObjectType.TRACK);
                if (!readonly && states.length) {
                    for (const state of states) {
                        state.outside = !state.outside;
                    }
                    updateAnnotations(states);
                }
            },
            DELETE_OBJECT: (event: KeyboardEvent | undefined) => {
                preventDefault(event);
                const states = getActivatedStates();
                if (!readonly && states.length) {
                    removeObjects(states, event ? event.shiftKey : false);
                }
            },
            CHANGE_OBJECT_COLOR: (event: KeyboardEvent | undefined) => {
                preventDefault(event);
                const states = getActivatedStates();
                if (states.length) {
                    if (colorBy === ColorBy.GROUP) {
                        // ROBTODO: experiment with changing multiple groups
                        const colorID = (colors.indexOf(states[0].group.color) + 1) % colors.length;
                        changeGroupColor(states[0].group.id, colors[colorID]);
                        return;
                    }

                    if (colorBy === ColorBy.INSTANCE) {
                        for (const state of states) {
                            const colorID = (colors.indexOf(state.color) + 1) % colors.length;
                            state.color = colors[colorID];
                        }
                        updateAnnotations(states);
                    }
                }
            },
            TO_BACKGROUND: (event: KeyboardEvent | undefined) => {
                preventDefault(event);
                const states = getActivatedStates().filter((state) => state.objectType !== ObjectType.TAG);
                if (states.length) {
                    for (const state of states) {
                        state.zOrder = minZLayer - 1;
                    }
                    updateAnnotations(states);
                }
            },
            TO_FOREGROUND: (event: KeyboardEvent | undefined) => {
                preventDefault(event);
                const states = getActivatedStates().filter((state) => state.objectType !== ObjectType.TAG);
                if (states.length) {
                    for (const state of states) {
                        state.zOrder = maxZLayer + 1;
                    }
                    updateAnnotations(states);
                }
            },
            COPY_SHAPE: (event: KeyboardEvent | undefined) => {
                preventDefault(event);
                const states = getActivatedStates();
                // TODO: only implemented for one shape at a time
                if (states.length && !readonly) {
                    copyShape(states[0]);
                }
            },
            PROPAGATE_OBJECT: (event: KeyboardEvent | undefined) => {
                preventDefault(event);
                const states = getActivatedStates();
                // TODO: only implemented for one shape at a time
                if (states.length && !readonly) {
                    propagateObject(states[0]);
                }
            },
            NEXT_KEY_FRAME: (event: KeyboardEvent | undefined) => {
                preventDefault(event);
                const state = getActivatedStates().filter((s) => s.objectType === ObjectType.TRACK)[0];
                if (state) {
                    const frame = typeof state.keyframes.next === 'number' ? state.keyframes.next : null;
                    if (frame !== null && isAbleToChangeFrame()) {
                        changeFrame(frame);
                    }
                }
            },
            PREV_KEY_FRAME: (event: KeyboardEvent | undefined) => {
                preventDefault(event);
                const state = getActivatedStates().filter((s) => s.objectType === ObjectType.TRACK)[0];
                if (state) {
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
                    collapsedStates={collapsedStates}
                    collapsedLabelStates={collapsedLabelStates}
                    readonly={readonly || false}
                    statesOrdering={statesOrdering}
                    groupedObjects={groupedObjects}
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
                    collapseLabelGroup={this.onCollapseLabelGroup}
                />
            </>
        );
    }
}

export default connect<StateToProps, DispatchToProps, OwnProps, CombinedState>(
    mapStateToProps, mapDispatchToProps,
)(ObjectsListContainer);
