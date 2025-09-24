// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { Dispatch } from 'redux';
import {
    Job, Task, Project, CloudStorage,
} from 'cvat-core-wrapper';
import MLModel from 'cvat-core/src/ml-model';
import { getJobPreviewAsync } from 'actions/jobs-actions';
import { getTaskPreviewAsync } from 'actions/tasks-actions';
import { getProjectsPreviewAsync } from 'actions/projects-actions';
import { getCloudStoragePreviewAsync } from 'actions/cloud-storage-actions';
import { getModelPreviewAsync } from 'actions/models-actions';

export type PreviewEntity = Job | Task | Project | CloudStorage | MLModel;
export type PreviewType = 'job' | 'task' | 'project' | 'cloudStorage' | 'model';

export function getPreviewType(entity: PreviewEntity): PreviewType {
    if (entity instanceof Job) return 'job';
    if (entity instanceof Task) return 'task';
    if (entity instanceof Project) return 'project';
    if (entity instanceof CloudStorage) return 'cloudStorage';
    if (entity instanceof MLModel) return 'model';
    throw new Error('Unknown entity type');
}

export function getRequestId(entity: PreviewEntity): string {
    const type = getPreviewType(entity);
    return `${type}-${(entity as any).id}`;
}

interface PreviewRequest {
    id: string;
    entity: PreviewEntity;
    dispatch: Dispatch;
}

class PreviewQueue {
    private queue: PreviewRequest[] = [];
    private isProcessing: boolean = false;
    private currentRequest: PreviewRequest | null = null;

    public addRequest(request: PreviewRequest): void {
        const isDuplicate = this.queue.some((req) => req.id === request.id) ||
                           (this.currentRequest && this.currentRequest.id === request.id);

        if (!isDuplicate) {
            this.queue.push(request);
            this.processQueue();
        }
    }

    public removeRequest(id: string): void {
        this.queue = this.queue.filter((req) => req.id !== id);
    }

    private async processQueue(): Promise<void> {
        if (this.isProcessing || this.queue.length === 0) {
            return;
        }

        this.isProcessing = true;

        while (this.queue.length > 0) {
            const request = this.queue.shift()!;
            this.currentRequest = request;

            await this.executeRequest(request);
        }

        this.currentRequest = null;
        this.isProcessing = false;
    }

    private async executeRequest(request: PreviewRequest): Promise<void> {
        const { id, entity, dispatch } = request;
        const type = id.split('-')[0] as PreviewType;

        return new Promise((resolve, reject) => {
            let action: any;

            switch (type) {
                case 'job':
                    action = getJobPreviewAsync(entity as Job);
                    break;
                case 'task':
                    action = getTaskPreviewAsync(entity as Task);
                    break;
                case 'project':
                    action = getProjectsPreviewAsync(entity as Project);
                    break;
                case 'cloudStorage':
                    action = getCloudStoragePreviewAsync(entity as CloudStorage);
                    break;
                case 'model':
                    action = getModelPreviewAsync(entity as MLModel);
                    break;
                default:
                    return;
            }

            const result = dispatch(action);
            result.then(resolve).catch(reject);
        });
    }
}

export const previewQueue = new PreviewQueue();
