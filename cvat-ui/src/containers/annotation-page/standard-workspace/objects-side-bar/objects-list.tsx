// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';

import { connect } from 'react-redux';
import message from 'antd/lib/message';
import GlobalHotKeys, { KeyMap } from 'utils/mousetrap-react';

import ObjectsListComponent from 'components/annotation-page/standard-workspace/objects-side-bar/objects-list';
import {
    updateAnnotationsAsync,
    updateAnnotationsBatchAsync,
    changeFrameAsync,
    collapseObjectItems,
    changeGroupColorAsync,
    copyShape as copyShapeAction,
    copySelection as copySelectionAction,
    switchPropagateVisibility as switchPropagateVisibilityAction,
    switchSimplifyVisibility as switchSimplifyVisibilityAction,
    removeObject as removeObjectAction,
    removeSelectionAsync,
    fetchAnnotationsAsync,
    changeHideActiveObjectAsync,
    updateLayerAsync,
    compactLayersAsync,
    switchZLayer,
    toggleZLayersVisibility,
    selectObjectsAsync,
} from 'actions/annotation-actions';
import {
    changeShowGroundTruth as changeShowGroundTruthAction,
} from 'actions/settings-actions';
import isAbleToChangeFrame from 'utils/is-able-to-change-frame';
import getHiddenZLayers from 'utils/get-hidden-z-layers';
import {
    CombinedState, StatesOrdering, ColorBy, Workspace,
    ActiveControl,
} from 'reducers';
import { ObjectState, ObjectType, ShapeType } from 'cvat-core-wrapper';
import { RenderData } from 'cvat-canvas-wrapper';
import { filterAnnotations } from 'utils/filter-annotations';
import { registerComponentShortcuts } from 'actions/shortcuts-actions';
import { ShortcutScope } from 'utils/enums';
import { subKeyMap } from 'utils/component-subkeymap';
import {
    type LayerPlacement,
    type LayerMoveSource,
    isLayerState,
} from 'components/annotation-page/standard-workspace/objects-side-bar/drag-and-drop';
import { openAnnotationsActionModal } from 'components/annotation-page/annotations-actions/annotations-actions-modal';
import { OBJECTS_SIDEBAR_OPEN_Z_LAYER_EVENT } from 'utils/objects-sidebar';
import {
    getSelectedStates,
    getSelectionToggleState,
    prepareSelectionZOrder,
    prepareSelectionToggle,
} from 'utils/multi-selection';

interface StateToProps {
    jobInstance: any;
    frameNumber: any;
    statesHidden: boolean;
    statesLocked: boolean;
    statesCollapsedAll: boolean;
    collapsedStates: Record<number, boolean>;
    objectStates: ObjectState[];
    annotationsFilters: any[];
    renderData: RenderData;
    colors: string[];
    colorBy: ColorBy;
    activatedStateID: number | null;
    activatedElementID: number | null;
    selectedStatesID: number[];
    minZLayer: number;
    maxZLayer: number;
    currentZLayer: number;
    hiddenZLayers: Set<number>;
    keyMap: KeyMap;
    normalizedKeyMap: Record<string, string>;
    showGroundTruth: boolean;
    workspace: Workspace;
    editedState: ObjectState | null,
    activeControl: ActiveControl,
    activeObjectHidden: boolean,
}

interface DispatchToProps {
    updateAnnotations(...args: Parameters<typeof updateAnnotationsAsync>): void;
    updateAnnotationsBatch(...args: Parameters<typeof updateAnnotationsBatchAsync>): void;
    collapseStates(...args: Parameters<typeof collapseObjectItems>): void;
    removeObject(...args: Parameters<typeof removeObjectAction>): void;
    removeSelection(...args: Parameters<typeof removeSelectionAsync>): void;
    copyShape(...args: Parameters<typeof copyShapeAction>): void;
    copySelection(...args: Parameters<typeof copySelectionAction>): void;
    switchPropagateVisibility(...args: Parameters<typeof switchPropagateVisibilityAction>): void;
    switchSimplifyVisibility(...args: Parameters<typeof switchSimplifyVisibilityAction>): void;
    changeFrame(...args: Parameters<typeof changeFrameAsync>): void;
    changeGroupColor(...args: Parameters<typeof changeGroupColorAsync>): void;
    changeShowGroundTruth(...args: Parameters<typeof changeShowGroundTruthAction>): void;
    changeHideEditedState(...args: Parameters<typeof changeHideActiveObjectAsync>): void;
    updateLayer(...args: Parameters<typeof updateLayerAsync>): void;
    compactLayers(...args: Parameters<typeof compactLayersAsync>): void;
    selectLayer(...args: Parameters<typeof switchZLayer>): void;
    toggleLayersVisibility(...args: Parameters<typeof toggleZLayersVisibility>): void;
    selectObjects(...args: Parameters<typeof selectObjectsAsync>): void;
}

