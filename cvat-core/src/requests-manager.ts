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

const PROGRESS_EPS = 25;
const requestDelays = [6000, 12000, 18000, 24000, 30000];

class RequestsManager {
    private listening: Record<string, {
        onUpdate: ((request: Request) => void)[];
        requestDelaysIdx: number | null,
        progress: number,
        timeout: number | null;
        promise?: Promise<Request>;
    }>;

    constructor() {
        this.listening = {};
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

        if (storedID in this.listening) {
            if (callback) {
                this.listening[storedID].onUpdate.push(callback);
            }
            return this.listening[storedID].promise;
        }
        const promise = new Promise<Request>((resolve, reject) => {
            const timeoutCallback = (): void => {
                serverProxy.requests.status(id, params).then((serializedRequest) => {
                    const request = new Request({ ...serializedRequest });
                    const { status } = request;
                    if (storedID in this.listening) {
                        // check it was not cancelled
                        const { onUpdate } = this.listening[storedID];
                        if ([RQStatus.QUEUED, RQStatus.STARTED].includes(status)) {
                            onUpdate.forEach((update) => update(request));
                            this.listening[storedID].timeout = window
                                .setTimeout(timeoutCallback, this.delayFor(storedID, request));
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
                        // check it was not cancelled
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
                requestDelaysIdx: null,
                progress: 0,
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

    async delete(rqID: string): Promise<void> {
        await serverProxy.requests.delete(rqID).then(() => {
            if (rqID in this.listening) {
                clearTimeout(this.listening[rqID].timeout);
                delete this.listening[rqID];
            }
        });
    }

    private delayFor(rqID: string, updatedRequest: Request): number {
        const state = this.listening[rqID];
        const prevDelayIdx = state.requestDelaysIdx;
        if (prevDelayIdx === null) {
            state.requestDelaysIdx = 0;
        } else if (updatedRequest.status === RQStatus.QUEUED) {
            state.requestDelaysIdx = Math.min(prevDelayIdx + 1, requestDelays.length - 1);
        } else if (updatedRequest.status === RQStatus.STARTED) {
            if (Math.round(Math.abs(updatedRequest.progress - state.progress) * 100) < PROGRESS_EPS) {
                state.requestDelaysIdx = Math.min(prevDelayIdx + 1, requestDelays.length - 1);
            }
            state.progress = updatedRequest.progress;
        }

        return requestDelays[state.requestDelaysIdx];
    }
}

export default new RequestsManager();
