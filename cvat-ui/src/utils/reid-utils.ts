// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import getCore from 'cvat-core-wrapper';
import { ShapeType, RQStatus } from 'reducers/interfaces';


const core = getCore();
const baseURL = core.config.backendAPI.slice(0, -7);

type Params = {
    threshold: number;
    distance: number;
    onUpdatePercentage(percentage: number): void;
    jobID: number;
    annotations: any;
};

export function run(params: Params): Promise<void> {
    return new Promise((resolve, reject) => {
        const {
            threshold,
            distance,
            onUpdatePercentage,
            jobID,
            annotations,
        } = params;
        const { shapes, ...rest } = annotations;

        const boxes = shapes.filter((shape: any): boolean => shape.type === ShapeType.RECTANGLE);
        const others = shapes.filter((shape: any): boolean => shape.type !== ShapeType.RECTANGLE);

        core.server.request(
            `${baseURL}/reid/start/job/${params.jobID}`, {
                method: 'POST',
                data: JSON.stringify({
                    threshold,
                    maxDistance: distance,
                    boxes,
                }),
                headers: {
                    'Content-Type': 'application/json',
                },
            },
        ).then(() => {
            const timeoutCallback = (): void => {
                core.server.request(
                    `${baseURL}/reid/check/${jobID}`, {
                        method: 'GET',
                    },
                ).then((response: any) => {
                    const { status } = response;
                    if (status === RQStatus.finished) {
                        if (!response.result) {
                            // cancelled
                            resolve(annotations);
                        }

                        const result = JSON.parse(response.result);
                        const collection = rest;
                        Array.prototype.push.apply(collection.tracks, result);
                        collection.shapes = others;
                        resolve(collection);
                    } else if (status === RQStatus.started) {
                        const { progress } = response;
                        if (typeof (progress) === 'number') {
                            onUpdatePercentage(+progress.toFixed(2));
                        }
                        setTimeout(timeoutCallback, 1000);
                    } else if (status === RQStatus.failed) {
                        reject(new Error(response.stderr));
                    } else if (status === RQStatus.unknown) {
                        reject(new Error('Unknown REID status has been received'));
                    } else {
                        setTimeout(timeoutCallback, 1000);
                    }
                }).catch((error: Error) => {
                    reject(error);
                });
            };

            setTimeout(timeoutCallback, 1000);
        }).catch((error: Error) => {
            reject(error);
        });
    });
}

export function cancel(jobID: number): void {
    core.server.request(
        `${baseURL}/reid/cancel/${jobID}`, {
            method: 'GET',
        },
    );
}
