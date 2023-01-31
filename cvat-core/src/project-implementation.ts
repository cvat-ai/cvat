// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { Storage } from './storage';

const serverProxy = require('./server-proxy').default;
const { getPreview } = require('./frames');

const Project = require('./project').default;
const { exportDataset, importDataset } = require('./annotations');

export default function implementProject(projectClass) {
    projectClass.prototype.save.implementation = async function () {
        if (typeof this.id !== 'undefined') {
            const projectData = this._updateTrigger.getUpdated(this, {
                bugTracker: 'bug_tracker',
                trainingProject: 'training_project',
                assignee: 'assignee_id',
            });
            if (projectData.assignee_id) {
                projectData.assignee_id = projectData.assignee_id.id;
            }
            if (projectData.labels) {
                projectData.labels = projectData.labels.map((el) => el.toJSON());
            }

            await serverProxy.projects.save(this.id, projectData);
            this._updateTrigger.reset();
            return this;
        }

        // initial creating
        const projectSpec: any = {
            name: this.name,
            labels: this.labels.map((el) => el.toJSON()),
        };

        if (this.bugTracker) {
            projectSpec.bug_tracker = this.bugTracker;
        }

        if (this.trainingProject) {
            projectSpec.training_project = this.trainingProject;
        }

        if (this.targetStorage) {
            projectSpec.target_storage = this.targetStorage.toJSON();
        }

        if (this.sourceStorage) {
            projectSpec.source_storage = this.sourceStorage.toJSON();
        }

        const project = await serverProxy.projects.create(projectSpec);
        return new Project(project);
    };

    projectClass.prototype.delete.implementation = async function () {
        const result = await serverProxy.projects.delete(this.id);
        return result;
    };

    projectClass.prototype.preview.implementation = async function () {
        if (!this._internalData.task_ids.length) {
            return '';
        }
        const frameData = await getPreview(this._internalData.task_ids[0]);
        return frameData;
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
        updateStatusCallback,
    ) {
        return importDataset(this, format, useDefaultSettings, sourceStorage, file, updateStatusCallback);
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

    return projectClass;
}
