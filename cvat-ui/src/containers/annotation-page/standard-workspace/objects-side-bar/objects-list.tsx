// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
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
    switchPropagateVisibility as switchPropagateVisibilityAction,
    removeObject as removeObjectAction,
    fetchAnnotationsAsync,
    changeHideActiveObjectAsync,
} from 'actions/annotation-actions';
import {
    changeShowGroundTruth as changeShowGroundTruthAction,
} from 'actions/settings-actions';
import isAbleToChangeFrame from 'utils/is-able-to-change-frame';
import {
    CombinedState, StatesOrdering, ObjectType, ColorBy, Workspace,
    ActiveControl,
} from 'reducers';
import { ObjectState, ShapeType } from 'cvat-core-wrapper';
import { filterAnnotations } from 'utils/filter-annotations';
import { registerComponentShortcuts } from 'actions/shortcuts-actions';
import { ShortcutScope } from 'utils/enums';
import { subKeyMap } from 'utils/component-subkeymap';
import { openAnnotationsActionModal } from 'components/annotation-page/annotations-actions/annotations-actions-modal';

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
    showGroundTruth: boolean;
    workspace: Workspace;
    editedState: ObjectState | null,
    activeControl: ActiveControl,
    activeObjectHidden: boolean,
}

interface DispatchToProps {
    updateAnnotations(states: any[]): void;
    collapseStates(states: any[], value: boolean): void;
    removeObject: (objectState: any, force: boolean) => void;
    copyShape: (objectState: any) => void;
    switchPropagateVisibility: (visible: boolean) => void;
    changeFrame(frame: number): void;
    changeGroupColor(group: number, color: string): void;
    changeShowGroundTruth(value: boolean): void;
    changeHideEditedState(value: boolean): void;
}

const componentShortcuts = {
    SWITCH_ALL_LOCK: {
        name: 'Lock/unlock all objects',
        description: 'Change locked state for all objects in the side bar',
        sequences: ['t l'],
        scope: ShortcutScope.OBJECTS_SIDEBAR,
    },
    SWITCH_LOCK: {
        name: 'Lock/unlock an object',
        description: 'Change locked state for an active object',
        sequences: ['l'],
        scope: ShortcutScope.OBJECTS_SIDEBAR,
    },
    SWITCH_ALL_HIDDEN: {
        name: 'Hide/show all objects',
        description: 'Change hidden state for objects in the side bar',
        sequences: ['t h'],
        scope: ShortcutScope.OBJECTS_SIDEBAR,
    },
    SWITCH_HIDDEN: {
        name: 'Hide/show an object',
        description: 'Change hidden state for an active object',
        sequences: ['h'],
        scope: ShortcutScope.OBJECTS_SIDEBAR,
    },
    SWITCH_OCCLUDED: {
        name: 'Switch occluded',
        description: 'Change occluded property for an active object',
        sequences: ['q', '/'],
        scope: ShortcutScope.OBJECTS_SIDEBAR,
    },
    SWITCH_PINNED: {
        name: 'Switch pinned property',
        description: 'Change pinned property for an active object',
        sequences: ['p'],
        scope: ShortcutScope.OBJECTS_SIDEBAR,
    },
    SWITCH_KEYFRAME: {
        name: 'Switch keyframe',
        description: 'Change keyframe property for an active track',
        sequences: ['k'],
        scope: ShortcutScope.OBJECTS_SIDEBAR,
    },
    SWITCH_OUTSIDE: {
        name: 'Switch outside',
        description: 'Change outside property for an active track',
        sequences: ['o'],
        scope: ShortcutScope.OBJECTS_SIDEBAR,
    },
    DELETE_OBJECT_STANDARD_WORKSPACE: {
        name: 'Delete object',
        description: 'Delete an active object. Use shift to force delete of locked objects',
        sequences: ['del', 'shift+del'],
        scope: ShortcutScope.STANDARD_WORKSPACE,
    },
    TO_BACKGROUND: {
        name: 'To background',
        description: 'Put an active object "farther" from the user (decrease z axis value)',
        sequences: ['-', '_'],
        scope: ShortcutScope.OBJECTS_SIDEBAR,
    },
    TO_FOREGROUND: {
        name: 'To foreground',
        description: 'Put an active object "closer" to the user (increase z axis value)',
        sequences: ['+', '='],
        scope: ShortcutScope.OBJECTS_SIDEBAR,
    },
    COPY_SHAPE: {
        name: 'Copy shape',
        description: 'Copy shape to CVAT internal clipboard',
        sequences: ['ctrl+c'],
        scope: ShortcutScope.OBJECTS_SIDEBAR,
    },
    RUN_ANNOTATIONS_ACTION: {
        name: 'Run annotations action',
        description: 'Opens a dialog with annotations actions',
        sequences: ['ctrl+e'],
        scope: ShortcutScope.OBJECTS_SIDEBAR,
    },
    PROPAGATE_OBJECT: {
        name: 'Propagate object',
        description: 'Make a copy of the object on the following frames',
        sequences: ['ctrl+b'],
        scope: ShortcutScope.OBJECTS_SIDEBAR,
    },
    NEXT_KEY_FRAME: {
        name: 'Next keyframe',
        description: 'Go to the next keyframe of an active track',
        sequences: ['r'],
        scope: ShortcutScope.OBJECTS_SIDEBAR,
    },
    PREV_KEY_FRAME: {
        name: 'Previous keyframe',
        description: 'Go to the previous keyframe of an active track',
        sequences: ['e'],
        scope: ShortcutScope.OBJECTS_SIDEBAR,
    },
    CHANGE_OBJECT_COLOR: {
        name: 'Change color',
        description: 'Set the next color for an activated shape',
        sequences: ['enter'],
        scope: ShortcutScope.OBJECTS_SIDEBAR,
    },
};

