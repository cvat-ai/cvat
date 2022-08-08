// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

(() => {
    const serverProxy = require('./server-proxy');
    const { getPreview } = require('./frames');

    const { Project } = require('./project');
    const { Storage } = require('./storage');
    const { exportDataset, importDataset } = require('./annotations');

    function implementProject(projectClass) {
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
                projectSpec.target_storage = this.targetStorage;
            }

            if (this.sourceStorage) {
                projectSpec.source_storage = this.sourceStorage;
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
            format,
            saveImages,
            customName,
            targetStorage
        ) {
            const result = exportDataset(this, format, customName, saveImages, targetStorage);
            return result;
        };
        projectClass.prototype.annotations.importDataset.implementation = async function (
            format,
            useDefaultSettings,
            sourceStorage,
            file,
            fileName,
            updateStatusCallback
        ) {
            return importDataset(this, format, useDefaultSettings, sourceStorage, file, fileName, updateStatusCallback);
        };

        projectClass.prototype.export.implementation = async function (fileName: string, targetStorage: Storage | null) {
            const result = await serverProxy.projects.export(this.id, fileName, targetStorage);
            return result;
        };

        projectClass.import.implementation = async function (storage, file, fileName) {
            const result = await serverProxy.projects.import(storage, file, fileName);
            return result;
        };

        return projectClass;
    }

    module.exports = implementProject;
})();
