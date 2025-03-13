// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { SerializedGuide } from './server-response-types';
import { ArgumentError, DataError } from './exceptions';
import PluginRegistry from './plugins';
import serverProxy from './server-proxy';

class AnnotationGuide {
    #id: AnnotationGuide['id'];
    #taskID: AnnotationGuide['taskID'];
    #projectID: AnnotationGuide['projectID'];
    #createdDate?: AnnotationGuide['createdDate'];
    #updatedDate?: AnnotationGuide['updatedDate'];
    #markdown: AnnotationGuide['markdown'];

    constructor(initialData: Partial<SerializedGuide>) {
        this.#id = initialData.id;
        this.#taskID = initialData.task_id || null;
        this.#projectID = initialData.project_id || null;
        this.#createdDate = initialData.created_date;
        this.#updatedDate = initialData.updated_date;
        this.#markdown = initialData.markdown || '';
    }

    public get id(): number | undefined {
        return this.#id;
    }

    public get taskID(): number | null {
        return this.#taskID;
    }

    public get projectID(): number | null {
        return this.#projectID;
    }

    public get createdDate(): string | undefined {
        return this.#createdDate;
    }

    public get updatedDate(): string | undefined {
        return this.#updatedDate;
    }

    public get markdown(): string {
        return this.#markdown;
    }

    public set markdown(value: string) {
        if (typeof value !== 'string') {
            throw new ArgumentError(`Markdown value must be a string, ${typeof value} received`);
        }
        this.#markdown = value;
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

            if (this.projectID === null && this.taskID === null) {
                throw new DataError('One of projectID or taskID must be specified for a guide');
            }

            if (this.projectID !== null && this.taskID !== null) {
                throw new DataError('Both projectID and taskID must not be presented for a guide');
            }

            const result = await serverProxy.guides.create({
                task_id: this.taskID,
                project_id: this.projectID,
                markdown: this.markdown,
            });
            return new AnnotationGuide(result);
        },
    },
});

export default AnnotationGuide;
