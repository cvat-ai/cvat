// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { AnyAction } from 'redux';
import { AnnotationActionTypes } from 'actions/annotation-actions';
import { JobsActionTypes } from 'actions/jobs-actions';
import { AuthActionTypes } from 'actions/auth-actions';
import { BoundariesActionTypes } from 'actions/boundaries-actions';
import { Canvas, CanvasMode } from 'cvat-canvas-wrapper';
import { Canvas3d } from 'cvat-canvas3d-wrapper';
import {
    DimensionType, JobStage, Label, LabelType,
} from 'cvat-core-wrapper';
import { clamp } from 'utils/math';

import {
    ActiveControl,
    AnnotationState,
    ContextMenuType,
    NavigationType,
    ObjectType,
    ShapeType,
    Workspace,
} from '.';

function updateActivatedStateID(newStates: any[], prevActivatedStateID: number | null): number | null {
    return prevActivatedStateID === null || newStates.some((_state: any) => _state.clientID === prevActivatedStateID) ?
        prevActivatedStateID :
        null;
}

export function labelShapeType(label?: Label): ShapeType | null {
    if (label && Object.values(ShapeType).includes(label.type as any)) {
        return label.type as unknown as ShapeType;
    }
    if (label?.type === LabelType.TAG) {
        return null;
    }
    return ShapeType.RECTANGLE;
}

const defaultState: AnnotationState = {
    activities: {
        loads: {},
    },
    canvas: {
        contextMenu: {
            visible: false,
            left: 0,
            top: 0,
            type: ContextMenuType.CANVAS_SHAPE,
            pointID: null,
            clientID: null,
            parentID: null,
        },
        brushTools: {
            visible: false,
            top: 0,
            left: 0,
        },
        instance: null,
        ready: false,
        activeControl: ActiveControl.CURSOR,
        activeObjectHidden: false,
    },
    job: {
        openTime: null,
        labels: [],
        requestedId: null,
        queryParameters: {
            initialOpenGuide: false,
            defaultLabel: null,
            defaultPointsCount: null,
        },
        groundTruthInfo: {
            validationLayout: null,
            groundTruthJobFramesMeta: null,
            groundTruthInstance: null,
        },
        frameNumbers: [],
        instance: null,
        meta: null,
        attributes: {},
        fetching: false,
        saving: false,
    },
    player: {
        frame: {
            number: 0,
            filename: '',
            data: null,
            relatedFiles: 0,
            fetching: false,
            delay: 0,
            changeTime: null,
            changeFrameEvent: null,
        },
        navigationType: NavigationType.REGULAR,
        ranges: '',
        playing: false,
        frameAngles: [],
        navigationBlocked: false,
    },
    drawing: {
        activeShapeType: ShapeType.RECTANGLE,
        activeLabelID: null,
        activeObjectType: ObjectType.SHAPE,
    },
    editing: {
        objectState: null,
    },
    annotations: {
        activatedStateID: null,
        activatedElementID: null,
        activatedAttributeID: null,
        highlightedConflict: null,
        saving: {
            forceExit: false,
            uploading: false,
        },
        collapsed: {},
        collapsedAll: true,
        states: [],
        filters: [],
        resetGroupFlag: false,
        initialized: false,
        history: {
            undo: [],
            redo: [],
        },
        zLayer: {
            min: 0,
            max: 0,
            cur: 0,
        },
    },
    remove: {
        objectState: null,
        force: false,
    },
    statistics: {
        visible: false,
        collecting: false,
        data: null,
    },
    propagate: {
        visible: false,
    },
    colors: [],
    sidebarCollapsed: false,
    appearanceCollapsed: false,
    filtersPanelVisible: false,
    workspace: Workspace.STANDARD,
};

