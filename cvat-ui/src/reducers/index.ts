// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

// eslint-disable-next-line import/no-extraneous-dependencies
import { Canvas3d } from 'cvat-canvas3d/src/typescript/canvas3d';
import { Canvas, RectDrawingMethod, CuboidDrawingMethod } from 'cvat-canvas-wrapper';
import { Webhook } from 'cvat-core-wrapper';
import { IntelligentScissors } from 'utils/opencv-wrapper/intelligent-scissors';
import { KeyMap } from 'utils/mousetrap-react';
import { OpenCVTracker } from 'utils/opencv-wrapper/opencv-interfaces';

export type StringObject = {
    [index: string]: string;
};

export interface AuthState {
    initialized: boolean;
    fetching: boolean;
    user: any;
    authActionsFetching: boolean;
    authActionsInitialized: boolean;
    showChangePasswordDialog: boolean;
    allowChangePassword: boolean;
    allowResetPassword: boolean;
}

export interface ProjectsQuery {
    page: number;
    id: number | null;
    search: string | null;
    filter: string | null;
    sort: string | null;
}

export interface Project {
    instance: any;
    preview: string;
}

export interface ProjectsState {
    initialized: boolean;
    fetching: boolean;
    count: number;
    current: Project[];
    gettingQuery: ProjectsQuery;
    tasksGettingQuery: TasksQuery & { ordering: string };
    activities: {
        creates: {
            id: null | number;
            error: string;
        };
        deletes: {
            [projectId: number]: boolean; // deleted (deleting if in dictionary)
        };
    };
}

export interface TasksQuery {
    page: number;
    id: number | null;
    search: string | null;
    filter: string | null;
    sort: string | null;
    projectId: number | null;
}

export interface Task {
    instance: any; // cvat-core instance
    preview: string;
}

export interface JobsQuery {
    page: number;
    sort: string | null;
    search: string | null;
    filter: string | null;
}

export interface JobsState {
    query: JobsQuery;
    fetching: boolean;
    count: number;
    current: any[];
    previews: string[];
}

export interface TasksState {
    initialized: boolean;
    fetching: boolean;
    updating: boolean;
    hideEmpty: boolean;
    moveTask: {
        modalVisible: boolean;
        taskId: number | null;
    };
    gettingQuery: TasksQuery;
    count: number;
    current: Task[];
    activities: {
        deletes: {
            [tid: number]: boolean; // deleted (deleting if in dictionary)
        };
        jobUpdates: {
            [jid: number]: boolean,
        };
    };
}

export interface ExportState {
    projects: {
        dataset: {
            current: {
                [id: number]: string[];
            };
            modalInstance: any | null;
        };
        backup: {
            current: {
                [id: number]: boolean;
            };
            modalInstance: any | null;
        };
    };
    tasks: {
        dataset: {
            current: {
                [id: number]: string[];
            };
            modalInstance: any | null;
        };
        backup: {
            current: {
                [id: number]: boolean;
            };
            modalInstance: any | null;
        };
    };
    jobs: {
        dataset: {
            current: {
                [id: number]: string[];
            };
            modalInstance: any | null;
        };
    };
    instanceType: 'project' | 'task' | 'job' | null;
}

export interface ImportState {
    projects: {
        dataset: {
            modalInstance: any | null;
            current: {
                [id: number]: {
                    format: string;
                    progress: number;
                    status: string;
                };
            };
        };
        backup: {
            modalVisible: boolean;
            importing: boolean;
        }
    };
    tasks: {
        dataset: {
            modalInstance: any | null;
            current: {
                [id: number]: string;
            };
        };
        backup: {
            modalVisible: boolean;
            importing: boolean;
        }
    };
    jobs: {
        dataset: {
            modalInstance: any | null;
            current: {
                [id: number]: string;
            };
        };
    };
    instanceType: 'project' | 'task' | 'job' | null;
}

export interface FormatsState {
    annotationFormats: any;
    fetching: boolean;
    initialized: boolean;
}

export interface CloudStoragesQuery {
    page: number;
    id: number | null;
    search: string | null;
    sort: string | null;
    filter: string | null;
}

interface CloudStorageAdditional {
    fetching: boolean;
    initialized: boolean;
    status: string | null;
    preview: string;
}
type CloudStorageStatus = Pick<CloudStorageAdditional, 'fetching' | 'initialized' | 'status'>;
type CloudStoragePreview = Pick<CloudStorageAdditional, 'fetching' | 'initialized' | 'preview'>;