registerComponentShortcuts(componentShortcuts);

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
            canvas: {
                activeControl, activeObjectHidden,
            },
            editing: { objectState: editedState },
            colors,
            workspace,
        },
        settings: {
            shapes: { colorBy, showGroundTruth },
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
        showGroundTruth,
        workspace,
        editedState,
        activeControl,
        activeObjectHidden,
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
        switchPropagateVisibility(visible: boolean): void {
            dispatch(switchPropagateVisibilityAction(visible));
        },
        changeFrame(frame: number): void {
            dispatch(changeFrameAsync(frame));
        },
        changeGroupColor(group: number, color: string): void {
            dispatch(changeGroupColorAsync(group, color));
        },
        changeShowGroundTruth(value: boolean): void {
            dispatch(changeShowGroundTruthAction(value));
            dispatch(fetchAnnotationsAsync());
        },
        changeHideEditedState(value: boolean): void {
            dispatch(changeHideActiveObjectAsync(value));
        },
    };
}

function sortAndMap(objectStates: ObjectState[], ordering: StatesOrdering): number[] {
    let sorted = [];
    if (ordering === StatesOrdering.ID_ASCENT) {
        sorted = [...objectStates].sort((a: any, b: any): number => a.clientID - b.clientID);
    } else if (ordering === StatesOrdering.ID_DESCENT) {
        sorted = [...objectStates].sort((a: any, b: any): number => b.clientID - a.clientID);
    } else if (ordering === StatesOrdering.UPDATED) {
        sorted = [...objectStates].sort((a: any, b: any): number => b.updated - a.updated);
    } else {
        sorted = [...objectStates].sort((a: any, b: any): number => a.zOrder - b.zOrder);
    }

    return sorted.map((state: any) => state.clientID);
}

type Props = StateToProps & DispatchToProps & OwnProps;