export default (state = defaultState, action: AnyAction): AnnotationState => {
    switch (action.type) {
        case AnnotationActionTypes.GET_JOB: {
            return {
                ...state,
                job: {
                    ...state.job,
                    instance: null,
                    requestedId: action.payload.requestedId,
                    fetching: true,
                },
                annotations: {
                    ...state.annotations,
                    initialized: false,
                },
            };
        }
        case BoundariesActionTypes.RESET_AFTER_ERROR:
        case AnnotationActionTypes.GET_JOB_SUCCESS: {
            const {
                job,
                jobMeta,
                openTime,
                frameNumbers,
                frameNumber: number,
                frameFilename: filename,
                relatedFiles,
                colors,
                filters,
                frameData: data,
                queryParameters,
                groundTruthInstance,
                groundTruthJobFramesMeta,
                validationLayout,
            } = action.payload;

            const defaultLabel = job.labels.length ? job.labels[0] : null;
            const isReview = job.stage === JobStage.VALIDATION;
            let workspaceSelected = null;
            let activeObjectType;
            let activeShapeType = null;
            if (defaultLabel?.type === LabelType.TAG) {
                activeObjectType = ObjectType.TAG;
            } else {
                activeShapeType = labelShapeType(defaultLabel);
                activeObjectType = job.mode === 'interpolation' ? ObjectType.TRACK : ObjectType.SHAPE;
            }

            if (job.dimension === DimensionType.DIMENSION_2D) {
                if (queryParameters.initialWorkspace !== Workspace.STANDARD3D) {
                    workspaceSelected = queryParameters.initialWorkspace;
                }
                workspaceSelected = workspaceSelected || (isReview ? Workspace.REVIEW : Workspace.STANDARD);
            } else {
                workspaceSelected = Workspace.STANDARD3D;
                activeShapeType = ShapeType.CUBOID;
            }

            if (state.canvas.instance) {
                state.canvas.instance.destroy();
            }

            return {
                ...state,
                job: {
                    ...state.job,
                    openTime,
                    frameNumbers,
                    fetching: false,
                    instance: job,
                    meta: jobMeta,
                    labels: job.labels,
                    attributes: job.labels
                        .reduce((acc: Record<number, any[]>, label: any): Record<number, any[]> => {
                            acc[label.id] = label.attributes;
                            return acc;
                        }, {}),
                    groundTruthInfo: {
                        validationLayout,
                        groundTruthInstance,
                        groundTruthJobFramesMeta,
                    },
                    queryParameters: {
                        initialOpenGuide: queryParameters.initialOpenGuide,
                        defaultLabel: queryParameters.defaultLabel,
                        defaultPointsCount: queryParameters.defaultPointsCount,
                    },
                },
                annotations: {
                    ...state.annotations,
                    filters,
                    zLayer: {
                        ...state.annotations.zLayer,
                        cur: Number.MAX_SAFE_INTEGER,
                    },
                },
                player: {
                    ...state.player,
                    frame: {
                        ...state.player.frame,
                        filename,
                        relatedFiles,
                        number,
                        data,
                    },
                    frameAngles: Array(job.stopFrame - job.startFrame + 1).fill(0),
                },
                drawing: {
                    ...state.drawing,
                    activeLabelID: defaultLabel ? defaultLabel.id : null,
                    activeObjectType,
                    activeShapeType,
                },
                canvas: {
                    ...state.canvas,
                    instance: job.dimension === DimensionType.DIMENSION_2D ? new Canvas() : new Canvas3d(),
                },
                colors,
                workspace: isReview && job.dimension === DimensionType.DIMENSION_2D ?
                    Workspace.REVIEW : workspaceSelected,
            };
        }
        case AnnotationActionTypes.GET_JOB_FAILED: {
            return {
                ...state,
                job: {
                    ...state.job,
                    instance: undefined,
                    fetching: false,
                },
            };
        }
        case JobsActionTypes.UPDATE_JOB_SUCCESS: {
            return {
                ...state,
                job: {
                    ...state.job,
                    instance: action.payload.job,
                },
            };
        }
        case AnnotationActionTypes.GET_DATA_FAILED: {
            return {
                ...state,
                player: {
                    ...state.player,
                    frame: {
                        ...state.player.frame,
                        fetching: false,
                    },
                },
            };
        }
        case AnnotationActionTypes.CHANGE_FRAME: {
            return {
                ...state,
                player: {
                    ...state.player,
                    frame: {
                        ...state.player.frame,
                        fetching: true,
                    },
                },
                canvas: {
                    ...state.canvas,
                    ready: false,
                },
            };
        }
        case AnnotationActionTypes.CHANGE_FRAME_SUCCESS: {
            const { activatedStateID } = state.annotations;
            const {
                number,
                data,
                filename,
                relatedFiles,
                states,
                history,
                minZ,
                maxZ,
                curZ,
                delay,
                changeTime,
                changeFrameEvent,
            } = action.payload;

            return {
                ...state,
                player: {
                    ...state.player,
                    frame: {
                        data,
                        filename,
                        relatedFiles,
                        number,
                        fetching: false,
                        changeTime,
                        delay,
                        changeFrameEvent,
                    },
                },
                annotations: {
                    ...state.annotations,
                    activatedStateID: updateActivatedStateID(states, activatedStateID),
                    highlightedConflict: null,
                    states,
                    history,
                    zLayer: {
                        min: minZ,
                        max: maxZ,
                        cur: curZ,
                    },
                },
            };
        }
        case AnnotationActionTypes.CHANGE_FRAME_FAILED: {
            return {
                ...state,
                player: {
                    ...state.player,
                    frame: {
                        ...state.player.frame,
                        fetching: false,
                        changeFrameEvent: null,
                    },
                },
            };
        }
        case AnnotationActionTypes.ROTATE_FRAME: {
            const { offset, angle, rotateAll } = action.payload;
            return {
                ...state,
                player: {
                    ...state.player,
                    frameAngles: state.player.frameAngles.map((_angle: number, idx: number) => {
                        if (rotateAll || offset === idx) {
                            return angle;
                        }
                        return _angle;
                    }),
                },
            };
        }
        case AnnotationActionTypes.SAVE_ANNOTATIONS: {
            return {
                ...state,
                annotations: {
                    ...state.annotations,
                    saving: {
                        ...state.annotations.saving,
                        uploading: true,
                    },
                },
            };
        }
        case AnnotationActionTypes.SAVE_ANNOTATIONS_SUCCESS: {
            return {
                ...state,
                annotations: {
                    ...state.annotations,
                    saving: {
                        ...state.annotations.saving,
                        uploading: false,
                    },
                },
            };
        }
        case AnnotationActionTypes.SAVE_ANNOTATIONS_FAILED: {
            return {
                ...state,
                annotations: {
                    ...state.annotations,
                    saving: {
                        ...state.annotations.saving,
                        uploading: false,
                    },
                },
            };
        }
        case AnnotationActionTypes.SWITCH_PLAY: {
            const { playing } = action.payload;

            return {
                ...state,
                player: {
                    ...state.player,
                    playing,
                },
            };
        }
        case AnnotationActionTypes.COLLAPSE_SIDEBAR: {
            return {
                ...state,
                sidebarCollapsed: !state.sidebarCollapsed,
            };
        }
        case AnnotationActionTypes.COLLAPSE_APPEARANCE: {
            return {
                ...state,
                appearanceCollapsed: !state.appearanceCollapsed,
            };
        }
        case AnnotationActionTypes.COLLAPSE_OBJECT_ITEMS: {
            const { states, collapsed } = action.payload;

            const updatedCollapsedStates = { ...state.annotations.collapsed };
            const totalStatesCount = state.annotations.states.length;
            for (const objectState of states) {
                updatedCollapsedStates[objectState.clientID] = collapsed;
                for (const element of objectState.elements) {
                    updatedCollapsedStates[element.clientID] = collapsed;
                }
            }

            return {
                ...state,
                annotations: {
                    ...state.annotations,
                    collapsed: updatedCollapsedStates,
                    collapsedAll: states.length === totalStatesCount ? collapsed : state.annotations.collapsedAll,
                },
            };
        }
        case AnnotationActionTypes.CONFIRM_CANVAS_READY: {
            const { ranges } = action.payload;
            return {
                ...state,
                player: {
                    ...state.player,
                    ranges: ranges || state.player.ranges,
                    frame: {
                        ...state.player.frame,
                        changeFrameEvent: null,
                    },
                },
                canvas: {
                    ...state.canvas,
                    ready: true,
                },
            };
        }
        case AnnotationActionTypes.REMEMBER_OBJECT: {
            const { payload } = action;

            let { activeControl } = state.canvas;
            if (payload.updateCurrentControl) {
                if ('activeObjectType' in payload && payload.activeObjectType === ObjectType.TAG) {
                    activeControl = ActiveControl.CURSOR;
                } else if ('activeShapeType' in payload) {
                    const controlMapping = {
                        [ShapeType.RECTANGLE]: ActiveControl.DRAW_RECTANGLE,
                        [ShapeType.POLYGON]: ActiveControl.DRAW_POLYGON,
                        [ShapeType.POLYLINE]: ActiveControl.DRAW_POLYLINE,
                        [ShapeType.POINTS]: ActiveControl.DRAW_POINTS,
                        [ShapeType.ELLIPSE]: ActiveControl.DRAW_ELLIPSE,
                        [ShapeType.CUBOID]: ActiveControl.DRAW_CUBOID,
                        [ShapeType.SKELETON]: ActiveControl.DRAW_SKELETON,
                        [ShapeType.MASK]: ActiveControl.DRAW_MASK,
                    };

                    activeControl = controlMapping[payload.activeShapeType as ShapeType];
                }
            }

            return {
                ...state,
                annotations: {
                    ...state.annotations,
                    activatedStateID: null,
                },
                canvas: {
                    ...state.canvas,
                    activeControl,
                },
                drawing: {
                    ...defaultState.drawing,
                    ...payload,
                },
            };
        }
        case AnnotationActionTypes.REPEAT_DRAW_SHAPE: {
            const { activeControl } = action.payload;

            return {
                ...state,
                annotations: {
                    ...state.annotations,
                    activatedStateID: null,
                },
                canvas: {
                    ...state.canvas,
                    activeControl,
                },
            };
        }
        case AnnotationActionTypes.UPDATE_ACTIVE_CONTROL: {
            const { activeControl } = action.payload;

            return {
                ...state,
                annotations: {
                    ...state.annotations,
                    activatedStateID: null,
                },
                canvas: {
                    ...state.canvas,
                    activeControl,
                    contextMenu: {
                        ...defaultState.canvas.contextMenu,
                    },
                },
            };
        }
        case AnnotationActionTypes.UPDATE_ANNOTATIONS_SUCCESS: {
            const {
                history, states: updatedStates, minZ, maxZ,
            } = action.payload;
            const { states: prevStates } = state.annotations;
            const nextStates = [...prevStates];

            const clientIDs = prevStates.map((prevState: any): number => prevState.clientID);
            for (const updatedState of updatedStates) {
                const index = clientIDs.indexOf(updatedState.clientID);
                if (index !== -1) {
                    nextStates[index] = updatedState;
                }
            }

            const maxZLayer = Math.max(state.annotations.zLayer.max, maxZ);
            const minZLayer = Math.min(state.annotations.zLayer.min, minZ);

            return {
                ...state,
                annotations: {
                    ...state.annotations,
                    zLayer: {
                        min: minZLayer,
                        max: maxZLayer,
                        cur: clamp(state.annotations.zLayer.cur, minZLayer, maxZLayer),
                    },
                    states: nextStates,
                    history,
                },
            };
        }
        case AnnotationActionTypes.RESET_ANNOTATIONS_GROUP: {
            return {
                ...state,
                annotations: {
                    ...state.annotations,
                    resetGroupFlag: true,
                },
            };
        }
        case AnnotationActionTypes.GROUP_ANNOTATIONS: {
            return {
                ...state,
                annotations: {
                    ...state.annotations,
                    resetGroupFlag: false,
                },
            };
        }
        case AnnotationActionTypes.ACTIVATE_OBJECT: {
            const { activatedStateID, activatedElementID, activatedAttributeID } = action.payload;
            const {
                canvas: { activeControl, instance },
                annotations: { highlightedConflict, states },
            } = state;

            const objectDoesNotExist = activatedStateID !== null &&
                !states.some((_state) => _state.clientID === activatedStateID);
            const canvasIsNotReady = (instance as Canvas | Canvas3d)
                .mode() !== CanvasMode.IDLE || activeControl !== ActiveControl.CURSOR;

            if (objectDoesNotExist || canvasIsNotReady || highlightedConflict) {
                return state;
            }

            return {
                ...state,
                annotations: {
                    ...state.annotations,
                    activatedStateID,
                    activatedElementID,
                    activatedAttributeID,
                },
            };
        }
        case AnnotationActionTypes.REMOVE_OBJECT: {
            const { objectState, force } = action.payload;
            return {
                ...state,
                remove: {
                    ...state.remove,
                    objectState,
                    force,
                },
            };
        }
        case AnnotationActionTypes.UPDATE_EDITED_STATE: {
            const { objectState } = action.payload;
            return {
                ...state,
                editing: {
                    ...state.editing,
                    objectState,
                },
            };
        }
        case AnnotationActionTypes.HIDE_ACTIVE_OBJECT: {
            const { hide } = action.payload;
            return {
                ...state,
                canvas: {
                    ...state.canvas,
                    activeObjectHidden: hide,
                },
            };
        }
        case AnnotationActionTypes.REMOVE_OBJECT_SUCCESS: {
            const { objectState, history } = action.payload;
            const contextMenuClientID = state.canvas.contextMenu.clientID;
            const contextMenuVisible = state.canvas.contextMenu.visible;

            return {
                ...state,
                annotations: {
                    ...state.annotations,
                    history,
                    activatedStateID: null,
                    states: state.annotations.states.filter(
                        (_objectState: any) => _objectState.clientID !== objectState.clientID,
                    ),
                },
                canvas: {
                    ...state.canvas,
                    contextMenu: {
                        ...state.canvas.contextMenu,
                        clientID: objectState.clientID === contextMenuClientID ? null : contextMenuClientID,
                        visible: objectState.clientID === contextMenuClientID ? false : contextMenuVisible,
                    },
                },
                remove: {
                    objectState: null,
                    force: false,
                },
            };
        }
        case AnnotationActionTypes.REMOVE_OBJECT_FAILED: {
            return {
                ...state,
                remove: {
                    objectState: null,
                    force: false,
                },
            };
        }
        case AnnotationActionTypes.PASTE_SHAPE: {
            const { activeControl } = action.payload;

            return {
                ...state,
                canvas: {
                    ...state.canvas,
                    activeControl,
                    contextMenu: {
                        ...defaultState.canvas.contextMenu,
                    },
                },
                annotations: {
                    ...state.annotations,
                    activatedStateID: null,
                },
            };
        }
        case AnnotationActionTypes.COPY_SHAPE: {
            const { objectState } = action.payload;

            return {
                ...state,
                drawing: {
                    ...state.drawing,
                    activeInitialState: objectState,
                },
            };
        }
        case AnnotationActionTypes.PROPAGATE_OBJECT_SUCCESS: {
            const { history } = action.payload;
            return {
                ...state,
                annotations: {
                    ...state.annotations,
                    history,
                },
            };
        }
        case AnnotationActionTypes.SWITCH_PROPAGATE_VISIBILITY: {
            const { visible } = action.payload;
            return {
                ...state,
                propagate: {
                    visible,
                },
            };
        }
        case AnnotationActionTypes.SWITCH_SHOWING_STATISTICS: {
            const { visible } = action.payload;

            return {
                ...state,
                statistics: {
                    ...state.statistics,
                    visible,
                },
            };
        }
        case AnnotationActionTypes.SWITCH_SHOWING_FILTERS: {
            const { visible } = action.payload;

            return {
                ...state,
                filtersPanelVisible: visible,
            };
        }
        case AnnotationActionTypes.COLLECT_STATISTICS: {
            return {
                ...state,
                statistics: {
                    ...state.statistics,
                    collecting: true,
                },
            };
        }
        case AnnotationActionTypes.COLLECT_STATISTICS_SUCCESS: {
            const { data } = action.payload;
            return {
                ...state,
                statistics: {
                    ...state.statistics,
                    collecting: false,
                    data,
                },
            };
        }
        case AnnotationActionTypes.COLLECT_STATISTICS_FAILED: {
            return {
                ...state,
                statistics: {
                    ...state.statistics,
                    collecting: false,
                    data: null,
                },
            };
        }
        case AnnotationActionTypes.UPLOAD_JOB_ANNOTATIONS: {
            const { job, loader } = action.payload;
            const { loads } = state.activities;
            loads[job.id] = job.id in loads ? loads[job.id] : loader.name;

            return {
                ...state,
                activities: {
                    ...state.activities,
                    loads: {
                        ...loads,
                    },
                },
            };
        }
        case AnnotationActionTypes.UPLOAD_JOB_ANNOTATIONS_FAILED: {
            const { job } = action.payload;
            const { loads } = state.activities;

            delete loads[job.id];

            return {
                ...state,
                activities: {
                    ...state.activities,
                    loads: {
                        ...loads,
                    },
                },
            };
        }
        case AnnotationActionTypes.UPLOAD_JOB_ANNOTATIONS_SUCCESS: {
            return {
                ...state,
                annotations: {
                    ...state.annotations,
                    history: { undo: [], redo: [] },
                    states: [],
                    activatedStateID: null,
                    activatedElementID: null,
                    activatedAttributeID: null,
                    highlightedConflict: null,
                    collapsed: {},
                },
            };
        }
        case AnnotationActionTypes.REMOVE_JOB_ANNOTATIONS_SUCCESS: {
            return {
                ...state,
                annotations: {
                    ...state.annotations,
                    activatedStateID: null,
                    collapsed: {},
                },
            };
        }
        case AnnotationActionTypes.UPDATE_CANVAS_CONTEXT_MENU: {
            const {
                visible, left, top, type, pointID,
            } = action.payload;

            const { activatedElementID, activatedStateID } = state.annotations;

            return {
                ...state,
                canvas: {
                    ...state.canvas,
                    contextMenu: {
                        ...state.canvas.contextMenu,
                        visible,
                        left,
                        top,
                        type,
                        pointID,
                        clientID: Number.isInteger(activatedElementID) ? activatedElementID : activatedStateID,
                        parentID: Number.isInteger(activatedElementID) ? activatedStateID : null,
                    },
                },
            };
        }
        case AnnotationActionTypes.UPDATE_BRUSH_TOOLS_CONFIG: {
            return {
                ...state,
                canvas: {
                    ...state.canvas,
                    brushTools: {
                        ...state.canvas.brushTools,
                        ...action.payload,
                    },
                },
            };
        }
        case AnnotationActionTypes.FETCH_ANNOTATIONS_SUCCESS: {
            const { activatedStateID } = state.annotations;
            const {
                states, history, minZ, maxZ,
            } = action.payload;

            return {
                ...state,
                annotations: {
                    ...state.annotations,
                    activatedStateID: updateActivatedStateID(states, activatedStateID),
                    states,
                    history,
                    initialized: true,
                    zLayer: {
                        min: minZ,
                        max: maxZ,
                        cur: clamp(state.annotations.zLayer.cur, minZ, maxZ),
                    },
                },
            };
        }
        case AnnotationActionTypes.FETCH_ANNOTATIONS_FAILED: {
            return {
                ...state,
                annotations: {
                    ...state.annotations,
                    initialized: true,
                },
            };
        }
        case AnnotationActionTypes.CHANGE_ANNOTATIONS_FILTERS: {
            const { filters } = action.payload;
            return {
                ...state,
                annotations: {
                    ...state.annotations,
                    filters,
                },
            };
        }
        case AnnotationActionTypes.SWITCH_Z_LAYER: {
            const { cur } = action.payload;
            const { max, min } = state.annotations.zLayer;

            let { activatedStateID } = state.annotations;
            if (activatedStateID !== null) {
                const idx = state.annotations.states.map((_state: any) => _state.clientID).indexOf(activatedStateID);
                if (idx !== -1) {
                    if (state.annotations.states[idx].zOrder > cur) {
                        activatedStateID = null;
                    }
                } else {
                    activatedStateID = null;
                }
            }

            return {
                ...state,
                annotations: {
                    ...state.annotations,
                    activatedStateID,
                    zLayer: {
                        ...state.annotations.zLayer,
                        cur: clamp(cur, min, max),
                    },
                },
            };
        }
        case AnnotationActionTypes.ADD_Z_LAYER: {
            const { max } = state.annotations.zLayer;
            return {
                ...state,
                annotations: {
                    ...state.annotations,
                    zLayer: {
                        ...state.annotations.zLayer,
                        max: max + 1,
                        cur: max + 1,
                    },
                },
            };
        }
        case AnnotationActionTypes.INTERACT_WITH_CANVAS: {
            const { activeInteractor, activeLabelID, activeInteractorParameters } = action.payload;
            return {
                ...state,
                annotations: {
                    ...state.annotations,
                    activatedStateID: null,
                },
                drawing: {
                    ...state.drawing,
                    activeInteractor,
                    activeInteractorParameters,
                    activeLabelID,
                },
                canvas: {
                    ...state.canvas,
                    activeControl: activeInteractor.kind.startsWith('opencv') ?
                        ActiveControl.OPENCV_TOOLS :
                        ActiveControl.AI_TOOLS,
                },
            };
        }
        case AnnotationActionTypes.SET_FORCE_EXIT_ANNOTATION_PAGE_FLAG: {
            const { forceExit } = action.payload;
            return {
                ...state,
                annotations: {
                    ...state.annotations,
                    saving: {
                        ...state.annotations.saving,
                        forceExit,
                    },
                },
            };
        }
        case AnnotationActionTypes.CHANGE_WORKSPACE: {
            const { workspace } = action.payload;
            if (state.canvas.activeControl !== ActiveControl.CURSOR && state.workspace !== Workspace.SINGLE_SHAPE) {
                return state;
            }

            return {
                ...state,
                workspace,
                annotations: {
                    ...state.annotations,
                    states: state.annotations.states.filter((_state) => !_state.isGroundTruth),
                    activatedStateID: null,
                    activatedAttributeID: null,

                },
                canvas: {
                    ...state.canvas,
                    activeControl: ActiveControl.CURSOR,
                },
            };
        }
        case AnnotationActionTypes.RESET_CANVAS: {
            return {
                ...state,
                canvas: {
                    ...state.canvas,
                    activeControl: ActiveControl.CURSOR,
                },
            };
        }
        case AnnotationActionTypes.SWITCH_NAVIGATION_BLOCKED: {
            return {
                ...state,
                player: {
                    ...state.player,
                    navigationBlocked: action.payload.navigationBlocked,
                },
            };
        }
        case AnnotationActionTypes.SET_NAVIGATION_TYPE: {
            return {
                ...state,
                player: {
                    ...state.player,
                    navigationType: action.payload.navigationType,
                },
            };
        }
        case AnnotationActionTypes.DELETE_FRAME_SUCCESS:
        case AnnotationActionTypes.RESTORE_FRAME_SUCCESS: {
            const { data } = action.payload;

            return {
                ...state,
                player: {
                    ...state.player,
                    frame: {
                        ...state.player.frame,
                        data,
                    },
                },
            };
        }
        case AnnotationActionTypes.HIGHLIGHT_CONFLICT: {
            const { conflict } = action.payload;
            if (conflict) {
                const { annotationConflicts: [mainConflict] } = conflict;

                // object may be hidden using annotations filter
                // it is not guaranteed to be visible
                const conflictObject = state.annotations.states
                    .find((_state) => _state.serverID === mainConflict.serverID);

                return {
                    ...state,
                    annotations: {
                        ...state.annotations,
                        highlightedConflict: conflict,
                        activatedStateID: conflictObject?.clientID || null,
                        activatedElementID: null,
                        activatedAttributeID: null,
                    },
                };
            }

            return {
                ...state,
                annotations: {
                    ...state.annotations,
                    highlightedConflict: conflict,
                },
            };
        }
        case AnnotationActionTypes.CLOSE_JOB:
        case AuthActionTypes.LOGOUT_SUCCESS: {
            return defaultState;
        }
        default: {
            return state;
        }
    }
};
