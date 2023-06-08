// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import User from './user';
import { SerializedGuide } from './server-response-types';
import { ArgumentError, DataError } from './exceptions';
import PluginRegistry from './plugins';
import serverProxy from './server-proxy';

class AnnotationGuide {
    public readonly id?: number;
    public readonly taskId: number;
    public readonly projectId: number;
    public readonly createdDate?: string;
    public readonly updatedDate?: string;
    public markdown: string;

    constructor(initialData: Partial<SerializedGuide>) {
        const data = {
            id: undefined,
            task_id: null,
            project_id: null,
            created_date: undefined,
            updated_date: undefined,
            markdown: '',
        };

        for (const property in data) {
            if (Object.prototype.hasOwnProperty.call(data, property) && property in initialData) {
                data[property] = initialData[property];
            }
        }

        Object.defineProperties(this, Object.freeze({
            id: {
                get: () => data.id,
            },
            taskId: {
                get: () => data.task_id,
            },
            projectId: {
                get: () => data.project_id,
            },
            createdDate: {
                get: () => data.created_date,
            },
            updatedData: {
                get: () => data.updated_date,
            },
            markdown: {
                get: () => data.markdown,
                set: (value: string) => {
                    if (typeof value !== 'string') {
                        throw new ArgumentError(`Markdown value must be a string, ${typeof value} received`);
                    }
                    data.markdown = value;
                },
            },
        }));
    }

    async save(): Promise<AnnotationGuide> {
        const result = await PluginRegistry.apiWrapper.call(this, AnnotationGuide.prototype.save);
        return result;
    }
}

Object.defineProperties(AnnotationGuide.prototype.save, {
    implementation: {
        writable: false,
        enumerable: false,
        value: async function implementation(this: AnnotationGuide) {
            if (Number.isInteger(this.id)) {
                const result = await serverProxy.guides.update(this.id, { markdown: this.markdown });
                return new AnnotationGuide(result);
            }

            if (this.projectId === null && this.taskId === null) {
                throw new DataError('One of projectId or taskId must be presented for a guide');
            }

            if (this.projectId !== null && this.taskId !== null) {
                throw new DataError('Both projectId and taskId must not be presented for a guide');
            }

            const result = await serverProxy.guides.create({
                task_id: this.taskId,
                project_id: this.projectId,
                markdown: this.markdown,
            });
            return new AnnotationGuide(result);
        },
    },
});

export default AnnotationGuide;
