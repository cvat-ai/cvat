// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) 2022-2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { Storage } from './storage';
import serverProxy from './server-proxy';
import { decodePreview } from './frames';
import Project from './project';
import { exportDataset, importDataset } from './annotations';
import { SerializedLabel } from './server-response-types';
import { Label } from './labels';
import AnnotationGuide from './guide';

export default function implementProject(projectClass) {
    projectClass.prototype.save.implementation = async function () {
        if (typeof this.id !== 'undefined') {
            const projectData = this._updateTrigger.getUpdated(this, {
                bugTracker: 'bug_tracker',
                assignee: 'assignee_id',
            });

            if (projectData.assignee_id) {
                projectData.assignee_id = projectData.assignee_id.id;
            }

            await Promise.all((projectData.labels || []).map((label: Label): Promise<unknown> => {
                if (label.deleted) {
                    return serverProxy.labels.delete(label.id);
                }

                if (label.patched) {
                    return serverProxy.labels.update(label.id, label.toJSON());
                }

                return Promise.resolve();
            }));

            // leave only new labels to create them via project PATCH request
            projectData.labels = (projectData.labels || [])
                .filter((label: SerializedLabel) => !Number.isInteger(label.id)).map((el) => el.toJSON());
            if (!projectData.labels.length) {
                delete projectData.labels;
            }

            this._updateTrigger.reset();
            let serializedProject = null;
            if (Object.keys(projectData).length) {
                serializedProject = await serverProxy.projects.save(this.id, projectData);
            } else {
                [serializedProject] = (await serverProxy.projects.get({ id: this.id }));
            }

            const labels = await serverProxy.labels.get({ project_id: serializedProject.id });
            return new Project({ ...serializedProject, labels: labels.results });
        }

        // initial creating
        const projectSpec: any = {
            name: this.name,
            labels: this.labels.map((el) => el.toJSON()),
        };

        if (this.bugTracker) {
            projectSpec.bug_tracker = this.bugTracker;
        }

        if (this.targetStorage) {
            projectSpec.target_storage = this.targetStorage.toJSON();
        }

        if (this.sourceStorage) {
            projectSpec.source_storage = this.sourceStorage.toJSON();
        }

        const project = await serverProxy.projects.create(projectSpec);
        const labels = await serverProxy.labels.get({ project_id: project.id });
        return new Project({ ...project, labels: labels.results });
    };

    projectClass.prototype.delete.implementation = async function () {
        const result = await serverProxy.projects.delete(this.id);
        return result;
    };

    projectClass.prototype.preview.implementation = async function (this: Project): Promise<string> {
        if (this.id === null) return '';
        const preview = await serverProxy.projects.getPreview(this.id);
        if (!preview) return '';
        return decodePreview(preview);
    };

    projectClass.prototype.annotations.exportDataset.implementation = async function (
        format: string,
        saveImages: boolean,
        useDefaultSettings: boolean,
        targetStorage: Storage,
        customName?: string,
    ) {
        const result = exportDataset(this, format, saveImages, useDefaultSettings, targetStorage, customName);
        return result;
    };
    projectClass.prototype.annotations.importDataset.implementation = async function (
        format: string,
        useDefaultSettings: boolean,
        sourceStorage: Storage,
        file: File | string,
        options?: {
            convMaskToPoly?: boolean,
            updateStatusCallback?: (s: string, n: number) => void,
        },
    ) {
        return importDataset(this, format, useDefaultSettings, sourceStorage, file, options);
    };

    projectClass.prototype.backup.implementation = async function (
        targetStorage: Storage,
        useDefaultSettings: boolean,
        fileName?: string,
    ) {
        const result = await serverProxy.projects.backup(this.id, targetStorage, useDefaultSettings, fileName);
        return result;
    };

    projectClass.restore.implementation = async function (storage: Storage, file: File | string) {
        const result = await serverProxy.projects.restore(storage, file);
        return result;
    };

    projectClass.prototype.guide.implementation = async function guide() {
        if (this.guideId === null) {
            return null;
        }

        const result = await serverProxy.guides.get(this.guideId);
        return new AnnotationGuide(result);
    };

    return projectClass;
}
