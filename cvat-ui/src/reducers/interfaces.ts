// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import { ExtendedKeyMapOptions } from 'react-hotkeys';
import { Canvas, RectDrawingMethod } from 'cvat-canvas-wrapper';

export type StringObject = {
    [index: string]: string;
};

export interface AuthState {
    initialized: boolean;
    fetching: boolean;
    user: any;
}

export interface TasksQuery {
    page: number;
    id: number | null;
    search: string | null;
    owner: string | null;
    assignee: string | null;
    name: string | null;
    status: string | null;
    mode: string | null;
    [key: string]: string | number | null;
}

export interface Task {
    instance: any; // cvat-core instance
    preview: string;
}

export interface TasksState {
    initialized: boolean;
    fetching: boolean;
    hideEmpty: boolean;
    gettingQuery: TasksQuery;
    count: number;
    current: Task[];
    activities: {
        dumps: {
            // dumps in different formats at the same time
            [tid: number]: string[]; // dumper names
        };
        exports: {
            // exports in different formats at the same time
            [tid: number]: string[]; // dumper names
        };
        loads: {
            // only one loading simultaneously
            [tid: number]: string; // loader name
        };
        deletes: {
            [tid: number]: boolean; // deleted (deleting if in dictionary)
        };
        creates: {
            status: string;
            error: string;
        };
    };
}

export interface FormatsState {
    annotationFormats: any;
    fetching: boolean;
    initialized: boolean;
}

// eslint-disable-next-line import/prefer-default-export
export enum SupportedPlugins {
    GIT_INTEGRATION = 'GIT_INTEGRATION',
    AUTO_ANNOTATION = 'AUTO_ANNOTATION',
    TF_ANNOTATION = 'TF_ANNOTATION',
    TF_SEGMENTATION = 'TF_SEGMENTATION',
    DEXTR_SEGMENTATION = 'DEXTR_SEGMENTATION',
    ANALYTICS = 'ANALYTICS',
    REID = 'REID',
}

export interface PluginsState {
    fetching: boolean;
    initialized: boolean;
    list: {
        [name in SupportedPlugins]: boolean;
    };
}

export interface UsersState {
    users: any[];
    fetching: boolean;
    initialized: boolean;
}

export interface AboutState {
    server: any;
    packageVersion: {
        core: string;
        canvas: string;
        ui: string;
    };
    fetching: boolean;
    initialized: boolean;
}

export interface UserAgreement {
    name: string;
    displayText: string;
    url: string;
    required: boolean;
}

export interface UserAgreementsState {
    list: UserAgreement[];
    fetching: boolean;
    initialized: boolean;
}

export interface ShareFileInfo { // get this data from cvat-core
    name: string;
    type: 'DIR' | 'REG';
}

export interface ShareItem {
    name: string;
    type: 'DIR' | 'REG';
    children: ShareItem[];
}

export interface ShareState {
    root: ShareItem;
}

export interface Model {
    id: number | null; // null for preinstalled models
    ownerID: number | null; // null for preinstalled models
    name: string;
    primary: boolean;
    uploadDate: string;
    updateDate: string;
    labels: string[];
}

export enum RQStatus {
    unknown = 'unknown',
    queued = 'queued',
    started = 'started',
    finished = 'finished',
    failed = 'failed',
}

export enum ModelType {
    OPENVINO = 'openvino',
    RCNN = 'rcnn',
    MASK_RCNN = 'mask_rcnn',
}

export interface ActiveInference {
    status: RQStatus;
    progress: number;
    error: string;
    modelType: ModelType;
}

export interface ModelsState {
    initialized: boolean;
    fetching: boolean;
    creatingStatus: string;
    models: Model[];
    inferences: {
        [index: number]: ActiveInference;
    };
    visibleRunWindows: boolean;
    activeRunTask: any;
}

export interface ModelFiles {
    [key: string]: string | File;
    xml: string | File;
    bin: string | File;
    py: string | File;
    json: string | File;
}

export interface ErrorState {
    message: string;
    reason: string;
}

export interface NotificationsState {
    errors: {
        auth: {
            authorized: null | ErrorState;
            login: null | ErrorState;
            logout: null | ErrorState;
            register: null | ErrorState;
        };
        tasks: {
            fetching: null | ErrorState;
            updating: null | ErrorState;
            dumping: null | ErrorState;
            loading: null | ErrorState;
            exporting: null | ErrorState;
            deleting: null | ErrorState;
            creating: null | ErrorState;
        };
        formats: {
            fetching: null | ErrorState;
        };
        users: {
            fetching: null | ErrorState;
        };
        about: {
            fetching: null | ErrorState;
        };
        share: {
            fetching: null | ErrorState;
        };
        models: {
            creating: null | ErrorState;
            starting: null | ErrorState;
            deleting: null | ErrorState;
            fetching: null | ErrorState;
            canceling: null | ErrorState;
            metaFetching: null | ErrorState;
            inferenceStatusFetching: null | ErrorState;
        };
        annotation: {
            saving: null | ErrorState;
            jobFetching: null | ErrorState;
            frameFetching: null | ErrorState;
            changingLabelColor: null | ErrorState;
            updating: null | ErrorState;
            creating: null | ErrorState;
            merging: null | ErrorState;
            grouping: null | ErrorState;
            splitting: null | ErrorState;
            removing: null | ErrorState;
            propagating: null | ErrorState;
            collectingStatistics: null | ErrorState;
            savingJob: null | ErrorState;
            uploadAnnotations: null | ErrorState;
            removeAnnotations: null | ErrorState;
            fetchingAnnotations: null | ErrorState;
            undo: null | ErrorState;
            redo: null | ErrorState;
            search: null | ErrorState;
            savingLogs: null | ErrorState;
        };
        boundaries: {
            resetError: null | ErrorState;
        };
        userAgreements: {
            fetching: null | ErrorState;
        };

        [index: string]: any;
    };
    messages: {
        tasks: {
            loadingDone: string;
        };
        models: {
            inferenceDone: string;
        };

        [index: string]: any;
    };
}

