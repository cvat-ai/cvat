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

export interface TasksState {
    initialized: boolean;
    count: number;
    array: any[];
    previews: string[];
    error: any;
    query: TasksQuery;
}
