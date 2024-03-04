// Copyright (C) 2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import serverProxy from './server-proxy';
import { RQStatus } from './enums';
import User from './user';
import { StorageData } from './storage';

export interface SerializedRequest {
    id: string;
    status: string;
    operation: {
        target: string;
        name: string;
        type: string;
        format: string;
        job_id: number | null;
        task_id: number | null;
        project_id: number | null;
    };
    percent: number;
    message: string;
    result_url: string;
    enqueue_date: string;
    start_date: string;
    finish_date: string;
    expire_date: string;
    owner?: any;
    meta?: {
        storage: {
            location: string;
        }
    }
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

        if (initialData.meta) {
            this.#meta = initialData.meta as { storage: StorageData };
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

    get meta(): { storage: StorageData } {
        return this.#meta;
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
    private listening: Record<number, {
        onUpdate: ((status: RQStatus, progress: number, message?: string) => void)[];
        functionID: string;
        timeout: number | null;
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
        id: string,
        callback?: (request: Request) => void,
    ): Promise<Request> {
        if (id in this.listening) {
            return this.listening[id].promise;
        }
        const promise = new Promise<Request>((resolve, reject) => {
            const timeoutCallback = (): void => {
                serverProxy.requests.status(id).then((response) => {
                    const request = new Request({ ...response });
                    let { status } = response;
                    status = status.toLowerCase();
                    if (id in this.listening) {
                        // check it was not cancelled
                        const { onUpdate } = this.listening[id];
                        if ([RQStatus.QUEUED, RQStatus.STARTED].includes(status)) {
                            onUpdate.forEach((update) => update(request));
                            this.listening[id].timeout = window
                                .setTimeout(timeoutCallback, status === RQStatus.QUEUED ? 8000 : 5000);
                        } else {
                            delete this.listening[id];
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
                    if (id in this.listening) {
                        // check it was not cancelled
                        const { onUpdate } = this.listening[id];
                        onUpdate
                            .forEach((update) => update(
                                RQStatus.UNKNOWN,
                                0,
                                `Could not get a status of the request ${id}. ${error.toString()}`,
                            ));
                        reject(error);
                    }
                }).finally(() => {
                    if (id in this.listening) {
                        this.listening[id].timeout = null;
                    }
                });
            };

            this.listening[id] = {
                onUpdate: [callback],
                timeout: window.setTimeout(timeoutCallback),
            };
        });

        this.listening[id] = {
            ...this.listening[id],
            promise,
        };
        return promise;
    }
}

export default new RequestsManager();
