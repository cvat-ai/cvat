// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import {
    recordCSPViolation,
    startCSPViolationObserver,
} from './csp-violation-observer';
import type { CSPViolationRecord } from './csp-violation-observer';

// NOTE: excluded from Webpack's HMR. Restart dev server after applying changes.

const WORKER_CSP_VIOLATION_MESSAGE_TYPE = '__cvat_csp_violation__';
const CSP_OBSERVED_WORKER = Symbol.for('cvat.csp.observed-worker');

interface WorkerCSPViolationMessage {
    type: typeof WORKER_CSP_VIOLATION_MESSAGE_TYPE;
    violation: Omit<CSPViolationRecord, 'count' | 'context'>;
}

function isWorkerCSPViolationMessage(message: unknown): message is WorkerCSPViolationMessage {
    return typeof message === 'object' && message !== null &&
        (message as { type?: unknown }).type === WORKER_CSP_VIOLATION_MESSAGE_TYPE &&
        typeof (message as { violation?: unknown }).violation === 'object';
}

function observeWorkerCSPViolations(): void {
    const WorkerConstructor = window.Worker as unknown as Record<symbol, unknown>;
    // Don't wrap twice
    // Class references may be different between reloads so use a symbol
    if (WorkerConstructor[CSP_OBSERVED_WORKER]) {
        return;
    }

    const NativeWorker = window.Worker;

    const CSPObservedWorker = class extends NativeWorker {
        public constructor(scriptURL: string | URL, options?: WorkerOptions) {
            super(scriptURL, options);
            const workerURL = new URL(scriptURL, window.location.href).pathname;

            this.addEventListener('message', (event: MessageEvent<unknown>) => {
                if (!isWorkerCSPViolationMessage(event.data)) {
                    return;
                }

                event.stopImmediatePropagation();
                recordCSPViolation({
                    ...event.data.violation,
                    context: workerURL,
                });
            });
        }
    };

    (CSPObservedWorker as unknown as Record<symbol, unknown>)[CSP_OBSERVED_WORKER] = true;
    window.Worker = CSPObservedWorker;
}

startCSPViolationObserver();
observeWorkerCSPViolations();
