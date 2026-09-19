// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import {
    useCallback, useEffect, useRef, useState,
} from 'react';

export type ClassCounts = Record<string, number>;
export type ConnectionStatus = 'idle' | 'connecting' | 'live' | 'reconnecting' | 'error';

interface ClassCountsMessage {
    task_id: number;
    counts: ClassCounts;
}

interface State {
    status: ConnectionStatus;
    counts: ClassCounts | null;
    error: string | null;
}

interface Result extends State {
    connect: (taskId: number) => void;
}

const RECONNECT_BASE_DELAY_MS = 1000;
const RECONNECT_MAX_DELAY_MS = 30000;
// How many attempts to allow before ever receiving a first message. The browser
// WebSocket API does not expose the handshake's HTTP status, so a bad task ID or
// a permission error looks identical to a transient network failure -- this cap
// is what keeps a real "access denied" from retrying forever.
const MAX_ATTEMPTS_BEFORE_FIRST_MESSAGE = 3;

function buildWebSocketUrl(taskId: number): string {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/ws/test/class-counts/${taskId}/`;
}

export default function useClassCountsSocket(): Result {
    const [state, setState] = useState<State>({ status: 'idle', counts: null, error: null });

    const socketRef = useRef<WebSocket | null>(null);
    const reconnectTimerRef = useRef<number | null>(null);
    const attemptRef = useRef(0);
    const everReceivedMessageRef = useRef(false);
    // Bumped on every connect()/unmount so that callbacks from a superseded
    // socket or a stale reconnect timer can recognize themselves as obsolete
    // and no-op, instead of racing with whatever connection replaced them.
    const epochRef = useRef(0);

    const teardown = useCallback(() => {
        epochRef.current += 1;

        if (reconnectTimerRef.current !== null) {
            window.clearTimeout(reconnectTimerRef.current);
            reconnectTimerRef.current = null;
        }

        if (socketRef.current) {
            const socket = socketRef.current;
            socket.onopen = null;
            socket.onmessage = null;
            socket.onclose = null;
            socket.onerror = null;
            socket.close();
            socketRef.current = null;
        }
    }, []);

    const openSocket = useCallback((taskId: number, epoch: number) => {
        const socket = new WebSocket(buildWebSocketUrl(taskId));
        socketRef.current = socket;

        socket.onmessage = (event: MessageEvent<string>) => {
            if (epochRef.current !== epoch) return;

            attemptRef.current = 0;
            everReceivedMessageRef.current = true;

            let payload: ClassCountsMessage | { type: string };
            try {
                payload = JSON.parse(event.data);
            } catch {
                // ignore malformed frames rather than tearing down a working connection
                return;
            }

            if ('type' in payload && payload.type === 'ping') {
                // Server heartbeat: proves the connection is still alive, but
                // carries no data of its own.
                setState((prev) => ({ ...prev, status: 'live', error: null }));
                return;
            }

            setState({ status: 'live', counts: (payload as ClassCountsMessage).counts, error: null });
        };

        socket.onclose = () => {
            if (epochRef.current !== epoch) return;

            const neverConnected = !everReceivedMessageRef.current;
            const outOfAttempts = attemptRef.current >= MAX_ATTEMPTS_BEFORE_FIRST_MESSAGE - 1;
            if (neverConnected && outOfAttempts) {
                setState((prev) => ({
                    status: 'error',
                    counts: prev.counts,
                    error: 'Could not connect. Check the task ID and that you have access to it.',
                }));
                return;
            }

            const delay = Math.min(
                RECONNECT_BASE_DELAY_MS * 2 ** attemptRef.current,
                RECONNECT_MAX_DELAY_MS,
            );
            attemptRef.current += 1;

            setState((prev) => ({ ...prev, status: 'reconnecting' }));
            reconnectTimerRef.current = window.setTimeout(() => {
                if (epochRef.current === epoch) {
                    openSocket(taskId, epoch);
                }
            }, delay);
        };
    }, []);

    const connect = useCallback((taskId: number) => {
        teardown();
        const epoch = epochRef.current;

        attemptRef.current = 0;
        everReceivedMessageRef.current = false;

        setState({ status: 'connecting', counts: null, error: null });
        openSocket(taskId, epoch);
    }, [teardown, openSocket]);

    useEffect(() => teardown, [teardown]);

    return { ...state, connect };
}
