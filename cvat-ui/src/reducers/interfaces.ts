export interface AuthState {
    initialized: boolean;
    authError: any;
    loginError: any;
    logoutError: any;
    registerError: any;
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
    tasksFetchingError: any;
    taskUpdatingError: any;
    gettingQuery: TasksQuery;
    count: number;
    current: Task[];
    activities: {
        dumps: {
            dumpingError: any;
            byTask: {
                // dumps in different formats at the same time
                [tid: number]: string[]; // dumper names
            };
        };
        loads: {
            loadingError: any;
            loadingDoneMessage: string;
            byTask: {
                // only one loading simultaneously
                [tid: number]: string; // loader name
            };
        };
        deletes: {
            deletingError: any;
            byTask: {
                [tid: number]: boolean; // deleted (deleting if in dictionary)
            };
        };
        creates: {
            creatingError: any;
            status: string;
        };
    };
}

export interface FormatsState {
    loaders: any[];
    dumpers: any[];
    initialized: boolean;
    gettingFormatsError: any;
}

// eslint-disable-next-line import/prefer-default-export
export enum SupportedPlugins {
    GIT_INTEGRATION = 'GIT_INTEGRATION',
    AUTO_ANNOTATION = 'AUTO_ANNOTATION',
    TF_ANNOTATION = 'TF_ANNOTATION',
    TF_SEGMENTATION = 'TF_SEGMENTATION',
    ANALYTICS = 'ANALYTICS',
}

export interface PluginsState {
    initialized: boolean;
    plugins: {
        [name in SupportedPlugins]: boolean;
    };
}

export interface UsersState {
    users: any[];
    initialized: boolean;
    gettingUsersError: any;
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
    error: any;
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

export interface Running {
    [tid: string]: {
        status: string;
        processId: string;
        error: any;
    };
}

export interface ModelsState {
    initialized: boolean;
    creatingStatus: string;
    creatingError: any;
    startingError: any;
    fetchingError: any;
    deletingErrors: { // by id
        [index: number]: any;
    };
    models: Model[];
    runnings: Running[];
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

export interface CombinedState {
    auth: AuthState;
    tasks: TasksState;
    users: UsersState;
    share: ShareState;
    formats: FormatsState;
    plugins: PluginsState;
    models: ModelsState;
}
