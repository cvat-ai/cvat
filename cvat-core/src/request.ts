// Copyright (C) 2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { RQStatus } from './enums';
import User from './user';
import { SerializedRequest } from './server-response-types';

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
    #createdDate: string;
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

        this.#createdDate = initialData.created_date;
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

    get createdDate(): string {
        return this.#createdDate;
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
