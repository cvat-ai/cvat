export interface AuthState {
    initialized: boolean;
    authError: any;
    loginError: any;
    logoutError: any;
    registerError: any;
    user: any;
}

export interface TasksQuery {
    error: any;
    page: number;
    id: number | null;
    search: string | null;
    owner: string | null;
    assignee: string | null;
    name: string | null;
    status: string | null;
}

export interface TasksState {
    initialized: boolean;
    count: number;
    array: any[];
    query: TasksQuery;
}
