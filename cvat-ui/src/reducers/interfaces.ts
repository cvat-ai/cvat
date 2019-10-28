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
    };
}

export interface FormatsState {
    loaders: any[];
    dumpers: any[];
    initialized: boolean;
    gettingFormatsError: any;
}
