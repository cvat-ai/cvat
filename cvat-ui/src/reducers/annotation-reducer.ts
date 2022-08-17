// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { AnyAction } from 'redux';
import { AnnotationActionTypes } from 'actions/annotation-actions';
import { AuthActionTypes } from 'actions/auth-actions';
import { BoundariesActionTypes } from 'actions/boundaries-actions';
import { Canvas, CanvasMode } from 'cvat-canvas-wrapper';
import { Canvas3d } from 'cvat-canvas3d-wrapper';

import {
    ActiveControl,
    AnnotationState,
    ContextMenuType,
    DimensionType,
    JobStage,
    ObjectType,
    ShapeType,
    Workspace,
} from '.';

function updateActivatedStateID(newStates: any[], prevActivatedStateID: number | null): number | null {
    return prevActivatedStateID === null || newStates.some((_state: any) => _state.clientID === prevActivatedStateID) ?
        prevActivatedStateID :
        null;
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
        instance: null,
        ready: false,
        activeControl: ActiveControl.CURSOR,
    },
    job: {
        openTime: null,
        labels: [],
        requestedId: null,
        instance: null,
        attributes: {},
        fetching: false,
        saving: false,
    },
    player: {
        frame: {
            number: 0,
            filename: '',
            data: null,
            hasRelatedContext: false,
            fetching: false,
            delay: 0,
            changeTime: null,
        },
        playing: false,
        frameAngles: [],
        navigationBlocked: false,
        contextImage: {
            fetching: false,
            data: null,
            hidden: false,
        },
    },
    drawing: {
        activeShapeType: ShapeType.RECTANGLE,
        activeLabelID: 0,
        activeObjectType: ObjectType.SHAPE,
    },
    annotations: {
        activatedStateID: null,
        activatedElementID: null,
        activatedAttributeID: null,
        saving: {
            forceExit: false,
            uploading: false,
            statuses: [],
        },
        collapsed: {},
        collapsedAll: true,
        states: [],
        filters: [],
        resetGroupFlag: false,
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
    propagate: {
        objectState: null,
        frames: 50,
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
    colors: [],
    sidebarCollapsed: false,
    appearanceCollapsed: false,
    filtersPanelVisible: false,
    predictor: {
        enabled: false,
        error: null,
        message: '',
        projectScore: 0,
        fetching: false,
        annotatedFrames: [],
        timeRemaining: 0,
        progress: 0,
        annotationAmount: 0,
        mediaAmount: 0,
    },
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
            };
        }
        case BoundariesActionTypes.RESET_AFTER_ERROR:
        case AnnotationActionTypes.GET_JOB_SUCCESS: {
            const {
                job,
                states,
                openTime,
                frameNumber: number,
                frameFilename: filename,
                frameHasRelatedContext,
                colors,
                filters,
                frameData: data,
                minZ,
                maxZ,
            } = action.payload;

            const isReview = job.stage === JobStage.REVIEW;
            let workspaceSelected = Workspace.STANDARD;

            const defaultLabel = job.labels.length ? job.labels[0] : null;
            let activeShapeType = defaultLabel && defaultLabel.type !== 'any' ?
                defaultLabel.type : ShapeType.RECTANGLE;

            if (job.dimension === DimensionType.DIM_3D) {
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
                    fetching: false,
                    instance: job,
                    labels: job.labels,
                    attributes: job.labels
                        .reduce((acc: Record<number, any[]>, label: any): Record<number, any[]> => {
                            acc[label.id] = label.attributes;
                            return acc;
                        }, {}),
                },
                annotations: {
                    ...state.annotations,
                    states,
                    filters,
                    zLayer: {
                        min: minZ,
                        max: maxZ,
                        cur: maxZ,
                    },
                },
                player: {
                    ...state.player,
                    frame: {
                        ...state.player.frame,
                        filename,
                        hasRelatedContext: frameHasRelatedContext,
                        number,
                        data,
                    },
                    frameAngles: Array(job.stopFrame - job.startFrame + 1).fill(0),
                },
                drawing: {
                    ...state.drawing,
                    activeLabelID: job.labels.length ? job.labels[0].id : null,
                    activeObjectType: job.mode === 'interpolation' ? ObjectType.TRACK : ObjectType.SHAPE,
                    activeShapeType,
                },
                canvas: {
                    ...state.canvas,
                    instance: job.dimension === DimensionType.DIM_2D ? new Canvas() : new Canvas3d(),
                },
                colors,
                workspace: isReview ? Workspace.REVIEW_WORKSPACE : workspaceSelected,
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
                hasRelatedContext,
                states,
                minZ,
                maxZ,
                curZ,
                delay,
                changeTime,
            } = action.payload;

            return {
                ...state,
                player: {
                    ...state.player,
                    frame: {
                        data,
                        filename,
                        hasRelatedContext,
                        number,
                        fetching: false,
                        changeTime,
                        delay,
                    },
                    contextImage: {
                        ...state.player.contextImage,
                        ...(state.player.frame.number === number ? {} : { data: null }),
                    },
                },
                annotations: {
                    ...state.annotations,
                    activatedStateID: updateActivatedStateID(states, activatedStateID),
                    states,
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
                        statuses: [],
                    },
                },
            };
        }
        case AnnotationActionTypes.SAVE_ANNOTATIONS_SUCCESS: {
            const { states } = action.payload;
            const { activatedStateID } = state.annotations;

            return {
                ...state,
                annotations: {
                    ...state.annotations,
                    states,
                    activatedStateID: updateActivatedStateID(states, activatedStateID),
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
        case AnnotationActionTypes.SAVE_UPDATE_ANNOTATIONS_STATUS: {
            const { status } = action.payload;

            return {
                ...state,
                annotations: {
                    ...state.annotations,
                    saving: {
                        ...state.annotations.saving,
                        statuses: [...state.annotations.saving.statuses, status],
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
            return {
                ...state,
                canvas: {
                    ...state.canvas,
                    ready: true,
                },
            };
        }
        case AnnotationActionTypes.DRAG_CANVAS: {
            const { enabled } = action.payload;
            const activeControl = enabled ? ActiveControl.DRAG_CANVAS : ActiveControl.CURSOR;

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
        case AnnotationActionTypes.ZOOM_CANVAS: {
            const { enabled } = action.payload;
            const activeControl = enabled ? ActiveControl.ZOOM_CANVAS : ActiveControl.CURSOR;

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
        case AnnotationActionTypes.REMEMBER_OBJECT: {
            const { payload } = action;

            let { activeControl } = state.canvas;
            if (payload.activeShapeType === ShapeType.RECTANGLE) {
                activeControl = ActiveControl.DRAW_RECTANGLE;
            } else if (payload.activeShapeType === ShapeType.POLYGON) {
                activeControl = ActiveControl.DRAW_POLYGON;
            } else if (payload.activeShapeType === ShapeType.POLYLINE) {
                activeControl = ActiveControl.DRAW_POLYLINE;
            } else if (payload.activeShapeType === ShapeType.POINTS) {
                activeControl = ActiveControl.DRAW_POINTS;
            } else if (payload.activeShapeType === ShapeType.ELLIPSE) {
                activeControl = ActiveControl.DRAW_ELLIPSE;
            } else if (payload.activeShapeType === ShapeType.CUBOID) {
                activeControl = ActiveControl.DRAW_CUBOID;
            } else if (payload.activeShapeType === ShapeType.SKELETON) {
                activeControl = ActiveControl.DRAW_SKELETON;
            } else if (payload.activeObjectType === ObjectType.TAG) {
                activeControl = ActiveControl.CURSOR;
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
                    ...state.drawing,
                    ...payload,
                    activeInteractor: undefined,
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
        case AnnotationActionTypes.SELECT_ISSUE_POSITION: {
            const { enabled } = action.payload;
            const activeControl = enabled ? ActiveControl.OPEN_ISSUE : ActiveControl.CURSOR;

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
        case AnnotationActionTypes.MERGE_OBJECTS: {
            const { enabled } = action.payload;
            const activeControl = enabled ? ActiveControl.MERGE : ActiveControl.CURSOR;

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
        case AnnotationActionTypes.GROUP_OBJECTS: {
            const { enabled } = action.payload;
            const activeControl = enabled ? ActiveControl.GROUP : ActiveControl.CURSOR;

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
        case AnnotationActionTypes.SPLIT_TRACK: {
            const { enabled } = action.payload;
            const activeControl = enabled ? ActiveControl.SPLIT : ActiveControl.CURSOR;

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
        case AnnotationActionTypes.SHAPE_DRAWN: {
            return {
                ...state,
                canvas: {
                    ...state.canvas,
                    activeControl: ActiveControl.CURSOR,
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
                        cur: maxZLayer,
                    },
                    states: nextStates,
                    history,
                },
            };
        }
        case AnnotationActionTypes.UPDATE_ANNOTATIONS_FAILED: {
            const { states } = action.payload;
            return {
                ...state,
                annotations: {
                    ...state.annotations,
                    states,
                },
            };
        }
        case AnnotationActionTypes.CREATE_ANNOTATIONS_SUCCESS: {
            const { states, history } = action.payload;

            return {
                ...state,
                annotations: {
                    ...state.annotations,
                    states,
                    history,
                },
            };
        }
        case AnnotationActionTypes.MERGE_ANNOTATIONS_SUCCESS: {
            const { states, history } = action.payload;

            return {
                ...state,
                annotations: {
                    ...state.annotations,
                    states,
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
        case AnnotationActionTypes.GROUP_ANNOTATIONS_SUCCESS: {
            const { states, history } = action.payload;

            return {
                ...state,
                annotations: {
                    ...state.annotations,
                    states,
                    history,
                },
            };
        }
        case AnnotationActionTypes.SPLIT_ANNOTATIONS_SUCCESS: {
            const { states, history } = action.payload;

            return {
                ...state,
                annotations: {
                    ...state.annotations,
                    states,
                    history,
                },
            };
        }
        case AnnotationActionTypes.ACTIVATE_OBJECT: {
            const { activatedStateID, activatedElementID, activatedAttributeID } = action.payload;

            const {
                canvas: { activeControl, instance },
            } = state;

            if (activeControl !== ActiveControl.CURSOR || (instance as Canvas | Canvas3d).mode() !== CanvasMode.IDLE) {
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
        case AnnotationActionTypes.EDIT_SHAPE: {
            const { enabled } = action.payload;
            const activeControl = enabled ? ActiveControl.EDIT : ActiveControl.CURSOR;

            return {
                ...state,
                canvas: {
                    ...state.canvas,
                    activeControl,
                },
            };
        }
        case AnnotationActionTypes.PROPAGATE_OBJECT: {
            const { objectState } = action.payload;
            return {
                ...state,
                propagate: {
                    ...state.propagate,
                    objectState,
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
                propagate: {
                    ...state.propagate,
                    objectState: null,
                },
            };
        }
        case AnnotationActionTypes.CHANGE_PROPAGATE_FRAMES: {
            const { frames } = action.payload;

            return {
                ...state,
                propagate: {
                    ...state.propagate,
                    frames,
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
            const { states, history } = action.payload;

            return {
                ...state,
                annotations: {
                    ...state.annotations,
                    history,
                    states,
                    activatedStateID: null,
                    collapsed: {},
                },
            };
        }
        // Added Remove Annotations
        case AnnotationActionTypes.REMOVE_JOB_ANNOTATIONS_SUCCESS: {
            const { history } = action.payload;
            const { states } = action.payload;
            return {
                ...state,
                annotations: {
                    ...state.annotations,
                    history,
                    states,
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
        case AnnotationActionTypes.REDO_ACTION_SUCCESS:
        case AnnotationActionTypes.UNDO_ACTION_SUCCESS: {
            const { activatedStateID } = state.annotations;
            const {
                history, states, minZ, maxZ,
            } = action.payload;

            return {
                ...state,
                annotations: {
                    ...state.annotations,
                    activatedStateID: updateActivatedStateID(states, activatedStateID),
                    states,
                    history,
                    zLayer: {
                        min: minZ,
                        max: maxZ,
                        cur: maxZ,
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
                    zLayer: {
                        min: minZ,
                        max: maxZ,
                        cur: maxZ,
                    },
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
                        cur: Math.max(Math.min(cur, max), min),
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
            const { activeInteractor, activeLabelID } = action.payload;
            return {
                ...state,
                annotations: {
                    ...state.annotations,
                    activatedStateID: null,
                },
                drawing: {
                    ...state.drawing,
                    activeInteractor,
                    activeLabelID,
                },
                canvas: {
                    ...state.canvas,
                    activeControl: activeInteractor.type.startsWith('opencv') ?
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
            if (state.canvas.activeControl !== ActiveControl.CURSOR) {
                return state;
            }

            return {
                ...state,
                workspace,
                annotations: {
                    ...state.annotations,
                    activatedStateID: null,
                    activatedAttributeID: null,
                },
            };
        }
        case AnnotationActionTypes.UPDATE_PREDICTOR_STATE: {
            const { payload } = action;
            return {
                ...state,
                predictor: {
                    ...state.predictor,
                    ...payload,
                },
            };
        }
        case AnnotationActionTypes.GET_PREDICTIONS: {
            return {
                ...state,
                predictor: {
                    ...state.predictor,
                    fetching: true,
                },
            };
        }
        case AnnotationActionTypes.GET_PREDICTIONS_SUCCESS: {
            const { frame } = action.payload;
            const annotatedFrames = [...state.predictor.annotatedFrames, frame];

            return {
                ...state,
                predictor: {
                    ...state.predictor,
                    fetching: false,
                    annotatedFrames,
                },
            };
        }
        case AnnotationActionTypes.GET_PREDICTIONS_FAILED: {
            return {
                ...state,
                predictor: {
                    ...state.predictor,
                    fetching: false,
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
        case AnnotationActionTypes.HIDE_SHOW_CONTEXT_IMAGE: {
            const { hidden } = action.payload;
            return {
                ...state,
                player: {
                    ...state.player,
                    contextImage: {
                        ...state.player.contextImage,
                        hidden,
                    },
                },
            };
        }
        case AnnotationActionTypes.GET_CONTEXT_IMAGE: {
            return {
                ...state,
                player: {
                    ...state.player,
                    contextImage: {
                        ...state.player.contextImage,
                        fetching: true,
                    },
                },
            };
        }
        case AnnotationActionTypes.GET_CONTEXT_IMAGE_SUCCESS: {
            const { contextImageData } = action.payload;

            return {
                ...state,
                player: {
                    ...state.player,
                    contextImage: {
                        ...state.player.contextImage,
                        fetching: false,
                        data: contextImageData,
                    },
                },
            };
        }
        case AnnotationActionTypes.GET_CONTEXT_IMAGE_FAILED: {
            return {
                ...state,
                player: {
                    ...state.player,
                    contextImage: {
                        ...state.player.contextImage,
                        fetching: false,
                    },
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
        case AnnotationActionTypes.DELETE_FRAME:
        case AnnotationActionTypes.RESTORE_FRAME: {
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
        case AnnotationActionTypes.DELETE_FRAME_FAILED:
        case AnnotationActionTypes.RESTORE_FRAME_FAILED: {
            return {
                ...state,
                player: {
                    ...state.player,
                    frame: {
                        ...state.player.frame,
                        fetching: false,
                    },
                },
                canvas: {
                    ...state.canvas,
                    ready: true,
                },
            };
        }
        case AnnotationActionTypes.DELETE_FRAME_SUCCESS:
        case AnnotationActionTypes.RESTORE_FRAME_SUCCESS: {
            return {
                ...state,
                player: {
                    ...state.player,
                    frame: {
                        ...state.player.frame,
                        data: action.payload.data,
                        fetching: false,
                    },
                },
                annotations: {
                    ...state.annotations,
                    history: action.payload.history,
                    states: action.payload.states,
                },
                canvas: {
                    ...state.canvas,
                    ready: true,
                },
            };
        }
        case AnnotationActionTypes.CLOSE_JOB:
        case AuthActionTypes.LOGOUT_SUCCESS: {
            if (state.canvas.instance) {
                state.canvas.instance.destroy();
            }
            return { ...defaultState };
        }
        default: {
            return state;
        }
    }
};
