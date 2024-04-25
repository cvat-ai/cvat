// Copyright (C) 2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import serverProxy from './server-proxy';
import { RQStatus } from './enums';
import User from './user';
import { StorageData } from './storage';
import { RequestsFilter } from './server-response-types';
import { fieldsToSnakeCase } from './common';

export interface SerializedRequest {
    id?: string;
    status: string;
    operation?: {
        target: string;
        name: string;
        type: string;
        format: string;
        job_id: number | null;
        task_id: number | null;
        project_id: number | null;
    };
    percent?: number;
    message: string;
    result_url?: string;
    enqueue_date?: string;
    start_date?: string;
    finish_date?: string;
    expire_date?: string;
    owner?: any;
}

type Operation = {
    target: string;
    name: string;
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
    #enqueueDate: string;
    #startDate: string;
    #finishDate: string;
    #expireDate: string;
    #owner: User;
    #meta: { storage: StorageData };

    constructor(initialData: SerializedRequest) {
        this.#id = initialData.id;
        this.#status = initialData.status as RQStatus;
        this.#operation = initialData.operation;
        this.#progress = initialData.percent;
        this.#message = initialData.message;
        this.#resultUrl = initialData.result_url;

        this.#enqueueDate = initialData.enqueue_date;
        this.#startDate = initialData.start_date;
        this.#finishDate = initialData.finish_date;
        this.#expireDate = initialData.expire_date;

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
            name: this.#operation.name,
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

    get enqueueDate(): string {
        return this.#enqueueDate;
    }

    get startDate(): string {
        return this.#startDate;
    }

    get finishDate(): string {
        return this.#finishDate;
    }

    get expireDate(): string {
        return this.#expireDate;
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
        if (request.percent !== undefined) {
            this.#progress = request.percent;
        }
        if (request.message !== undefined) {
            this.#message = request.message;
        }
        if (request.result_url !== undefined) {
            this.#resultUrl = request.result_url;
        }
        if (request.enqueue_date !== undefined) {
            this.#enqueueDate = request.enqueue_date;
        }
        if (request.start_date !== undefined) {
            this.#startDate = request.start_date;
        }
        if (request.finish_date !== undefined) {
            this.#finishDate = request.finish_date;
        }
        if (request.expire_date !== undefined) {
            this.#expireDate = request.expire_date;
        }
        if (request.owner !== undefined) {
            this.#owner = new User(request.owner);
        }
    }
}

class RequestsManager {
    private listening: Record<string, {
        onUpdate: ((request: Request) => void)[];
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
                serverProxy.requests.status(id, params).then((response) => {
                    const request = new Request({ ...response });
                    let { status } = response;
                    status = status.toLowerCase();
                    if (storedID in this.listening) {
                        // check it was not cancelled
                        const { onUpdate } = this.listening[storedID];
                        if ([RQStatus.QUEUED, RQStatus.STARTED].includes(status)) {
                            onUpdate.forEach((update) => update(request));
                            this.listening[storedID].timeout = window
                                .setTimeout(timeoutCallback, status === RQStatus.QUEUED ? 3000 : 3000);
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
                                reject(request);
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
                onUpdate: [callback],
                timeout: window.setTimeout(timeoutCallback),
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
}

export default new RequestsManager();