export type CloudStorage = any;

export interface CloudStoragesState {
    initialized: boolean;
    fetching: boolean;
    count: number;
    current: CloudStorage[];
    statuses: {
        [index: number]: CloudStorageStatus;
    };
    previews: {
        [index: number]: CloudStoragePreview;
    };
    gettingQuery: CloudStoragesQuery;
    activities: {
        creates: {
            attaching: boolean;
            id: null | number;
            error: string;
        };
        updates: {
            updating: boolean;
            cloudStorageID: null | number;
            error: string;
        };
        deletes: {
            [cloudStorageID: number]: boolean;
        };
        contentLoads: {
            cloudStorageID: number | null;
            content: any | null;
            fetching: boolean;
            error: string;
        };
    };
}

export enum SupportedPlugins {
    GIT_INTEGRATION = 'GIT_INTEGRATION',
    ANALYTICS = 'ANALYTICS',
    MODELS = 'MODELS',
    PREDICT = 'PREDICT',
}

export type PluginsList = {
    [name in SupportedPlugins]: boolean;
};

export interface PluginsState {
    fetching: boolean;
    initialized: boolean;
    list: PluginsList;
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

export interface ShareFileInfo {
    // get this data from cvat-core
    name: string;
    type: 'DIR' | 'REG';
    mime_type: string;
}

export interface ShareItem {
    name: string;
    type: 'DIR' | 'REG';
    mime_type: string;
    children: ShareItem[];
}

export interface ShareState {
    root: ShareItem;
}

export interface ModelAttribute {
    name: string;
    values: string[];
    input_type: 'select' | 'number' | 'checkbox' | 'radio' | 'text';
}

export interface Model {
    id: string;
    name: string;
    labels: string[];
    attributes: Record<string, ModelAttribute[]>;
    framework: string;
    description: string;
    type: string;
    onChangeToolsBlockerState: (event: string) => void;
    tip: {
        message: string;
        gif: string;
    };
    params: {
        canvas: Record<string, number | boolean>;
    };
}

export type OpenCVTool = IntelligentScissors | OpenCVTracker;

export interface ToolsBlockerState {
    algorithmsLocked?: boolean;
    buttonVisible?: boolean;
}

export enum TaskStatus {
    ANNOTATION = 'annotation',
    REVIEW = 'validation',
    COMPLETED = 'completed',
}

export enum JobStage {
    ANNOTATION = 'annotation',
    REVIEW = 'validation',
    ACCEPTANCE = 'acceptance',
}

export enum RQStatus {
    unknown = 'unknown',
    queued = 'queued',
    started = 'started',
    finished = 'finished',
    failed = 'failed',
}

export interface ActiveInference {
    status: RQStatus;
    progress: number;
    error: string;
    id: string;
}

export interface ModelsState {
    initialized: boolean;
    fetching: boolean;
    creatingStatus: string;
    interactors: Model[];
    detectors: Model[];
    trackers: Model[];
    reid: Model[];
    inferences: {
        [index: number]: ActiveInference;
    };
    modelRunnerIsVisible: boolean;
    modelRunnerTask: any;
}

export interface ErrorState {
    message: string;
    reason: string;
    className?: string;
}

export interface NotificationsState {
    errors: {
        auth: {
            authorized: null | ErrorState;
            login: null | ErrorState;
            logout: null | ErrorState;
            register: null | ErrorState;
            changePassword: null | ErrorState;
            requestPasswordReset: null | ErrorState;
            resetPassword: null | ErrorState;
            loadAuthActions: null | ErrorState;
        };
        projects: {
            fetching: null | ErrorState;
            updating: null | ErrorState;
            deleting: null | ErrorState;
            creating: null | ErrorState;
            restoring: null | ErrorState;
            backuping: null | ErrorState;
        };
        tasks: {
            fetching: null | ErrorState;
            updating: null | ErrorState;
            dumping: null | ErrorState;
            loading: null | ErrorState;
            exportingAsDataset: null | ErrorState;
            deleting: null | ErrorState;
            creating: null | ErrorState;
            exporting: null | ErrorState;
            importing: null | ErrorState;
            moving: null | ErrorState;
        };
        jobs: {
            updating: null | ErrorState;
            fetching: null | ErrorState;
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
            starting: null | ErrorState;
            fetching: null | ErrorState;
            canceling: null | ErrorState;
            metaFetching: null | ErrorState;
            inferenceStatusFetching: null | ErrorState;
        };
        annotation: {
            saving: null | ErrorState;
            jobFetching: null | ErrorState;
            frameFetching: null | ErrorState;
            contextImageFetching: null | ErrorState;
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
            searchEmptyFrame: null | ErrorState;
            deleteFrame: null | ErrorState;
            restoreFrame: null | ErrorState;
            savingLogs: null | ErrorState;
        };
        boundaries: {
            resetError: null | ErrorState;
        };
        userAgreements: {
            fetching: null | ErrorState;
        };
        review: {
            finishingIssue: null | ErrorState;
            resolvingIssue: null | ErrorState;
            reopeningIssue: null | ErrorState;
            commentingIssue: null | ErrorState;
            submittingReview: null | ErrorState;
            deletingIssue: null | ErrorState;
        };
        predictor: {
            prediction: null | ErrorState;
        };
        exporting: {
            dataset: null | ErrorState;
            annotation: null | ErrorState;
            backup: null | ErrorState;
        };
        importing: {
            dataset: null | ErrorState;
            annotation: null | ErrorState;
            backup: null | ErrorState;
        };
        cloudStorages: {
            creating: null | ErrorState;
            fetching: null | ErrorState;
            updating: null | ErrorState;
            deleting: null | ErrorState;
        };
        organizations: {
            fetching: null | ErrorState;
            creating: null | ErrorState;
            updating: null | ErrorState;
            activation: null | ErrorState;
            deleting: null | ErrorState;
            leaving: null | ErrorState;
            inviting: null | ErrorState;
            updatingMembership: null | ErrorState;
            removingMembership: null | ErrorState;
        };
        webhooks: {
            fetching: null | ErrorState;
            creating: null | ErrorState;
            updating: null | ErrorState;
            deleting: null | ErrorState;
        };
    };
    messages: {
        tasks: {
            loadingDone: string;
            importingDone: string;
            movingDone: string;
        };
        models: {
            inferenceDone: string;
        };
        auth: {
            changePasswordDone: string;
            registerDone: string;
            requestPasswordResetDone: string;
            resetPasswordDone: string;
        };
        projects: {
            restoringDone: string;
        };
        exporting: {
            dataset: string;
            annotation: string;
            backup: string;
        };
        importing: {
            dataset: string;
            annotation: string;
            backup: string;
        };
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
    DRAW_ELLIPSE = 'draw_ellipse',
    DRAW_CUBOID = 'draw_cuboid',
    DRAW_SKELETON = 'draw_skeleton',
    MERGE = 'merge',
    GROUP = 'group',
    SPLIT = 'split',
    EDIT = 'edit',
    OPEN_ISSUE = 'open_issue',
    AI_TOOLS = 'ai_tools',
    PHOTO_CONTEXT = 'PHOTO_CONTEXT',
    OPENCV_TOOLS = 'opencv_tools',
}

export enum ShapeType {
    RECTANGLE = 'rectangle',
    POLYGON = 'polygon',
    POLYLINE = 'polyline',
    POINTS = 'points',
    ELLIPSE = 'ellipse',
    CUBOID = 'cuboid',
    SKELETON = 'skeleton',
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
    CANVAS_SHAPE = 'canvas_shape',
    CANVAS_SHAPE_POINT = 'canvas_shape_point',
}

export enum Rotation {
    ANTICLOCKWISE90,
    CLOCKWISE90,
}

export interface PredictorState {
    timeRemaining: number;
    progress: number;
    projectScore: number;
    message: string;
    error: Error | null;
    enabled: boolean;
    fetching: boolean;
    annotationAmount: number;
    mediaAmount: number;
    annotatedFrames: number[];
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
            parentID: number | null;
            clientID: number | null;
        };
        instance: Canvas | Canvas3d | null;
        ready: boolean;
        activeControl: ActiveControl;
    };
    job: {
        openTime: null | number;
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
            hasRelatedContext: boolean;
            data: any | null;
            fetching: boolean;
            delay: number;
            changeTime: number | null;
        };
        navigationBlocked: boolean;
        playing: boolean;
        frameAngles: number[];
        contextImage: {
            fetching: boolean;
            data: string | null;
            hidden: boolean;
        };
    };
    drawing: {
        activeInteractor?: Model | OpenCVTool;
        activeShapeType: ShapeType;
        activeRectDrawingMethod?: RectDrawingMethod;
        activeCuboidDrawingMethod?: CuboidDrawingMethod;
        activeNumOfPoints?: number;
        activeLabelID: number;
        activeObjectType: ObjectType;
        activeInitialState?: any;
    };
    annotations: {
        activatedStateID: number | null;
        activatedElementID: number | null;
        activatedAttributeID: number | null;
        collapsed: Record<number, boolean>;
        collapsedAll: boolean;
        states: any[];
        filters: any[];
        resetGroupFlag: boolean;
        history: {
            undo: [string, number][];
            redo: [string, number][];
        };
        saving: {
            forceExit: boolean;
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
    remove: {
        objectState: any;
        force: boolean;
    }
    statistics: {
        collecting: boolean;
        visible: boolean;
        data: any;
    };
    colors: any[];
    filtersPanelVisible: boolean;
    sidebarCollapsed: boolean;
    appearanceCollapsed: boolean;
    workspace: Workspace;
    predictor: PredictorState;
}

export enum Workspace {
    STANDARD3D = 'Standard 3D',
    STANDARD = 'Standard',
    ATTRIBUTE_ANNOTATION = 'Attribute annotation',
    TAG_ANNOTATION = 'Tag annotation',
    REVIEW_WORKSPACE = 'Review',
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
    canvasBackgroundColor: string;
    frameStep: number;
    frameSpeed: FrameSpeed;
    resetZoom: boolean;
    rotateAll: boolean;
    smoothImage: boolean;
    showDeletedFrames: boolean;
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
    intelligentPolygonCrop: boolean;
    defaultApproxPolyAccuracy: number;
    toolsBlockerState: ToolsBlockerState;
    textFontSize: number;
    controlPointsSize: number;
    textPosition: 'auto' | 'center';
    textContent: string;
    showTagsOnFrame: boolean;
}

export interface ShapesSettingsState {
    colorBy: ColorBy;
    opacity: number;
    selectedOpacity: number;
    outlined: boolean;
    outlineColor: string;
    showBitmap: boolean;
    showProjections: boolean;
}

export interface SettingsState {
    shapes: ShapesSettingsState;
    workspace: WorkspaceSettingsState;
    player: PlayerSettingsState;
    showDialog: boolean;
}

export interface ShortcutsState {
    visibleShortcutsHelp: boolean;
    keyMap: KeyMap;
    normalizedKeyMap: Record<string, string>;
}

export enum StorageLocation {
    LOCAL = 'local',
    CLOUD_STORAGE = 'cloud_storage',
}

export enum ReviewStatus {
    ACCEPTED = 'accepted',
    REJECTED = 'rejected',
    REVIEW_FURTHER = 'review_further',
}

export interface ReviewState {
    issues: any[];
    frameIssues: any[];
    latestComments: string[];
    newIssuePosition: number[] | null;
    issuesHidden: boolean;
    issuesResolvedHidden: boolean;
    fetching: {
        jobId: number | null;
        issueId: number | null;
    };
}

export interface OrganizationState {
    list: any[];
    current: any | null;
    initialized: boolean;
    fetching: boolean;
    creating: boolean;
    updating: boolean;
    inviting: boolean;
    leaving: boolean;
    removingMember: boolean;
    updatingMember: boolean;
}

export interface WebhooksQuery {
    page: number;
    id: number | null;
    search: string | null;
    filter: string | null;
    sort: string | null;
    projectId: number | null;
}

export interface WebhooksState {
    current: Webhook[],
    totalCount: number;
    fetching: boolean;
    query: WebhooksQuery;
}

export interface CombinedState {
    auth: AuthState;
    projects: ProjectsState;
    jobs: JobsState;
    tasks: TasksState;
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
    review: ReviewState;
    export: ExportState;
    import: ImportState;
    cloudStorages: CloudStoragesState;
    organizations: OrganizationState;
    webhooks: WebhooksState;
}

export enum DimensionType {
    DIM_3D = '3d',
    DIM_2D = '2d',
}

export interface Indexable {
    [index: string]: any;
}
