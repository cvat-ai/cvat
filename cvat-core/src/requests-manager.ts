// Copyright (C) 2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import serverProxy from './server-proxy';
import { RQStatus } from './enums';
import User from './user';
import { SerializedRequest } from './server-response-types';
import { RequestError } from './exceptions';
import { PaginatedResource } from './core-types';

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
    #resultID: number;
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
        this.#resultID = initialData.result_id;

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

    get progress(): number {
        return this.#progress;
    }

    get message(): string {
        return this.#message;
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

    get resultID(): number {
        return this.#resultID;
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
}

const REQUESTS_COUNT = 5;
const PROGRESS_EPS = 25;
const EPS_DELAYS = {
    [RQStatus.STARTED]: [3000, 7000, 13000],
    [RQStatus.QUEUED]: [7000, 13000, 19000, 29000,
        41000, 53000, 67000, 79000,
        101000, 113000, 139000, 163000],
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

    async list(): Promise<PaginatedResource<Request>> {
        const result = await serverProxy.requests.list();
        const requests = result.map((serializedRequest) => new Request({
            ...serializedRequest,
        })) as PaginatedResource<Request>;
        requests.count = requests.length;
        return requests;
    }

    async listen(
        requestID: string,
        options?: {
            callback?: (request: Request) => void,
            initialRequest?: Request,
        },
    ): Promise<Request> {
        if (!requestID) {
            throw new Error('Request id is not provided');
        }
        const callback = options?.callback;
        const initialRequest = options?.initialRequest;

        if (requestID in this.listening) {
            if (callback) {
                this.listening[requestID].onUpdate.push(callback);
            }
            return this.listening[requestID].promise;
        }
        const promise = new Promise<Request>((resolve, reject) => {
            const timeoutCallback = async (): Promise<void> => {
                // We make sure that no more than REQUESTS_COUNT requests are sent simultaneously
                // If thats the case, we re-schedule the timeout
                const timestamp = Date.now();
                if (this.requestStack.length >= REQUESTS_COUNT) {
                    const timestampToCheck = this.requestStack[this.requestStack.length - 1];
                    const delay = this.delayFor(requestID);
                    if (timestamp - timestampToCheck < delay) {
                        this.listening[requestID].timeout = window.setTimeout(timeoutCallback, delay);
                        return;
                    }
                }
                if (this.requestStack.length >= REQUESTS_COUNT) {
                    this.requestStack.pop();
                }
                this.requestStack.unshift(timestamp);

                try {
                    const serializedRequest = await serverProxy.requests.status(requestID);
                    if (requestID in this.listening) {
                        const request = new Request({ ...serializedRequest });
                        const { status } = request;

                        const { onUpdate } = this.listening[requestID];
                        if ([RQStatus.QUEUED, RQStatus.STARTED].includes(status)) {
                            onUpdate.forEach((update) => update(request));
                            this.listening[requestID].requestDelayIdx = this.updateRequestDelayIdx(
                                requestID,
                                request,
                            );
                            this.listening[requestID].request = request;
                            this.listening[requestID].timeout = window
                                .setTimeout(timeoutCallback, this.delayFor(requestID));
                        } else {
                            delete this.listening[requestID];
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
                } catch (error) {
                    if (requestID in this.listening) {
                        const { onUpdate } = this.listening[requestID];

                        onUpdate
                            .forEach((update) => update(new Request({
                                status: RQStatus.FAILED,
                                message: `Could not get a status of the request ${requestID}. ${error.toString()}`,
                            })));
                        reject(error);
                    }
                }
            };

            if (initialRequest?.status === RQStatus.FAILED) {
                reject(new RequestError(initialRequest?.message));
            } else {
                this.listening[requestID] = {
                    onUpdate: callback ? [callback] : [],
                    timeout: window.setTimeout(timeoutCallback),
                    request: initialRequest,
                    requestDelayIdx: 0,
                };
            }
        });

        this.listening[requestID] = {
            ...this.listening[requestID],
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
