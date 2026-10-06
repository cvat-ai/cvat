// SPDX-License-Identifier: MIT

import { useEffect, useRef, useState } from 'react';
import { getCore } from 'cvat-core-wrapper';

const core = getCore();

const FIRST_RETRY_DELAY_MS = 1000;
const MAX_RETRY_DELAY_MS = 30000;

export type LiveStatus = 'connecting' | 'live' | 'reconnecting';

// Keeps a WebSocket open while the page is shown and calls onChange
// every time the server says the task's annotations changed.
// If the connection drops, it tries again after 1 s, 2 s, 4 s, ... (at most 30 s).
export default function useAnnotationCountsUpdates(
    taskId: number,
    organizationSlug: string,
    onChange: () => void,
): LiveStatus {
    // Always call the latest onChange, without reconnecting when it changes
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;
    const [status, setStatus] = useState<LiveStatus>('connecting');

    useEffect(() => {
        const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
        const url = `${protocol}://${window.location.host}${core.config.backendAPI}` +
            `/test/tasks/${taskId}/annotation-counts/ws?org=${encodeURIComponent(organizationSlug)}`;
        let socket: WebSocket | null = null;
        let retryTimer: ReturnType<typeof setTimeout> | null = null;
        let failedAttempts = 0;
        let pageClosed = false;

        const connect = (): void => {
            socket = new WebSocket(url);
            socket.onopen = () => {
                if (failedAttempts > 0) {
                    // Changes made while the connection was down were missed, so reload once
                    onChangeRef.current();
                }
                failedAttempts = 0;
                setStatus('live');
            };
            socket.onmessage = () => onChangeRef.current();
            socket.onclose = () => {
                if (pageClosed) {
                    return;
                }
                setStatus('reconnecting');
                const delay = Math.min(FIRST_RETRY_DELAY_MS * 2 ** failedAttempts, MAX_RETRY_DELAY_MS);
                failedAttempts += 1;
                retryTimer = setTimeout(connect, delay);
            };
        };
        connect();

        return () => {
            pageClosed = true;
            if (retryTimer) {
                clearTimeout(retryTimer);
            }
            socket?.close();
        };
    }, [taskId, organizationSlug]);

    return status;
}
