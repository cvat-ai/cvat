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
    ANALYTICS = 'ANALYTICS',
}

export interface PluginsState {
    initialized: boolean;
    plugins: {
        [name in SupportedPlugins]: boolean;
    };
}

export interface TaskState {
    task: Task | null;
    taskFetchingError: any;
    taskUpdatingError: any;
}

export interface UsersState {
    users: any[];
    initialized: boolean;
    gettingUsersError: any;
}
