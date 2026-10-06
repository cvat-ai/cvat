// SPDX-License-Identifier: MIT

import { useEffect, useRef } from 'react';
import { getCore } from 'cvat-core-wrapper';

const core = getCore();

// Keeps a WebSocket open while the page is shown and calls onChange
// every time the server says the task's annotations changed
export default function useAnnotationCountsUpdates(
    taskId: number,
    organizationSlug: string,
    onChange: () => void,
): void {
    // Always call the latest onChange, without reconnecting when it changes
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;

    useEffect(() => {
        const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
        const socket = new WebSocket(
            `${protocol}://${window.location.host}${core.config.backendAPI}` +
            `/test/tasks/${taskId}/annotation-counts/ws?org=${encodeURIComponent(organizationSlug)}`,
        );
        socket.onmessage = () => onChangeRef.current();

        return () => socket.close();
    }, [taskId, organizationSlug]);
}
