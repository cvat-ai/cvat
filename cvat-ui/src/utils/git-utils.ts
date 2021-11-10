// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import getCore from 'cvat-core-wrapper';

const core = getCore();
const baseURL = core.config.backendAPI.slice(0, -7);

interface GitPlugin {
    name: string;
    description: string;
    cvat: {
        classes: {
            Task: {
                prototype: {
                    save: {
                        leave: (plugin: GitPlugin, task: any) => Promise<any>;
                    };
                };
            };
        };
    };
    data: {
        format: any;
        task: any;
        lfs: boolean;
        repos: string;
    };
    callbacks: {
        onStatusChange: ((status: string) => void) | null;
    };
}

interface ReposData {
    url: string;
    status: {
        value: 'sync' | '!sync' | 'merged';
        error: string | null;
    };
    format: string
}

function waitForClone(cloneResponse: any): Promise<void> {
    return new Promise((resolve, reject): void => {
        async function checkCallback(): Promise<void> {
            core.server
                .request(`${baseURL}/git/repository/check/${cloneResponse.rq_id}`, {
                    method: 'GET',
                })
                .then((response: any): void => {
                    if (['queued', 'started'].includes(response.status)) {
                        setTimeout(checkCallback, 1000);
                    } else if (response.status === 'finished') {
                        resolve();
                    } else if (response.status === 'failed') {
                        let message = 'Repository status check failed. ';
                        if (response.stderr) {
                            message += response.stderr;
                        }

                        reject(message);
                    } else {
                        const message = `Repository status check returned the status "${response.status}"`;
                        reject(message);
                    }
                })
                .catch((error: any): void => {
                    const message = `Can not sent a request to clone the repository. ${error.toString()}`;
                    reject(message);
                });
        }

        setTimeout(checkCallback, 1000);
    });
}

async function cloneRepository(this: any, plugin: GitPlugin, createdTask: any): Promise<any> {
    return new Promise((resolve, reject): any => {
        if (typeof this.id !== 'undefined' || plugin.data.task !== this) {
            // not the first save, we do not need to clone the repository
            // or anchor set for another task
            resolve(createdTask);
        } else if (plugin.data.repos) {
            if (plugin.callbacks.onStatusChange) {
                plugin.callbacks.onStatusChange('The repository is being cloned..');
            }

            core.server
                .request(`${baseURL}/git/repository/create/${createdTask.id}`, {
                    method: 'POST',
                    headers: {
                        'Content-type': 'application/json',
                    },
                    data: JSON.stringify({
                        path: plugin.data.repos,
                        lfs: plugin.data.lfs,
                        format: plugin.data.format,
                        tid: createdTask.id,
                    }),
                })
                .then(waitForClone)
                .then((): void => {
                    resolve(createdTask);
                })
                .catch((error: any): void => {
                    createdTask.delete().finally((): void => {
                        reject(new core.exceptions.PluginError(typeof error === 'string' ? error : error.message));
                    });
                });
        }
    });
}

export function registerGitPlugin(): void {
    const plugin: GitPlugin = {
        name: 'Git',
        description: 'Plugin allows to work with git repositories',
        cvat: {
            classes: {
                Task: {
                    prototype: {
                        save: {
                            leave: cloneRepository,
                        },
                    },
                },
            },
        },
        data: {
            task: null,
            lfs: false,
            format: '',
            repos: '',
        },
        callbacks: {
            onStatusChange: null,
        },
    };

    core.plugins.register(plugin);
}

export async function getReposData(tid: number): Promise<ReposData | null> {
    const response = await core.server.request(`${baseURL}/git/repository/get/${tid}`, {
        method: 'GET',
    });

    if (!response.url.value) {
        return null;
    }

    return {
        url: response.url.value.split(/\s+/)[0],
        status: {
            value: response.status.value,
            error: response.status.error,
        },
        format: response.format,
    };
}

export function syncRepos(tid: number): Promise<void> {
    return new Promise((resolve, reject): void => {
        core.server
            .request(`${baseURL}/git/repository/push/${tid}`, {
                method: 'GET',
            })
            .then((syncResponse: any): void => {
                async function checkSync(): Promise<void> {
                    const id = syncResponse.rq_id;
                    const response = await core.server.request(`${baseURL}/git/repository/check/${id}`, {
                        method: 'GET',
                    });

                    if (['queued', 'started'].includes(response.status)) {
                        setTimeout(checkSync, 1000);
                    } else if (response.status === 'finished') {
                        resolve();
                    } else if (response.status === 'failed') {
                        const message = `Can not push to remote repository. Message: ${response.stderr}`;
                        reject(new Error(message));
                    } else {
                        const message = `Check returned status "${response.status}".`;
                        reject(new Error(message));
                    }
                }

                setTimeout(checkSync, 1000);
            })
            .catch((error: any): void => {
                reject(error);
            });
    });
}
