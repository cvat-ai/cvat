// Copyright (C) 2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import serverProxy from './server-proxy';
import { RQStatus } from './enums';
import User from './user';
import { RequestsFilter, SerializedRequest } from './server-response-types';
import { fieldsToSnakeCase } from './common';
import { RequestError } from './exceptions';

type Operation = {
    target: string;
    type: string;
    format: string;
    jobID: number | null;
    taskID: number | null;
    projectID: number | null;
};

export class Request {
    #id: string;
    #status: RQStatus;
    #operation: Partial<SerializedRequest['operation']>;
    #message: string;
    #progress: number;
    #resultUrl: string;
    #enqueuedDate: string;
    #startedDate: string;
    #finishedDate: string;
    #expiryDate: string;
    #owner: User;

    constructor(initialData: SerializedRequest) {
        this.#id = initialData.id;
        this.#status = initialData.status as RQStatus;
        this.#operation = initialData.operation;
        this.#progress = initialData.progress;
        this.#message = initialData.message;
        this.#resultUrl = initialData.result_url;

        this.#enqueuedDate = initialData.enqueued_date;
        this.#startedDate = initialData.started_date;
        this.#finishedDate = initialData.finished_date;
        this.#expiryDate = initialData.expiry_date;

        if (initialData.owner) {
            this.#owner = new User(initialData.owner);
        }
    }

    get id(): string {
        return this.#id;
    }

    get status(): RQStatus {
        return this.#status.toLowerCase() as RQStatus;
    }
    set status(status) {
        this.#status = status;
    }

    get progress(): number {
        return this.#progress;
    }

    get message(): string {
        return this.#message;
    }
    set message(message) {
        this.#message = message;
    }

    get operation(): Operation {
        return {
            target: this.#operation.target,
            type: this.#operation.type,
            format: this.#operation.format,
            jobID: this.#operation.job_id,
            taskID: this.#operation.task_id,
            projectID: this.#operation.project_id,
        };
    }

    get url(): string {
        return this.#resultUrl;
    }

    get enqueuedDate(): string {
        return this.#enqueuedDate;
    }

    get startedDate(): string {
        return this.#startedDate;
    }

    get finishedDate(): string {
        return this.#finishedDate;
    }

    get expiryDate(): string {
        return this.#expiryDate;
    }

    get owner(): User {
        return this.#owner;
    }

    updateFields(request: Partial<SerializedRequest>): void {
        if (request.id !== undefined) {
            this.#id = request.id;
        }
        if (request.status !== undefined) {
            this.#status = request.status as RQStatus;
        }
        if (request.operation !== undefined) {
            this.#operation = request.operation;
        }
        if (request.progress !== undefined) {
            this.#progress = request.progress;
        }
        if (request.message !== undefined) {
            this.#message = request.message;
        }
        if (request.result_url !== undefined) {
            this.#resultUrl = request.result_url;
        }
        if (request.enqueued_date !== undefined) {
            this.#enqueuedDate = request.enqueued_date;
        }
        if (request.started_date !== undefined) {
            this.#startedDate = request.started_date;
        }
        if (request.finished_date !== undefined) {
            this.#finishedDate = request.finished_date;
        }
        if (request.expiry_date !== undefined) {
            this.#expiryDate = request.expiry_date;
        }
        if (request.owner !== undefined) {
            this.#owner = new User(request.owner);
        }
    }
}

const REQUESTS_COUNT = 5;
const PROGRESS_EPS = 25;
const EPS_DELAYS = {
    [RQStatus.STARTED]: [3000, 7000, 13000],
    [RQStatus.QUEUED]: [7000, 13000, 19000],
    [RQStatus.DEFERRED]: [120000, 180000, 240000],
};

class RequestsManager {
    private listening: Record<string, {
        onUpdate: ((request: Request) => void)[];
        requestDelayIdx: number | null,
        request: Request | null,
        timeout: number | null;
        promise?: Promise<Request>;
    }>;

    private requestStack: number[];
    constructor() {
        this.listening = {};
        this.requestStack = [];
    }

    async list(): Promise<{ requests: Request[], count: number }> {
        const result = await serverProxy.requests.list();
        const requests = [];
        for (const request of result) {
            requests.push(
                new Request({
                    ...request,
                }),
            );
        }
        return { requests, count: requests.length };
    }

