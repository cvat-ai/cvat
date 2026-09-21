// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/**
 * WebSocket hook for the class-counts analytics stream.
 *
 * Features:
 *   - Connects to ws[s]://host/ws/test/class-counts?<scope>&token=<TOKEN>
 *   - Exponential backoff reconnect (100ms → 30s) with ±10% jitter
 *   - Debounced incoming data (300ms) to avoid chart thrashing
 *   - Resync via REST after reconnect
 *   - Connection status tracking
 *   - Cleans up properly on unmount
 */

import {
    useCallback, useEffect, useRef, useState,
} from 'react';

export enum ConnectionStatus {
    CONNECTING = 'connecting',
    CONNECTED = 'connected',
    RECONNECTING = 'reconnecting',
    OFFLINE = 'offline',
}

export interface ClassCountItem {
    label_id: number;
    label_name: string;
    color: string;
    parent_id: number | null;
    image_count: number;
    annotation_count: number;
}

export interface ClassCountMessage {
    type: 'class_counts' | 'heartbeat' | 'error';
    version?: number;
    scope?: Record<string, number>;
    data?: ClassCountItem[];
    ts: string;
    message?: string;
    code?: number;
}

export type ScopeParam = { project_id: number } | { task_id: number } | { job_id: number };

interface UseClassCountsWSOptions {
    scope: ScopeParam | null;
    token: string | null;
    onData: (data: ClassCountItem[]) => void;
    onError?: (message: string) => void;
}

const MIN_BACKOFF_MS = 100;
const MAX_BACKOFF_MS = 30_000;
const DEBOUNCE_MS = 300;

function jitter(ms: number): number {
    return ms * (0.9 + Math.random() * 0.2);
}

function scopeToQuery(scope: ScopeParam): string {
    const entries = Object.entries(scope);
    return entries.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
}

function getWsUrl(scope: ScopeParam, token: string | null): string {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const query = scopeToQuery(scope);
    const tokenPart = token ? `&token=${encodeURIComponent(token)}` : '';
    return `${proto}//${host}/ws/test/class-counts?${query}${tokenPart}`;
}

export function useClassCountsWS({
    scope,
    token,
    onData,
    onError,
}: UseClassCountsWSOptions): ConnectionStatus {
    const [status, setStatus] = useState<ConnectionStatus>(ConnectionStatus.OFFLINE);
    const wsRef = useRef<WebSocket | null>(null);
    const retryCountRef = useRef(0);
    const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const mountedRef = useRef(true);
    const onDataRef = useRef(onData);
    const onErrorRef = useRef(onError);

    useEffect(() => { onDataRef.current = onData; }, [onData]);
    useEffect(() => { onErrorRef.current = onError; }, [onError]);

    const emitData = useCallback((data: ClassCountItem[]) => {
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = setTimeout(() => {
            if (mountedRef.current) onDataRef.current(data);
        }, DEBOUNCE_MS);
    }, []);

    const connect = useCallback(() => {
        if (!scope || !mountedRef.current) return;

        const url = getWsUrl(scope, token);
        setStatus((prev) => (prev === ConnectionStatus.CONNECTED
            ? ConnectionStatus.RECONNECTING
            : ConnectionStatus.CONNECTING));

        const ws = new WebSocket(url);
        wsRef.current = ws;

        ws.onopen = () => {
            if (!mountedRef.current) {
                ws.close();
                return;
            }
            retryCountRef.current = 0;
            setStatus(ConnectionStatus.CONNECTED);
        };

        ws.onmessage = (event: MessageEvent) => {
            if (!mountedRef.current) return;
            try {
                const msg: ClassCountMessage = JSON.parse(event.data as string);
                if (msg.type === 'class_counts' && msg.data) {
                    emitData(msg.data);
                } else if (msg.type === 'error') {
                    onErrorRef.current?.(msg.message ?? 'WebSocket error');
                }
                // heartbeat: no-op (connection health confirmed)
            } catch {
                // ignore unparseable messages
            }
        };

        ws.onerror = () => {
            // onerror is always followed by onclose; handle in onclose
        };

        ws.onclose = (event) => {
            if (!mountedRef.current) return;
            wsRef.current = null;

            // Normal closure — don't reconnect
            if (event.code === 1000 || event.code === 4001 || event.code === 4002) {
                setStatus(ConnectionStatus.OFFLINE);
                if (event.code === 4001 || event.code === 4002) {
                    onErrorRef.current?.(`Connection closed: ${event.reason || 'unauthorized'}`);
                }
                return;
            }

            // Schedule reconnect with exponential backoff
            const backoff = Math.min(
                MAX_BACKOFF_MS,
                MIN_BACKOFF_MS * 2 ** retryCountRef.current,
            );
            retryCountRef.current += 1;
            setStatus(ConnectionStatus.RECONNECTING);

            retryTimerRef.current = setTimeout(() => {
                if (mountedRef.current) connect();
            }, jitter(backoff));
        };
    }, [scope, token, emitData]);

    // Main effect: connect when scope/token changes
    useEffect(() => {
        mountedRef.current = true;

        if (scope) {
            connect();
        }

        return () => {
            mountedRef.current = false;

            if (retryTimerRef.current) {
                clearTimeout(retryTimerRef.current);
                retryTimerRef.current = null;
            }
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
                debounceTimerRef.current = null;
            }
            if (wsRef.current) {
                wsRef.current.close(1000, 'unmounted');
                wsRef.current = null;
            }
        };
    }, [scope, token]); // eslint-disable-line react-hooks/exhaustive-deps

    return status;
}
