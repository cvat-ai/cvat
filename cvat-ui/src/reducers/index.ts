// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2022-2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { Canvas3d } from 'cvat-canvas3d/src/typescript/canvas3d';
import { Canvas, RectDrawingMethod, CuboidDrawingMethod } from 'cvat-canvas-wrapper';
import {
    Webhook, MLModel, Organization, Job, Label, User,
    QualityConflict, FramesMetaData, RQStatus, Event, Invitation, SerializedAPISchema,
} from 'cvat-core-wrapper';
import { IntelligentScissors } from 'utils/opencv-wrapper/intelligent-scissors';
import { KeyMap } from 'utils/mousetrap-react';
import { OpenCVTracker } from 'utils/opencv-wrapper/opencv-interfaces';
import { ImageFilter } from 'utils/image-processing';

export interface AuthState {
    initialized: boolean;
    fetching: boolean;
    user: User | null;
    showChangePasswordDialog: boolean;
    hasEmailVerificationBeenSent: boolean;
}

export interface ProjectsQuery {
    page: number;
    id: number | null;
    search: string | null;
    filter: string | null;
    sort: string | null;
}

interface Preview {
    fetching: boolean;
    initialized: boolean;
    preview: string;
}

export type Project = any;

export interface ProjectsState {
    initialized: boolean;
    fetching: boolean;
    count: number;
    current: Project[];
    previews: {
        [index: number]: Preview;
    };
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

export type Task = any; // cvat-core instance

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
    current: Job[];
    previews: {
        [index: number]: Preview;
    };
    activities: {
        deletes: {
            [tid: number]: boolean;
        };
    };
}