    async listen(
        id: string | null,
        options?: {
            callback?: (request: Request) => void,
            filter?: RequestsFilter,
            initialRequest?: Request,
        },
    ): Promise<Request> {
        let storedID = null;
        const params = options?.filter ? fieldsToSnakeCase(options.filter) : {};
        if (id) {
            storedID = id;
        } else if (options?.filter) {
            storedID = new URLSearchParams(params).toString();
        }

        if (!storedID) {
            throw new Error('Neither request id nor filter is provided');
        }
        const callback = options?.callback;
        const initialRequest = options?.initialRequest;

        if (storedID in this.listening) {
            if (callback) {
                this.listening[storedID].onUpdate.push(callback);
            }
            return this.listening[storedID].promise;
        }
        const promise = new Promise<Request>((resolve, reject) => {
            const timeoutCallback = (): void => {
                if (!(storedID in this.listening)) {
                    return;
                }

                // We make sure that no more than REQUESTS_COUNT requests are sent simultaneously
                // If thats the case, we re-schedule the timeout
                const timestamp = Date.now();
                if (this.requestStack.length >= REQUESTS_COUNT) {
                    const timestampToCheck = this.requestStack[this.requestStack.length - 1];
                    const delay = this.delayFor(storedID);
                    if (timestamp - timestampToCheck < delay) {
                        this.listening[storedID].timeout = window.setTimeout(timeoutCallback, delay);
                        return;
                    }
                }
                if (this.requestStack.length >= REQUESTS_COUNT) {
                    this.requestStack.pop();
                }
                this.requestStack.unshift(timestamp);

                serverProxy.requests.status(id, params).then((serializedRequest) => {
                    const request = new Request({ ...serializedRequest });
                    const { status } = request;
                    // check it was not cancelled
                    if (storedID in this.listening) {
                        const { onUpdate } = this.listening[storedID];
                        if ([RQStatus.QUEUED, RQStatus.STARTED, RQStatus.DEFERRED].includes(status)) {
                            onUpdate.forEach((update) => update(request));
                            this.listening[storedID].requestDelayIdx = this.updateRequestDelayIdx(
                                storedID,
                                request,
                            );
                            this.listening[storedID].request = request;
                            this.listening[storedID].timeout = window
                                .setTimeout(timeoutCallback, this.delayFor(storedID));
                        } else {
                            delete this.listening[storedID];
                            if (status === RQStatus.FINISHED) {
                                onUpdate
                                    .forEach((update) => update(request));
                                resolve(request);
                            } else {
                                onUpdate
                                    .forEach((update) => (
                                        update(request)
                                    ));
                                reject(new RequestError(request.message));
                            }
                        }
                    }
                }).catch((error) => {
                    if (storedID in this.listening) {
                        const { onUpdate } = this.listening[storedID];

                        onUpdate
                            .forEach((update) => update(new Request({
                                status: RQStatus.FAILED,
                                message: `Could not get a status of the request ${storedID}. ${error.toString()}`,
                            })));
                        reject(error);
                    }
                }).finally(() => {
                    if (storedID in this.listening) {
                        this.listening[storedID].timeout = null;
                    }
                });
            };

            this.listening[storedID] = {
                onUpdate: callback ? [callback] : [],
                timeout: window.setTimeout(timeoutCallback),
                request: initialRequest,
                requestDelayIdx: 0,
            };
        });

        this.listening[storedID] = {
            ...this.listening[storedID],
            promise,
        };
        return promise;
    }

    async cancel(rqID: string): Promise<void> {
        await serverProxy.requests.cancel(rqID).then(() => {
            if (rqID in this.listening) {
                clearTimeout(this.listening[rqID].timeout);
                delete this.listening[rqID];
            }
        });
    }

    private delayFor(rqID: string): number {
        const state = this.listening[rqID];
        const { request, requestDelayIdx } = state;

        // request is not checked yet, call it immideately
        if (!request) {
            return 0;
        }

        const addRndComponent = (val: number): number => (
            val + Math.floor(Math.random() * Math.floor(val / 2))
        );

        switch (request.status) {
            case RQStatus.STARTED: {
                return addRndComponent(EPS_DELAYS[RQStatus.STARTED][requestDelayIdx]);
            }
            case RQStatus.QUEUED: {
                return addRndComponent(EPS_DELAYS[RQStatus.QUEUED][requestDelayIdx]);
            }
            case RQStatus.DEFERRED: {
                return addRndComponent(EPS_DELAYS[RQStatus.DEFERRED][requestDelayIdx]);
            }
            default:
                return 0;
        }
    }

    private updateRequestDelayIdx(rqID: string, updatedRequest: Request): number {
        const state = this.listening[rqID];
        const { requestDelayIdx, request } = state;

        let progress = 0;
        if (request) {
            progress = request?.progress;
        }

        switch (updatedRequest.status) {
            case RQStatus.QUEUED: {
                return Math.min(requestDelayIdx + 1, EPS_DELAYS[RQStatus.QUEUED].length - 1);
            }
            case RQStatus.STARTED: {
                if (Math.round(Math.abs(updatedRequest.progress - progress) * 100) < PROGRESS_EPS) {
                    return Math.min(requestDelayIdx + 1, EPS_DELAYS[RQStatus.STARTED].length - 1);
                }
                return requestDelayIdx;
            }
            default:
                return requestDelayIdx;
        }
    }
}

export default new RequestsManager();
