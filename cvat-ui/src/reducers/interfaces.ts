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

export interface DumpState {
    dumperName: string;
}

export interface LoadState {
    loaderName: string;
}

export interface Task {
    instance: any;
    preview: string;
}

export interface ActiveTask {
    dump: DumpState[];
    load: LoadState | null;
}

export interface TasksState {
    initialized: boolean;
    count: number;
    current: Task[];
    active: {
        [index: number]: ActiveTask;
    };
    error: any;
    dumpError: any;
    loadError: any;
    loadDone: string;
    query: TasksQuery;
}

export interface FormatsState {
    loaders: any[];
    dumpers: any[];
    initialized: boolean;
    error: any;
}