export interface TasksState {
    initialized: boolean;
    fetching: boolean;
    moveTask: {
        modalVisible: boolean;
        taskId: number | null;
    };
    gettingQuery: TasksQuery;
    count: number;
    current: Task[];
    previews: {
        [index: number]: Preview;
    };
    activities: {
        deletes: {
            [tid: number]: boolean; // deleted (deleting if in dictionary)
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

interface CloudStorageStatus {
    fetching: boolean;
    initialized: boolean;
    status: string | null;
}

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
        [index: number]: Preview;
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
    ANALYTICS = 'ANALYTICS',
    MODELS = 'MODELS',
}

export type PluginsList = {
    [name in SupportedPlugins]: boolean;
};

export interface PluginComponent {
    component: any;
    data: {
        weight: number;
        shouldBeRendered: (props?: object, state?: object) => boolean;
    };
}

export interface PluginsState {
    fetching: boolean;
    initialized: boolean;
    list: PluginsList;
    current: {
        [index: string]: {
            destructor: CallableFunction;
            globalStateDidUpdate?: CallableFunction;
        };
    };
    components: {
        header: {
            userMenu: {
                items: PluginComponent[],
            };
        };
        loginPage: {
            loginForm: PluginComponent[];
        };
        modelsPage: {
            topBar: {
                items: PluginComponent[],
            },
            modelItem: {
                menu: {
                    items: PluginComponent[],
                },
                topBar:{
                    menu: {
                        items: PluginComponent[],
                    }
                },
            }
        };
        projectActions: {
            items: PluginComponent[];
        };
        taskActions: {
            items: PluginComponent[];
        };
        taskItem: {
            ribbon: PluginComponent[];
        };
        projectItem: {
            ribbon: PluginComponent[];
        };
        annotationPage: {
            header: {
                player: PluginComponent[];
            };
        };
        settings: {
            player: PluginComponent[];
        }
        about: {
            links: {
                items: PluginComponent[];
            }
        }
        router: PluginComponent[];
        loggedInModals: PluginComponent[];
    }
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

export interface ServerAPIState {
    schema: SerializedAPISchema | null;
    fetching: boolean;
    initialized: boolean;
    configuration: {
        isRegistrationEnabled: boolean;
        isBasicLoginEnabled: boolean;
        isPasswordResetEnabled: boolean;
        isPasswordChangeEnabled: boolean;
    };
}

export interface UserAgreement {
    name: string;
    urlDisplayText: string;
    url: string;
    textPrefix: string;
    required: boolean;
}

export interface UserAgreementsState {
    list: UserAgreement[];
    fetching: boolean;
    initialized: boolean;
}

export type RemoteFileType = 'DIR' | 'REG';

export interface ModelAttribute {
    name: string;
    values: string[];
    input_type: 'select' | 'number' | 'checkbox' | 'radio' | 'text';
}

export interface ModelsQuery {
    page: number;
    id: number | null;
    search: string | null;
    filter: string | null;
    sort: string | null;
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

export interface ActiveInference {
    status: RQStatus;
    progress: number;
    error: string;
    id: string;
    functionID: string | number;
}

export interface ModelsState {
    initialized: boolean;
    fetching: boolean;
    creatingStatus: string;
    interactors: MLModel[];
    detectors: MLModel[];
    trackers: MLModel[];
    reid: MLModel[];
    classifiers: MLModel[];
    totalCount: number;
    requestedInferenceIDs: {
        [index: string]: boolean;
    };
    inferences: {
        [index: number]: ActiveInference;
    };
    modelRunnerIsVisible: boolean;
    modelRunnerTask: any;
    query: ModelsQuery;
    previews: {
        [index: string]: Preview;
    };
}

export interface ErrorState {
    message: string;
    reason: Error;
    shouldLog?: boolean;
    className?: string;
}

export interface NotificationsState {
    errors: {
        auth: {
            authenticated: null | ErrorState;
            login: null | ErrorState;
            logout: null | ErrorState;
            register: null | ErrorState;
            changePassword: null | ErrorState;
            requestPasswordReset: null | ErrorState;
            resetPassword: null | ErrorState;
        };
        serverAPI: {
            fetching: null | ErrorState;
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
            creating: null | ErrorState;
            deleting: null | ErrorState;
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
        models: {
            starting: null | ErrorState;
            fetching: null | ErrorState;
            canceling: null | ErrorState;
            metaFetching: null | ErrorState;
            inferenceStatusFetching: null | ErrorState;
            creating: null | ErrorState;
            deleting: null | ErrorState;
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
            joining: null | ErrorState;
            slicing: null | ErrorState;
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
            deleteFrame: null | ErrorState;
            restoreFrame: null | ErrorState;
            savingLogs: null | ErrorState;
            canvas: null | ErrorState;
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
            deletingInvitation: null | ErrorState;
        };
        webhooks: {
            fetching: null | ErrorState;
            creating: null | ErrorState;
            updating: null | ErrorState;
            deleting: null | ErrorState;
        };
        analytics: {
            fetching: null | ErrorState;
            fetchingSettings: null | ErrorState;
            updatingSettings: null | ErrorState;
        };
        invitations: {
            fetching: null | ErrorState;
            acceptingInvitation: null | ErrorState;
            decliningInvitation: null | ErrorState;
            resendingInvitation: null | ErrorState;
        }
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
        invitations: {
            newInvitations: string;
            acceptInvitationDone: string;
            declineInvitationDone: string;
            resendingInvitation: string;
        }
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
    DRAW_MASK = 'draw_mask',
    DRAW_CUBOID = 'draw_cuboid',
    DRAW_SKELETON = 'draw_skeleton',
    MERGE = 'merge',
    GROUP = 'group',
    JOIN = 'join',
    SPLIT = 'split',
    SLICE = 'slice',
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
    MASK = 'mask',
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
    Z_ORDER = 'Z Order',
}

export enum ContextMenuType {
    CANVAS_SHAPE = 'canvas_shape',
    CANVAS_SHAPE_POINT = 'canvas_shape_point',
}

export enum Rotation {
    ANTICLOCKWISE90,
    CLOCKWISE90,
}

export enum NavigationType {
    REGULAR = 'regular',
    FILTERED = 'filtered',
    EMPTY = 'empty',
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
        brushTools: {
            visible: boolean;
            top: number;
            left: number;
        };
        instance: Canvas | Canvas3d | null;
        ready: boolean;
        activeControl: ActiveControl;
    };
    job: {
        openTime: null | number;
        labels: Label[];
        requestedId: number | null;
        instance: Job | null | undefined;
        queryParameters: {
            initialOpenGuide: boolean;
            defaultLabel: string | null;
            defaultPointsCount: number | null;
        };
        groundTruthJobFramesMeta: FramesMetaData | null;
        groundTruthInstance: Job | null;
        attributes: Record<number, any[]>;
        fetching: boolean;
        saving: boolean;
    };
    player: {
        frame: {
            number: number;
            filename: string;
            relatedFiles: number;
            data: any | null;
            fetching: boolean;
            delay: number;
            changeTime: number | null;
            changeFrameEvent: Event | null;
        };
        navigationType: NavigationType;
        ranges: string;
        navigationBlocked: boolean;
        playing: boolean;
        frameAngles: number[];
    };
    drawing: {
        activeInteractor?: MLModel | OpenCVTool;
        activeShapeType: ShapeType;
        activeRectDrawingMethod?: RectDrawingMethod;
        activeCuboidDrawingMethod?: CuboidDrawingMethod;
        activeNumOfPoints?: number;
        activeLabelID: number | null;
        activeObjectType: ObjectType;
        activeInitialState?: any;
    };
    annotations: {
        activatedStateID: number | null;
        activatedElementID: number | null;
        activatedAttributeID: number | null;
        highlightedConflict: QualityConflict | null;
        collapsed: Record<number, boolean>;
        collapsedAll: boolean;
        states: any[];
        filters: object[];
        resetGroupFlag: boolean;
        initialized: boolean;
        history: {
            undo: [string, number][];
            redo: [string, number][];
        };
        saving: {
            forceExit: boolean;
            uploading: boolean;
        };
        zLayer: {
            min: number;
            max: number;
            cur: number;
        };
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
    propagate: {
        visible: boolean;
    };
    colors: any[];
    filtersPanelVisible: boolean;
    sidebarCollapsed: boolean;
    appearanceCollapsed: boolean;
    workspace: Workspace;
}

export enum Workspace {
    STANDARD3D = 'Standard 3D',
    STANDARD = 'Standard',
    ATTRIBUTES = 'Attribute annotation',
    SINGLE_SHAPE = 'Single shape',
    TAGS = 'Tag annotation',
    REVIEW = 'Review',
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
    showGroundTruth: boolean;
}

export interface SettingsState {
    shapes: ShapesSettingsState;
    workspace: WorkspaceSettingsState;
    player: PlayerSettingsState;
    imageFilters: ImageFilter[];
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
    conflicts: QualityConflict[];
    frameConflicts: QualityConflict[];
    fetching: {
        jobId: number | null;
        issueId: number | null;
    };
}

export interface OrganizationState {
    current?: Organization | null;
    initialized: boolean;
    fetching: boolean;
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

export interface InvitationsQuery {
    page: number;
}

export interface InvitationsState {
    fetching: boolean;
    initialized: boolean;
    current: Invitation[];
    count: number;
    query: InvitationsQuery;
}

export interface CombinedState {
    auth: AuthState;
    projects: ProjectsState;
    jobs: JobsState;
    tasks: TasksState;
    about: AboutState;
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
    invitations: InvitationsState;
    webhooks: WebhooksState;
    serverAPI: ServerAPIState;
}

export interface Indexable {
    [index: string]: any;
}