const componentShortcuts = {
    SWITCH_ALL_LOCK: {
        name: 'Lock/unlock all objects',
        description: 'Change locked state for all objects in the side bar',
        sequences: ['t l'],
        scope: ShortcutScope.OBJECTS_SIDEBAR,
    },
    SWITCH_LOCK: {
        name: 'Lock/unlock objects',
        description: 'Change locked state for selected objects or an active object',
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
        description: 'Change pinned state for selected objects or an active object',
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
        sequences: ['del', 'backspace', 'shift+del', 'shift+backspace'],
        scope: ShortcutScope.OBJECTS_SIDEBAR,
    },
    TO_BACKGROUND: {
        name: 'Move to background',
        description: 'Move an active object to the newly created background layer (decrease z-order value)',
        sequences: ['-', '_'],
        scope: ShortcutScope.OBJECTS_SIDEBAR,
    },
    TO_FOREGROUND: {
        name: 'Move to foreground',
        description: 'Move an active object to the newly created foreground layer (increase z-order value)',
        sequences: ['+', '='],
        scope: ShortcutScope.OBJECTS_SIDEBAR,
    },
    TO_ONE_LAYER_BACKWARD: {
        name: 'Move one layer backward',
        description: 'Move an active object one layer backward (decrease z-order value)',
        sequences: [],
        scope: ShortcutScope.OBJECTS_SIDEBAR,
    },
    TO_ONE_LAYER_FORWARD: {
        name: 'Move one layer forward',
        description: 'Move an active object one layer forward (increase z-order value)',
        sequences: [],
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
    SIMPLIFY_POLYGON: {
        name: 'Simplify polygon',
        description: 'Activate simplification mode for the selected polygon or polyline',
        sequences: [],
        scope: ShortcutScope.OBJECTS_SIDEBAR,
    },
    SELECT_ALL_OBJECTS: {
        name: 'Select all objects',
        description: 'Add all objects visible on the canvas to the selection',
        sequences: ['ctrl+a'],
        scope: ShortcutScope.OBJECTS_SIDEBAR,
    },
};

registerComponentShortcuts(componentShortcuts);

function withDeleteKeyAliases(keyMap: KeyMap): KeyMap {
    const deleteShortcut = keyMap.DELETE_OBJECT_STANDARD_WORKSPACE;
    if (!deleteShortcut) {
        return keyMap;
    }

    const sequences = new Set(deleteShortcut.sequences);
    deleteShortcut.sequences.forEach((sequence) => {
        const keys = sequence.split('+');
        const key = keys.at(-1);
        if (key === 'del' || key === 'backspace') {
            keys[keys.length - 1] = key === 'del' ? 'backspace' : 'del';
            sequences.add(keys.join('+'));
        }
    });

    return {
        ...keyMap,
        DELETE_OBJECT_STANDARD_WORKSPACE: {
            ...deleteShortcut,
            sequences: [...sequences],
        },
    };
}

function mapStateToProps(state: CombinedState): StateToProps {
    const {
        annotation: {
            annotations: {
                states: objectStates,
                filters: annotationsFilters,
                renderData,
                collapsed,
                collapsedAll,
                activatedStateID,
                activatedElementID,
                selectedStatesID,
                zLayer: {
                    min: minZLayer, max: maxZLayer, cur: currentZLayer,
                },
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
            if (objectState.objectType === ObjectType.SHAPE || objectState.objectType === ObjectType.TRACK) {
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
        renderData,
        colors,
        colorBy,
        activatedStateID,
        activatedElementID,
        selectedStatesID,
        minZLayer,
        maxZLayer,
        currentZLayer,
        hiddenZLayers: getHiddenZLayers(state),
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
        updateAnnotations(...args: Parameters<typeof updateAnnotationsAsync>): void {
            dispatch(updateAnnotationsAsync(...args));
        },
        updateAnnotationsBatch(...args: Parameters<typeof updateAnnotationsBatchAsync>): void {
            dispatch(updateAnnotationsBatchAsync(...args));
        },
        collapseStates(...args: Parameters<typeof collapseObjectItems>): void {
            dispatch(collapseObjectItems(...args));
        },
        removeObject(...args: Parameters<typeof removeObjectAction>): void {
            dispatch(removeObjectAction(...args));
        },
        removeSelection(...args: Parameters<typeof removeSelectionAsync>): void {
            dispatch(removeSelectionAsync(...args));
        },
        copySelection(...args: Parameters<typeof copySelectionAction>): void {
            dispatch(copySelectionAction(...args));
        },
        copyShape(...args: Parameters<typeof copyShapeAction>): void {
            dispatch(copyShapeAction(...args));
        },
        switchPropagateVisibility(...args: Parameters<typeof switchPropagateVisibilityAction>): void {
            dispatch(switchPropagateVisibilityAction(...args));
        },
        switchSimplifyVisibility(...args: Parameters<typeof switchSimplifyVisibilityAction>): void {
            dispatch(switchSimplifyVisibilityAction(...args));
        },
        changeFrame(...args: Parameters<typeof changeFrameAsync>): void {
            dispatch(changeFrameAsync(...args));
        },
        changeGroupColor(...args: Parameters<typeof changeGroupColorAsync>): void {
            dispatch(changeGroupColorAsync(...args));
        },
        changeShowGroundTruth(...args: Parameters<typeof changeShowGroundTruthAction>): void {
            dispatch(changeShowGroundTruthAction(...args));
            dispatch(fetchAnnotationsAsync());
        },
        changeHideEditedState(...args: Parameters<typeof changeHideActiveObjectAsync>): void {
            dispatch(changeHideActiveObjectAsync(...args));
        },
        updateLayer(...args: Parameters<typeof updateLayerAsync>): void {
            dispatch(updateLayerAsync(...args));
        },
        compactLayers(...args: Parameters<typeof compactLayersAsync>): void {
            dispatch(compactLayersAsync(...args));
        },
        selectLayer(...args: Parameters<typeof switchZLayer>): void {
            dispatch(switchZLayer(...args));
        },
        toggleLayersVisibility(...args: Parameters<typeof toggleZLayersVisibility>): void {
            dispatch(toggleZLayersVisibility(...args));
        },
        selectObjects(...args: Parameters<typeof selectObjectsAsync>): void {
            dispatch(selectObjectsAsync(...args));
        },
    };
}

function sortAndMap(objectStates: ObjectState[], ordering: StatesOrdering): number[] {
    let sorted: ObjectState[] = [];
    if (ordering === StatesOrdering.ID_ASCENT) {
        sorted = [...objectStates].sort((a: ObjectState, b: ObjectState): number => (
            (a.clientID ?? 0) - (b.clientID ?? 0)
        ));
    } else if (ordering === StatesOrdering.ID_DESCENT) {
        sorted = [...objectStates].sort((a: ObjectState, b: ObjectState): number => (
            (b.clientID ?? 0) - (a.clientID ?? 0)
        ));
    } else if (ordering === StatesOrdering.UPDATED) {
        sorted = [...objectStates].sort((a: ObjectState, b: ObjectState): number => b.updated - a.updated);
    } else if (ordering === StatesOrdering.LAYER) {
        sorted = [...objectStates].sort((a: ObjectState, b: ObjectState): number => a.zOrder - b.zOrder);
    } else if (ordering === StatesOrdering.LABEL_NAME) {
        sorted = [...objectStates].sort((a: ObjectState, b: ObjectState): number => {
            const labelComparison = a.label.name.localeCompare(b.label.name);
            if (labelComparison !== 0) {
                return labelComparison;
            }
            return (a.clientID ?? 0) - (b.clientID ?? 0);
        });
    } else {
        sorted = [...objectStates];
    }

    return sorted.map((state: ObjectState) => state.clientID).filter((id): id is number => id !== null);
}

type Props = StateToProps & DispatchToProps;

interface State {
    statesOrdering: StatesOrdering;
    objectStates: ObjectState[];
    filteredStates: ObjectState[];
    sortedStatesID: number[];
}

class ObjectsListContainer extends React.PureComponent<Props, State> {
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
        window.addEventListener(OBJECTS_SIDEBAR_OPEN_Z_LAYER_EVENT, this.onOpenZLayerInSidebar);
    }

    public componentWillUnmount(): void {
        window.removeEventListener(OBJECTS_SIDEBAR_OPEN_Z_LAYER_EVENT, this.onOpenZLayerInSidebar);
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
        const { filteredStates, statesOrdering: currentStatesOrdering } = this.state;
        if (statesOrdering === currentStatesOrdering) {
            return;
        }

        this.setState({
            statesOrdering,
            sortedStatesID: sortAndMap(filteredStates, statesOrdering),
        });
    };

    private onOpenZLayerInSidebar = (): void => {
        this.onChangeStatesOrdering(StatesOrdering.LAYER);
    };

    private onLockAllStates = (): void => {
        this.lockAllStates(true);
    };

    private onUnlockAllStates = (): void => {
        this.lockAllStates(false);
    };

    private switchSelectionLock = (): void => {
        const {
            objectStates, selectedStatesID, updateAnnotationsBatch,
        } = this.props;
        const selectedStates = getSelectedStates(objectStates, selectedStatesID);
        if (!selectedStates.length) return;
        const { disabledReason } = getSelectionToggleState(selectedStates, 'lock');
        if (disabledReason) {
            message.destroy();
            message.warning(disabledReason);
            return;
        }

        const statesToUpdate = prepareSelectionToggle(selectedStates, 'lock');
        updateAnnotationsBatch(statesToUpdate);
    };

    private switchSelectionPinned = (): void => {
        const {
            objectStates, selectedStatesID, updateAnnotationsBatch,
        } = this.props;
        const selectedStates = getSelectedStates(objectStates, selectedStatesID);
        if (!selectedStates.length) return;
        const { disabledReason } = getSelectionToggleState(selectedStates, 'pinned');
        if (disabledReason) {
            message.destroy();
            message.warning(disabledReason);
            return;
        }

        const statesToUpdate = prepareSelectionToggle(selectedStates, 'pinned');
        updateAnnotationsBatch(statesToUpdate);
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

    private statesFromMoveSource(source: LayerMoveSource): ObjectState[] {
        const { filteredStates } = this.state;

        if ('clientID' in source) {
            const objectState = filteredStates.find((state: ObjectState): boolean => (
                state.clientID === source.clientID
            ));
            return objectState && isLayerState(objectState) ? [objectState] : [];
        }

        return filteredStates.filter((state: ObjectState): boolean => (
            isLayerState(state) && state.zOrder === source.zOrder
        ));
    }

    private moveObjectsToLayer = (source: LayerMoveSource, targetZOrder: number): void => {
        const { frameNumber, updateLayer } = this.props;
        const statesToMove = this.statesFromMoveSource(source);

        if (!statesToMove.length) {
            return;
        }

        updateLayer(frameNumber, { exact: targetZOrder }, statesToMove);
    };

    private moveObjectsOnNewLayer = (source: LayerMoveSource, placement: LayerPlacement): void => {
        const { frameNumber, updateLayer } = this.props;
        const statesToMove = this.statesFromMoveSource(source);

        if (!statesToMove.length) {
            return;
        }

        updateLayer(frameNumber, placement, statesToMove);
    };

    private compactLayers = (): void => {
        const { frameNumber, compactLayers } = this.props;
        compactLayers(frameNumber);
    };

    private lockAllStates(locked: boolean): void {
        const { updateAnnotations } = this.props;
        const { filteredStates } = this.state;

        for (const objectState of filteredStates) {
            objectState.lock = locked;
        }

        updateAnnotations(filteredStates);
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
            currentZLayer,
            hiddenZLayers,
            keyMap,
            normalizedKeyMap,
            colors,
            colorBy,
            statesCollapsedAll,
            showGroundTruth,
            updateAnnotations,
            updateAnnotationsBatch,
            changeGroupColor,
            removeObject,
            removeSelection,
            copyShape,
            copySelection,
            selectedStatesID,
            switchPropagateVisibility,
            switchSimplifyVisibility,
            changeFrame,
            workspace,
            renderData,
            selectObjects,
        } = this.props;
        const {
            objectStates, sortedStatesID, statesOrdering, filteredStates,
        } = this.state;

        const preventDefault = (event?: KeyboardEvent): void => {
            if (event) {
                event.preventDefault();
            }
        };

        const updateSelectedZOrder = (resolveZOrder: (state: ObjectState) => number): boolean => {
            if (!selectedStatesID.length) {
                return false;
            }

            const selectedStates = getSelectedStates(objectStates, selectedStatesID);
            const statesToUpdate = prepareSelectionZOrder(selectedStates, resolveZOrder);
            if (statesToUpdate.length) {
                updateAnnotationsBatch(statesToUpdate);
            }
            return true;
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
            SWITCH_ALL_LOCK: (event?: KeyboardEvent) => {
                preventDefault(event);
                this.lockAllStates(!statesLocked);
            },
            SWITCH_LOCK: (event?: KeyboardEvent) => {
                preventDefault(event);
                if (selectedStatesID.length) {
                    this.switchSelectionLock();
                    return;
                }
                const state = activatedState();
                if (state) {
                    state.lock = !state.lock;
                    updateAnnotations([state]);
                }
            },
            SWITCH_ALL_HIDDEN: (event?: KeyboardEvent) => {
                preventDefault(event);
                this.hideAllStates(!statesHidden);
            },
            SWITCH_HIDDEN: (event?: KeyboardEvent) => {
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
            SWITCH_OCCLUDED: (event?: KeyboardEvent) => {
                preventDefault(event);
                const state = activatedState();
                if (state && isLayerState(state)) {
                    state.occluded = !state.occluded;
                    updateAnnotations([state]);
                }
            },
            SWITCH_PINNED: (event?: KeyboardEvent) => {
                preventDefault(event);
                if (selectedStatesID.length) {
                    this.switchSelectionPinned();
                    return;
                }
                const state = activatedState(true);
                if (state) {
                    state.pinned = !state.pinned;
                    updateAnnotations([state]);
                }
            },
            SWITCH_KEYFRAME: (event?: KeyboardEvent) => {
                preventDefault(event);
                const state = activatedState();
                if (state && state.objectType === ObjectType.TRACK) {
                    const { first, last } = state.keyframes as NonNullable<typeof state.keyframes>;
                    if (first !== last || !state.keyframe) {
                        state.keyframe = !state.keyframe;
                        updateAnnotations([state]);
                    }
                }
            },
            SWITCH_OUTSIDE: (event?: KeyboardEvent) => {
                preventDefault(event);
                const state = activatedState();
                if (state && (state.objectType === ObjectType.TRACK || state.parentID)) {
                    state.outside = !state.outside;
                    updateAnnotations([state]);
                }
            },
            DELETE_OBJECT_STANDARD_WORKSPACE: (event?: KeyboardEvent) => {
                preventDefault(event);
                // with an active multi-selection the whole selection is removed
                if (selectedStatesID.length) {
                    removeSelection(event ? event.shiftKey : false);
                    return;
                }

                const state = activatedState(true);
                if (state) {
                    removeObject(state, event ? event.shiftKey : false);
                }
            },
            CHANGE_OBJECT_COLOR: (event?: KeyboardEvent) => {
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
            TO_BACKGROUND: (event?: KeyboardEvent) => {
                preventDefault(event);
                if (updateSelectedZOrder((): number => minZLayer - 1)) {
                    return;
                }
                const state = activatedState(true);
                if (state && isLayerState(state)) {
                    state.zOrder = minZLayer - 1;
                    updateAnnotations([state]);
                }
            },
            TO_FOREGROUND: (event?: KeyboardEvent) => {
                preventDefault(event);
                if (updateSelectedZOrder((): number => maxZLayer + 1)) {
                    return;
                }
                const state = activatedState(true);
                if (state && isLayerState(state)) {
                    state.zOrder = maxZLayer + 1;
                    updateAnnotations([state]);
                }
            },
            TO_ONE_LAYER_BACKWARD: (event?: KeyboardEvent) => {
                preventDefault(event);
                if (updateSelectedZOrder((state: ObjectState): number => state.zOrder - 1)) {
                    return;
                }
                const state = activatedState(true);
                if (state && isLayerState(state)) {
                    state.zOrder -= 1;
                    updateAnnotations([state]);
                }
            },
            TO_ONE_LAYER_FORWARD: (event?: KeyboardEvent) => {
                preventDefault(event);
                if (updateSelectedZOrder((state: ObjectState): number => state.zOrder + 1)) {
                    return;
                }
                const state = activatedState(true);
                if (state && isLayerState(state)) {
                    state.zOrder += 1;
                    updateAnnotations([state]);
                }
            },
            COPY_SHAPE: () => {
                // with an active multi-selection the whole selection is copied
                if (selectedStatesID.length) {
                    const selectedStates = getSelectedStates(objectStates, selectedStatesID);
                    if (selectedStates.length) {
                        copySelection(selectedStates);
                        return;
                    }
                }

                const state = activatedState(true);
                if (state) {
                    copyShape(state);
                }
            },
            RUN_ANNOTATIONS_ACTION: () => {
                if (selectedStatesID.length) {
                    const selectedStates = getSelectedStates(objectStates, selectedStatesID);
                    if (selectedStates.length) {
                        openAnnotationsActionModal({ defaultObjectStates: selectedStates });
                        return;
                    }
                }

                const state = activatedState(true);
                if (state) {
                    openAnnotationsActionModal({ defaultObjectState: state });
                } else {
                    openAnnotationsActionModal();
                }
            },
            PROPAGATE_OBJECT: (event?: KeyboardEvent) => {
                preventDefault(event);
                const state = activatedState();
                if (state) {
                    switchPropagateVisibility(true);
                }
            },
            NEXT_KEY_FRAME: (event?: KeyboardEvent) => {
                preventDefault(event);
                const state = activatedState();
                if (state && state.keyframes) {
                    const frame = typeof state.keyframes.next === 'number' ? state.keyframes.next : null;
                    if (frame !== null && isAbleToChangeFrame(frame)) {
                        changeFrame(frame);
                    }
                }
            },
            PREV_KEY_FRAME: (event?: KeyboardEvent) => {
                preventDefault(event);
                const state = activatedState();
                if (state && state.keyframes) {
                    const frame = typeof state.keyframes.prev === 'number' ? state.keyframes.prev : null;
                    if (frame !== null && isAbleToChangeFrame(frame)) {
                        changeFrame(frame);
                    }
                }
            },
            SIMPLIFY_POLYGON: (event?: KeyboardEvent) => {
                preventDefault(event);
                const state = activatedState(true);
                if (state && [ShapeType.POLYGON, ShapeType.POLYLINE].includes(state.shapeType)) {
                    switchSimplifyVisibility(state.clientID);
                }
            },
            SELECT_ALL_OBJECTS: (event?: KeyboardEvent) => {
                const target = event?.target as HTMLElement | null;
                if (target?.closest('input, textarea, [contenteditable]')) return;

                preventDefault(event);
                selectObjects(filteredStates.filter((state: ObjectState): boolean => (
                    [ObjectType.SHAPE, ObjectType.TRACK].includes(state.objectType) &&
                    !state.outside && !state.hidden && !hiddenZLayers.has(state.zOrder)
                )).map((state: ObjectState): number => state.clientID as number));
            },
        };

        return (
            <>
                <GlobalHotKeys
                    keyMap={withDeleteKeyAliases(subKeyMap(componentShortcuts, keyMap))}
                    handlers={handlers}
                />
                <ObjectsListComponent
                    statesHidden={statesHidden}
                    statesLocked={statesLocked}
                    statesCollapsedAll={statesCollapsedAll}
                    workspace={workspace}
                    statesOrdering={statesOrdering}
                    currentLayer={currentZLayer}
                    hiddenLayers={hiddenZLayers}
                    selectedStatesID={selectedStatesID}
                    keyMap={keyMap}
                    sortedStatesID={sortedStatesID}
                    showGroundTruth={showGroundTruth}
                    objectStates={filteredStates}
                    visibleSkeletonElements={renderData.visibleSkeletonElements}
                    switchHiddenAllShortcut={normalizedKeyMap.SWITCH_ALL_HIDDEN}
                    switchLockAllShortcut={normalizedKeyMap.SWITCH_ALL_LOCK}
                    changeStatesOrdering={this.onChangeStatesOrdering}
                    selectLayer={this.props.selectLayer}
                    toggleLayersVisibility={this.props.toggleLayersVisibility}
                    moveObjectsToLayer={this.moveObjectsToLayer}
                    moveObjectsOnNewLayer={this.moveObjectsOnNewLayer}
                    compactLayers={this.compactLayers}
                    lockAllStates={this.onLockAllStates}
                    unlockAllStates={this.onUnlockAllStates}
                    collapseAllStates={this.onCollapseAllStates}
                    expandAllStates={this.onExpandAllStates}
                    hideAllStates={this.onHideAllStates}
                    showAllStates={this.onShowAllStates}
                    changeShowGroundTruth={this.changeShowGroundTruth}
                    selectObjects={selectObjects}
                />
            </>
        );
    }
}

export default connect(
    mapStateToProps, mapDispatchToProps,
)(ObjectsListContainer);
