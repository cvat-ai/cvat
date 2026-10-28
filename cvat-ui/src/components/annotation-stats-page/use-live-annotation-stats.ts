// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { useCallback, useEffect, useState } from 'react';

import { getCore } from 'cvat-core-wrapper';

const core = getCore();

// An import or a bulk save sends one event per job; wait for the burst to settle before re-fetching
const REFETCH_DEBOUNCE_MS = 300;
const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 15000;

export interface LabelCount {
    id: number;
    name: string;
    color: string;
    count: number;
    by_type: Record<string, number>;
}

export interface AnnotationStats {
    task_id: number;
    total: number;
    labels: LabelCount[];
    ws_ticket: string;
}

export type FetchState =
    { status: 'loading' } |
    { status: 'error'; message: string } |
    { status: 'ready'; stats: AnnotationStats };

export type Connection = 'connecting' | 'live' | 'reconnecting';

async function fetchStats(taskId: string): Promise<AnnotationStats> {
    const response = await core.server.request<{ data: AnnotationStats }>(
        `${core.config.backendAPI}/annotation-stats/${taskId}`, { method: 'GET' },
    );
    return response.data;
}

function socketUrl(taskId: string, ticket: string): string {
    const url = new URL(`${core.config.backendAPI}/annotation-stats/${taskId}/ws`, window.location.href);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    url.searchParams.set('ticket', ticket);
    return url.toString();
}

/**
 * Loads the per-label counts and keeps them current.
 *
 * The socket only says "changed"; the counts always come from the REST endpoint, which re-checks access.
 * When the socket drops, the hook retries with exponential backoff. Each attempt re-fetches first: that
 * picks up changes missed while offline and gets a fresh ticket, which is only valid for a minute.
 */
export default function useLiveAnnotationStats(taskId: string): {
    state: FetchState;
    connection: Connection;
    reload: () => void;
} {
    const [state, setState] = useState<FetchState>({ status: 'loading' });
    const [connection, setConnection] = useState<Connection>('connecting');
    const [generation, setGeneration] = useState(0);
    const reload = useCallback(() => setGeneration((value) => value + 1), []);

    useEffect(() => {
        let disposed = false;
        let socket: WebSocket | null = null;
        let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
        let refetchTimer: ReturnType<typeof setTimeout> | undefined;
        let attempt = 0;

        const refresh = async (): Promise<void> => {
            try {
                const stats = await fetchStats(taskId);
                if (!disposed) setState({ status: 'ready', stats });
            } catch {
                // the chart keeps the last counts; an outage also closes the socket, which retries
            }
        };

        const scheduleReconnect = (): void => {
            setConnection('reconnecting');
            const delay = Math.min(RECONNECT_MAX_MS, RECONNECT_BASE_MS * 2 ** attempt);
            attempt += 1;
            // connect() and scheduleReconnect() call each other
            // eslint-disable-next-line no-use-before-define
            reconnectTimer = setTimeout(() => connect(false), delay);
        };

        const openSocket = (ticket: string): void => {
            socket = new WebSocket(socketUrl(taskId, ticket));
            socket.onopen = () => {
                attempt = 0;
                setConnection('live');
            };
            socket.onmessage = () => {
                clearTimeout(refetchTimer);
                refetchTimer = setTimeout(refresh, REFETCH_DEBOUNCE_MS);
            };
            socket.onclose = () => {
                socket = null;
                if (!disposed) scheduleReconnect();
            };
        };

        const connect = async (initial: boolean): Promise<void> => {
            try {
                const stats = await fetchStats(taskId);
                if (disposed) return;
                setState({ status: 'ready', stats });
                openSocket(stats.ws_ticket);
            } catch (error: unknown) {
                if (disposed) return;
                if (initial) {
                    setState({ status: 'error', message: error instanceof Error ? error.message : String(error) });
                } else {
                    scheduleReconnect();
                }
            }
        };

        setState({ status: 'loading' });
        setConnection('connecting');
        connect(true);

        return () => {
            disposed = true;
            clearTimeout(reconnectTimer);
            clearTimeout(refetchTimer);
            socket?.close();
        };
    }, [taskId, generation]);

    return { state, connection, reload };
}
