// Copyright (C) 2019-2022 Intel Corporation
// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { InferenceSession, Tensor } from 'onnxruntime-web';
import { getCore } from 'cvat-core-wrapper';

const core = getCore();
const baseURL = core.config.backendAPI.slice(0, -7);

interface SAMPlugin {
    name: string;
    description: string;
    cvat: {
        lambda: {
            call: {
                enter: (plugin: SAMPlugin, taskID: number, model: any, args: any) => Promise<any>;
                leave: (plugin: SAMPlugin, result: any, taskID: number, model: any, args: any) => Promise<any>;
            };
        };
    };
    data: {
        modelID: string;
        modelURL: string;
        embeddings: Record<string, Tensor | null>;
        session: InferenceSession | null;
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
    lfs: boolean
}


// function waitForClone({ data: cloneResponse }: any): Promise<void> {
//     return new Promise((resolve, reject): void => {
//         async function checkCallback(): Promise<void> {
//             core.server
//                 .request(`${baseURL}/git/repository/check/${cloneResponse.rq_id}`, {
//                     method: 'GET',
//                 })
//                 .then(({ data }: any): void => {
//                     if (['queued', 'started'].includes(data.status)) {
//                         setTimeout(checkCallback, 1000);
//                     } else if (data.status === 'finished') {
//                         resolve();
//                     } else if (data.status === 'failed') {
//                         let message = 'Repository status check failed. ';
//                         if (data.stderr) {
//                             message += data.stderr;
//                         }

//                         reject(message);
//                     } else {
//                         const message = `Repository status check returned the status "${data.status}"`;
//                         reject(message);
//                     }
//                 })
//                 .catch((error: any): void => {
//                     const message = `Can not sent a request to clone the repository. ${error.toString()}`;
//                     reject(message);
//                 });
//         }

//         setTimeout(checkCallback, 1000);
//     });
// }

// async function cloneRepository(this: any, plugin: GitPlugin, createdTask: any): Promise<any> {
//     return new Promise((resolve, reject): any => {
//         if (typeof this.id !== 'undefined' || plugin.data.task !== this) {
//             // not the first save, we do not need to clone the repository
//             // or anchor set for another task
//             resolve(createdTask);
//         } else if (plugin.data.repos) {
//             if (plugin.callbacks.onStatusChange) {
//                 plugin.callbacks.onStatusChange('The repository is being cloned..');
//             }

//             core.server
//                 .request(`${baseURL}/git/repository/create/${createdTask.id}`, {
//                     method: 'POST',
//                     headers: {
//                         'Content-type': 'application/json',
//                     },
//                     data: JSON.stringify({
//                         path: plugin.data.repos,
//                         lfs: plugin.data.lfs,
//                         format: plugin.data.format,
//                         tid: createdTask.id,
//                     }),
//                 })
//                 .then(waitForClone)
//                 .then((): void => {
//                     resolve(createdTask);
//                 })
//                 .catch((error: any): void => {
//                     createdTask.delete().finally((): void => {
//                         reject(new core.exceptions.PluginError(typeof error === 'string' ? error : error.message));
//                     });
//                 });
//         }
//     });
// }

export function registerSAMPlugin(): void {
    const plugin: SAMPlugin = {
        name: 'Segmeny Anything',
        description: 'Plugin handles non-default SAM model output',
        cvat: {
            lambda: {
                call: {
                    async enter(plugin: SAMPlugin, taskID: number, model: any, { frame }: { frame: number }) {
                        if (model.id !== plugin.data.modelID) return;
                        if (!plugin.data.session) {
                            throw new Error('SAM plugin is not ready, session was not initialized');
                        }

                        const key = `${taskID}_${frame}`;
                        if (key in plugin.data.embeddings) {
                            return {
                                preventMethodCall: true,
                            };
                        }
                    },

                    async leave(plugin: SAMPlugin, result: any, taskID: number, model: any, { frame, pos_points }: { frame: number }) {
                        if (model.id !== plugin.data.modelID) return;
                        const key = `${taskID}_${frame}`;
                        // let finalRes =
                        // console.log(plugin, taskID, model, args, result)
                        if (result) {
                            const bin = window.atob(result.blob);
                            const uint8Array = new Uint8Array(bin.length);
                            for (let i = 0; i < bin.length; i++) {
                                uint8Array[i] = bin.charCodeAt(i);
                            }
                            const float32Arr = new Float32Array(uint8Array.buffer);
                            plugin.data.embeddings[key] = new Tensor('float32', float32Arr, [1, 256, 64, 64]);
                        }

                        const modelData = ({ clicks, tensor, modelScale }) => {
                            const imageEmbedding = tensor;
                            let pointCoords;
                            let pointLabels;
                            let pointCoordsTensor;
                            let pointLabelsTensor;

                            // Check there are input click prompts
                            if (clicks) {
                              let n = clicks.length;

                              // If there is no box input, a single padding point with
                              // label -1 and coordinates (0.0, 0.0) should be concatenated
                              // so initialize the array to support (n + 1) points.
                              pointCoords = new Float32Array(2 * (n + 1));
                              pointLabels = new Float32Array(n + 1);

                              // Add clicks and scale to what SAM expects
                              for (let i = 0; i < n; i++) {
                                pointCoords[2 * i] = clicks[i].x * modelScale.samScale;
                                pointCoords[2 * i + 1] = clicks[i].y * modelScale.samScale;
                                pointLabels[i] = clicks[i].clickType;
                              }

                              // Add in the extra point/label when only clicks and no box
                              // The extra point is at (0, 0) with label -1
                              pointCoords[2 * n] = 0.0;
                              pointCoords[2 * n + 1] = 0.0;
                              pointLabels[n] = -1.0;

                              // Create the tensor
                              pointCoordsTensor = new Tensor("float32", pointCoords, [1, n + 1, 2]);
                              pointLabelsTensor = new Tensor("float32", pointLabels, [1, n + 1]);
                            }
                            const imageSizeTensor = new Tensor("float32", [
                              modelScale.height,
                              modelScale.width,
                            ]);

                            if (pointCoordsTensor === undefined || pointLabelsTensor === undefined)
                              return;

                            // There is no previous mask, so default to an empty tensor
                            const maskInput = new Tensor(
                              "float32",
                              new Float32Array(256 * 256),
                              [1, 1, 256, 256]
                            );
                            // There is no previous mask, so default to 0
                            const hasMaskInput = new Tensor("float32", [0]);

                            return {
                              image_embeddings: imageEmbedding,
                              point_coords: pointCoordsTensor,
                              point_labels: pointLabelsTensor,
                              orig_im_size: imageSizeTensor,
                              mask_input: maskInput,
                              has_mask_input: hasMaskInput,
                            };
                          };

                          const handleImageScale = () => {
                            // Input images to SAM must be resized so the longest side is 1024
                            const LONG_SIDE_LENGTH = 1024;
                            let w = +window.document.getElementsByClassName('cvat_masks_canvas_wrapper')[0].style.width.slice(0, -2);;
                            let h = +window.document.getElementsByClassName('cvat_masks_canvas_wrapper')[0].style.height.slice(0, -2);;
                            const samScale = LONG_SIDE_LENGTH / Math.max(h, w);
                            return { height: h, width: w, samScale };
                          };


                        const { height, width, samScale } = handleImageScale();

                        const modelScale = {
                            height: height,  // original image height
                            width: width,  // original image width
                            samScale: samScale, // scaling factor for image which has been resized to longest side 1024
                          };

                        const feeds = modelData({
                            clicks: pos_points.map(([x, y]) => ({
                                clickType: 1,
                                height: null,
                                width: null,
                                x: x,
                                y: y,
                            })),
                            tensor: plugin.data.embeddings[key],
                            modelScale: modelScale,
                        });

                        function toImageData(input: any, width: number, height: number) {
                            let result = Array(height).fill(0);
                            for (let i = 0; i < result.length; i++) {
                                result[i] = Array(width).fill(0);
                            }

                            for (let i = 0; i < input.length; i++) {
                              const row = Math.floor(i / width);
                              const col = i % width;
                              result[row][col] = input[i] > 0.0 ? 255 : 0;
                            }

                            return result;
                        }

                          function rleToImage(input: any, width: number, height: number) {
                            return toImageData(input, width, height);
                          }

                        const { masks } = await (plugin.data.session as InferenceSession).run(feeds);
                        const imageData = rleToImage(masks.data, masks.dims[3], masks.dims[2])

                        return {
                            mask: imageData,
                            points: [[0,0, 10, 10, 20,20]],
                        };

                    },
                },
            },
        },
        data: {
            modelID: 'pth.facebookresearch.sam.vit_h',
            modelURL: '/api/lambda/sam_detector.onnx',
            embeddings: {},
            session: null,
        },
        callbacks: {
            onStatusChange: null,
        },
    };

    InferenceSession.create(plugin.data.modelURL).then((session) => {
        plugin.data.session = session;
        core.plugins.register(plugin);
    });
}

// export async function getReposData(tid: number): Promise<ReposData | null> {
//     const response = (await core.server.request(`${baseURL}/git/repository/get/${tid}`, {
//         method: 'GET',
//     })).data;

//     if (!response.url.value) {
//         return null;
//     }

//     return {
//         url: response.url.value.split(/\s+/)[0],
//         status: {
//             value: response.status.value,
//             error: response.status.error,
//         },
//         format: response.format,
//         lfs: response.lfs,
//     };
// }

// export function syncRepos(tid: number): Promise<void> {
//     return new Promise((resolve, reject): void => {
//         core.server
//             .request(`${baseURL}/git/repository/push/${tid}`, {
//                 method: 'GET',
//             })
//             .then(({ data: syncResponse }: any): void => {
//                 async function checkSync(): Promise<void> {
//                     const id = syncResponse.rq_id;
//                     const response = (await core.server.request(`${baseURL}/git/repository/check/${id}`, {
//                         method: 'GET',
//                     })).data;

//                     if (['queued', 'started'].includes(response.status)) {
//                         setTimeout(checkSync, 1000);
//                     } else if (response.status === 'finished') {
//                         resolve();
//                     } else if (response.status === 'failed') {
//                         const message = `Can not push to remote repository. Message: ${response.stderr}`;
//                         reject(new Error(message));
//                     } else {
//                         const message = `Check returned status "${response.status}".`;
//                         reject(new Error(message));
//                     }
//                 }

//                 setTimeout(checkSync, 1000);
//             })
//             .catch((error: any): void => {
//                 reject(error);
//             });
//     });
// }

// export async function changeRepo(taskId: number, type: string, value: any): Promise<void> {
//     return new Promise((resolve, reject): void => {
//         core.server
//             .request(`${baseURL}/git/repository/${taskId}`, {
//                 method: 'PATCH',
//                 headers: {
//                     'Content-type': 'application/json',
//                 },
//                 data: JSON.stringify({
//                     type,
//                     value,
//                 }),
//             })
//             .then(resolve)
//             .catch((error: any): void => {
//                 reject(error);
//             });
//     });
// }