export enum ActiveControl {
    CURSOR = 'cursor',
    DRAG_CANVAS = 'drag_canvas',
    ZOOM_CANVAS = 'zoom_canvas',
    DRAW_RECTANGLE = 'draw_rectangle',
    DRAW_POLYGON = 'draw_polygon',
    DRAW_POLYLINE = 'draw_polyline',
    DRAW_POINTS = 'draw_points',
    DRAW_CUBOID = 'draw_cuboid',
    MERGE = 'merge',
    GROUP = 'group',
    SPLIT = 'split',
    EDIT = 'edit',
}

export enum ShapeType {
    RECTANGLE = 'rectangle',
    POLYGON = 'polygon',
    POLYLINE = 'polyline',
    POINTS = 'points',
    CUBOID = 'cuboid',
}

export enum ObjectType {
    SHAPE = 'shape',
    TRACK = 'track',
    TAG = 'tag',
}

export enum StatesOrdering {
    ID_DESCENT = 'ID - descent',
    ID_ASCENT = 'ID - ascent',
    UPDATED = 'Updated time',
}

export enum ContextMenuType {
    CANVAS = 'canvas',
    CANVAS_SHAPE = 'canvas_shape',
    CANVAS_SHAPE_POINT = 'canvas_shape_point',
}

export enum Rotation {
    ANTICLOCKWISE90,
    CLOCKWISE90,
}

export interface AnnotationState {
    activities: {
        loads: {
            // only one loading simultaneously
            [jid: number]: string; // loader name
        };
    };
    canvas: {
        contextMenu: {
            visible: boolean;
            top: number;
            left: number;
            type: ContextMenuType;
            pointID: number | null;
        };
        instance: Canvas;
        ready: boolean;
        activeControl: ActiveControl;
    };
    job: {
        labels: any[];
        requestedId: number | null;
        instance: any | null | undefined;
        attributes: Record<number, any[]>;
        fetching: boolean;
        saving: boolean;
    };
    player: {
        frame: {
            number: number;
            filename: string;
            data: any | null;
            fetching: boolean;
            delay: number;
            changeTime: number | null;
        };
        playing: boolean;
        frameAngles: number[];
    };
    drawing: {
        activeShapeType: ShapeType;
        activeRectDrawingMethod?: RectDrawingMethod;
        activeNumOfPoints?: number;
        activeLabelID: number;
        activeObjectType: ObjectType;
        activeInitialState?: any;
    };
    annotations: {
        selectedStatesID: number[];
        activatedStateID: number | null;
        activatedAttributeID: number | null;
        collapsed: Record<number, boolean>;
        states: any[];
        filters: string[];
        filtersHistory: string[];
        resetGroupFlag: boolean;
        history: {
            undo: [string, number][];
            redo: [string, number][];
        };
        saving: {
            uploading: boolean;
            statuses: string[];
        };
        zLayer: {
            min: number;
            max: number;
            cur: number;
        };
    };
    propagate: {
        objectState: any | null;
        frames: number;
    };
    statistics: {
        collecting: boolean;
        visible: boolean;
        data: any;
    };
    colors: any[];
    sidebarCollapsed: boolean;
    appearanceCollapsed: boolean;
    tabContentHeight: number;
    workspace: Workspace;
}

export enum Workspace {
    STANDARD = 'Standard',
    ATTRIBUTE_ANNOTATION = 'Attribute annotation',
}

export enum GridColor {
    White = 'White',
    Black = 'Black',
    Red = 'Red',
    Green = 'Green',
    Blue = 'Blue',
}

export enum FrameSpeed {
    Fastest = 100,
    Fast = 50,
    Usual = 25,
    Slow = 15,
    Slower = 12,
    Slowest = 1,
}

export enum ColorBy {
    INSTANCE = 'Instance',
    GROUP = 'Group',
    LABEL = 'Label',
}

export interface PlayerSettingsState {
    frameStep: number;
    frameSpeed: FrameSpeed;
    resetZoom: boolean;
    rotateAll: boolean;
    grid: boolean;
    gridSize: number;
    gridColor: GridColor;
    gridOpacity: number; // in %
    brightnessLevel: number;
    contrastLevel: number;
    saturationLevel: number;
}

export interface WorkspaceSettingsState {
    autoSave: boolean;
    autoSaveInterval: number; // in ms
    aamZoomMargin: number;
    automaticBordering: boolean;
    showObjectsTextAlways: boolean;
    showAllInterpolationTracks: boolean;
}

export interface ShapesSettingsState {
    colorBy: ColorBy;
    opacity: number;
    selectedOpacity: number;
    blackBorders: boolean;
    showBitmap: boolean;
    showProjections: boolean;
}

export interface SettingsState {
    shapes: ShapesSettingsState;
    workspace: WorkspaceSettingsState;
    player: PlayerSettingsState;
}

export interface ShortcutsState {
    visibleShortcutsHelp: boolean;
    keyMap: Record<string, ExtendedKeyMapOptions>;
    normalizedKeyMap: Record<string, string>;
}

export interface CombinedState {
    auth: AuthState;
    tasks: TasksState;
    users: UsersState;
    about: AboutState;
    share: ShareState;
    formats: FormatsState;
    userAgreements: UserAgreementsState;
    plugins: PluginsState;
    models: ModelsState;
    notifications: NotificationsState;
    annotation: AnnotationState;
    settings: SettingsState;
    shortcuts: ShortcutsState;
}
