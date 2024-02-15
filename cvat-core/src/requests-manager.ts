// Copyright (C) 2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import serverProxy from './server-proxy';
import { RQStatus } from './enums';

export interface SerializedRequest {
    rq_id: string;
    state: string;
    type: string;
    progress: number;
    message: string;
    url: string;
    entity: {
        id: number;
        type: string;
        name: string;
    };
}

type EntityType = {
    id: number;
    type: string;
    name: string;
};

export class Request {
    #rqID: string;
    #state: RQStatus;
    #type: string;
    #entity: EntityType;
    #message: string;
    #progress: number;
    #url: string;

    constructor(initialData: SerializedRequest) {
        this.#rqID = initialData.rq_id;
        this.#state = initialData.state as RQStatus;
        this.#type = initialData.type;
        this.#entity = initialData.entity;
        this.#progress = initialData.progress;
        this.#message = initialData.message;
        this.#url = initialData.url;
    }

    get rqID(): string {
        return this.#rqID;
    }

    get status(): RQStatus {
        return this.#state.toLowerCase() as RQStatus;
    }
    set status(status) {
        this.#state = status;
    }

    get progress(): number {
        return this.#progress;
    }
    set progress(progress) {
        this.#progress = progress;
    }

    get message(): string {
        return this.#message;
    }
    set message(message) {
        this.#message = message;
    }

    get type(): string {
        return this.#type;
    }

    get entity(): EntityType {
        return this.#entity;
    }

    get url(): string {
        return this.#url;
    }

    updateStatus(status, progress, message): void {
        this.#state = status;
        this.#progress = progress;
        this.#message = message;
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
        const r = await serverProxy.requests.list();

        const requests = [];
        for (const request of r) {
            requests.push(
                new Request({
                    ...request,
                }),
            );
        }

        return {
            requests,
            count: requests.length,
        };
    }

    async listen(
        rqID: string,
        callback: (status: RQStatus, progress: number, message?: string) => void,
    ): Promise<void> {
        if (rqID in this.listening) {
            // this.listening[rqID].onUpdate.push(callback);
            return this.listening[rqID].promise;
        }
        const promise = new Promise<void>((resolve, reject) => {
            const timeoutCallback = (): void => {
                serverProxy.requests.status(rqID).then((response) => {
                    let { state: status } = response;
                    status = status.toLowerCase();
                    if (rqID in this.listening) {
                        // check it was not cancelled
                        const { onUpdate } = this.listening[rqID];
                        if ([RQStatus.QUEUED, RQStatus.STARTED].includes(status)) {
                            onUpdate.forEach((update) => update(status, response.percent || 0, response.message));
                            this.listening[rqID].timeout = window
                                .setTimeout(timeoutCallback, status === RQStatus.QUEUED ? 5000 : 1000);
                        } else {
                            delete this.listening[rqID];
                            if (status === RQStatus.FINISHED) {
                                onUpdate
                                    .forEach((update) => update(status, response.percent || 100, response.message));
                                resolve();
                            } else {
                                onUpdate
                                    .forEach((update) => update(status, response.percent || 0, response.exc_info || response.message));
                                reject();
                            }
                        }
                    }
                }).catch((error) => {
                    if (rqID in this.listening) {
                        // check it was not cancelled
                        const { onUpdate } = this.listening[rqID];
                        onUpdate
                            .forEach((update) => update(
                                RQStatus.UNKNOWN,
                                0,
                                `Could not get a status of the request ${rqID}. ${error.toString()}`,
                            ));
                        reject();
                    }
                }).finally(() => {
                    if (rqID in this.listening) {
                        this.listening[rqID].timeout = null;
                    }
                });
            };

            this.listening[rqID] = {
                onUpdate: [callback],
                timeout: window.setTimeout(timeoutCallback),
            };
        });

        this.listening[rqID] = {
            ...this.listening[rqID],
            promise,
        };
        return promise;
    }
}

export default new RequestsManager();