interface State {
    statesOrdering: StatesOrdering;
    objectStates: ObjectState[];
    filteredStates: ObjectState[];
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
            filteredStates: [],
            sortedStatesID: [],
        };
    }

    public componentDidMount(): void {
        this.updateObjects();
    }

    public componentDidUpdate(): void {
        const { objectStates } = this.props;
        const { objectStates: prevObjectStates } = this.state;
        if (objectStates !== prevObjectStates) {
            this.updateObjects();
        }
    }

    private updateObjects = (): void => {
        const {
            objectStates, frameNumber, workspace,
        } = this.props;
        const { statesOrdering } = this.state;
        const filteredStates = filterAnnotations(objectStates, {
            frame: frameNumber,
            workspace,
        });
        this.setState({
            objectStates,
            filteredStates,
            sortedStatesID: sortAndMap(filteredStates, statesOrdering),
        });
    };

    private onChangeStatesOrdering = (statesOrdering: StatesOrdering): void => {
        const { filteredStates } = this.state;
        this.setState({
            statesOrdering,
            sortedStatesID: sortAndMap(filteredStates, statesOrdering),
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

    private changeShowGroundTruth = (): void => {
        const { showGroundTruth, changeShowGroundTruth } = this.props;
        changeShowGroundTruth(!showGroundTruth);
    };

    private lockAllStates(locked: boolean): void {
        const { updateAnnotations, readonly } = this.props;
        const { filteredStates } = this.state;

        if (!readonly) {
            for (const objectState of filteredStates) {
                objectState.lock = locked;
            }

            updateAnnotations(filteredStates);
        }
    }

    private hideAllStates(hidden: boolean): void {
        const { updateAnnotations, editedState, changeHideEditedState } = this.props;
        const { filteredStates } = this.state;

        if (editedState?.shapeType === ShapeType.MASK) {
            changeHideEditedState(hidden);
        }

        for (const objectState of filteredStates) {
            objectState.hidden = hidden;
        }

        updateAnnotations(filteredStates);
    }

    private collapseAllStates(collapsed: boolean): void {
        const { collapseStates } = this.props;
        const { filteredStates } = this.state;

        collapseStates(filteredStates, collapsed);
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
            showGroundTruth,
            updateAnnotations,
            changeGroupColor,
            removeObject,
            copyShape,
            switchPropagateVisibility,
            changeFrame,
            workspace,
        } = this.props;
        const {
            objectStates, sortedStatesID, statesOrdering, filteredStates,
        } = this.state;

        const preventDefault = (event: KeyboardEvent | undefined): void => {
            if (event) {
                event.preventDefault();
            }
        };

        const activatedState = (ignoreElements = false): ObjectState | null => {
            if (activatedStateID !== null) {
                const state = objectStates
                    .find((objectState: ObjectState): boolean => objectState.clientID === activatedStateID);

                if (state && activatedElementID !== null && !ignoreElements) {
                    const element = state.elements
                        .find((_element: ObjectState): boolean => _element.clientID === activatedElementID);
                    return element || null;
                }

                return state || null;
            }

            return null;
        };

        const handlers: Record<keyof typeof componentShortcuts, (event?: KeyboardEvent) => void> = {
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
                this.hideAllStates(!statesHidden);
            },
            SWITCH_HIDDEN: (event: KeyboardEvent | undefined) => {
                preventDefault(event);
                const state = activatedState();
                const {
                    editedState, changeHideEditedState, activeControl, activeObjectHidden,
                } = this.props;
                if (editedState?.shapeType === ShapeType.MASK || activeControl === ActiveControl.DRAW_MASK) {
                    const hide = editedState ? !editedState.hidden : !activeObjectHidden;
                    changeHideEditedState(hide);
                }
                if (state) {
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
            SWITCH_PINNED: (event: KeyboardEvent | undefined) => {
                preventDefault(event);
                const state = activatedState(true);
                if (state && !readonly) {
                    state.pinned = !state.pinned;
                    updateAnnotations([state]);
                }
            },
            SWITCH_KEYFRAME: (event: KeyboardEvent | undefined) => {
                preventDefault(event);
                const state = activatedState();
                if (state && !readonly && state.objectType === ObjectType.TRACK) {
                    const { first, last } = state.keyframes as NonNullable<typeof state.keyframes>;
                    if (first !== last || !state.keyframe) {
                        state.keyframe = !state.keyframe;
                        updateAnnotations([state]);
                    }
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
            DELETE_OBJECT_STANDARD_WORKSPACE: (event: KeyboardEvent | undefined) => {
                preventDefault(event);
                const state = activatedState(true);
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
                const state = activatedState(true);
                if (state && !readonly && state.objectType !== ObjectType.TAG) {
                    state.zOrder = minZLayer - 1;
                    updateAnnotations([state]);
                }
            },
            TO_FOREGROUND: (event: KeyboardEvent | undefined) => {
                preventDefault(event);
                const state = activatedState(true);
                if (state && !readonly && state.objectType !== ObjectType.TAG) {
                    state.zOrder = maxZLayer + 1;
                    updateAnnotations([state]);
                }
            },
            COPY_SHAPE: () => {
                const state = activatedState(true);
                if (state && !readonly) {
                    copyShape(state);
                }
            },
            RUN_ANNOTATIONS_ACTION: () => {
                const state = activatedState(true);
                if (!readonly) {
                    if (state) {
                        openAnnotationsActionModal({ defaultObjectState: state });
                    } else {
                        openAnnotationsActionModal();
                    }
                }
            },
            PROPAGATE_OBJECT: (event: KeyboardEvent | undefined) => {
                preventDefault(event);
                const state = activatedState();
                if (state && !readonly) {
                    switchPropagateVisibility(true);
                }
            },
            NEXT_KEY_FRAME: (event: KeyboardEvent | undefined) => {
                preventDefault(event);
                const state = activatedState();
                if (state && state.keyframes) {
                    const frame = typeof state.keyframes.next === 'number' ? state.keyframes.next : null;
                    if (frame !== null && isAbleToChangeFrame(frame)) {
                        changeFrame(frame);
                    }
                }
            },
            PREV_KEY_FRAME: (event: KeyboardEvent | undefined) => {
                preventDefault(event);
                const state = activatedState();
                if (state && state.keyframes) {
                    const frame = typeof state.keyframes.prev === 'number' ? state.keyframes.prev : null;
                    if (frame !== null && isAbleToChangeFrame(frame)) {
                        changeFrame(frame);
                    }
                }
            },
        };

        return (
            <>
                <GlobalHotKeys keyMap={subKeyMap(componentShortcuts, keyMap)} handlers={handlers} />
                <ObjectsListComponent
                    statesHidden={statesHidden}
                    statesLocked={statesLocked}
                    statesCollapsedAll={statesCollapsedAll}
                    readonly={readonly || false}
                    workspace={workspace}
                    statesOrdering={statesOrdering}
                    sortedStatesID={sortedStatesID}
                    showGroundTruth={showGroundTruth}
                    objectStates={filteredStates}
                    switchHiddenAllShortcut={normalizedKeyMap.SWITCH_ALL_HIDDEN}
                    switchLockAllShortcut={normalizedKeyMap.SWITCH_ALL_LOCK}
                    changeStatesOrdering={this.onChangeStatesOrdering}
                    lockAllStates={this.onLockAllStates}
                    unlockAllStates={this.onUnlockAllStates}
                    collapseAllStates={this.onCollapseAllStates}
                    expandAllStates={this.onExpandAllStates}
                    hideAllStates={this.onHideAllStates}
                    showAllStates={this.onShowAllStates}
                    changeShowGroundTruth={this.changeShowGroundTruth}
                />
            </>
        );
    }
}

export default connect<StateToProps, DispatchToProps, OwnProps, CombinedState>(
    mapStateToProps, mapDispatchToProps,
)(ObjectsListContainer);
