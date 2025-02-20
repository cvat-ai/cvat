// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { RQStatus } from './enums';
import User from './user';
import { SerializedRequest } from './server-response-types';

export type RequestOperation = {
    target: string;
    type: string;
    format: string | null;
    jobID: number | null;
    taskID: number | null;
    projectID: number | null;
    functionID: string | null;
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

        this.#owner = new User(initialData.owner);
    }

    get id(): string {
        return this.#id;
    }

    get status(): RQStatus {
        return this.#status.toLowerCase() as RQStatus;
    }

    // The `progress` represents a value between 0 and 1
    get progress(): number | undefined {
        return this.#progress;
    }

    get message(): string {
        return this.#message;
    }

    get operation(): RequestOperation {
        return {
            target: this.#operation.target,
            type: this.#operation.type,
            format: this.#operation.format,
            jobID: this.#operation.job_id,
            taskID: this.#operation.task_id,
            projectID: this.#operation.project_id,
            functionID: this.#operation.function_id,
        };
    }

    get url(): string | undefined {
        return this.#resultUrl;
    }

    get resultID(): number | undefined {
        return this.#resultID;
    }

    get createdDate(): string {
        return this.#createdDate;
    }

    get startedDate(): string | undefined {
        return this.#startedDate;
    }

    get finishedDate(): string | undefined {
        return this.#finishedDate;
    }

    get expiryDate(): string | undefined {
        return this.#expiryDate;
    }

    get owner(): User {
        return this.#owner;
    }

    public toJSON(): SerializedRequest {
        const result: SerializedRequest = {
            id: this.#id,
            status: this.#status,
            operation: {
                target: this.#operation.target,
                type: this.#operation.type,
                format: this.#operation.format,
                job_id: this.#operation.job_id,
                task_id: this.#operation.task_id,
                project_id: this.#operation.project_id,
                function_id: this.#operation.function_id,
            },
            progress: this.#progress,
            message: this.#message,
            result_url: this.#resultUrl,
            result_id: this.#resultID,
            created_date: this.#createdDate,
            started_date: this.#startedDate,
            finished_date: this.#finishedDate,
            expiry_date: this.#expiryDate,
            owner: {
                id: this.#owner.id,
                username: this.#owner.username,
            },
        };

        return result;
    }
}
