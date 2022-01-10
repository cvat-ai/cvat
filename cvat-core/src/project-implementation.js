// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

(() => {
    const serverProxy = require('./server-proxy');
    const { getPreview } = require('./frames');

    const { Project } = require('./project');
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
            const projectSpec = {
                name: this.name,
                labels: this.labels.map((el) => el.toJSON()),
            };

            if (this.bugTracker) {
                projectSpec.bug_tracker = this.bugTracker;
            }

            if (this.trainingProject) {
                projectSpec.training_project = this.trainingProject;
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
        ) {
            const result = exportDataset(this, format, customName, saveImages);
            return result;
        };
        projectClass.prototype.annotations.importDataset.implementation = async function (
            format,
            file,
            updateStatusCallback,
        ) {
            return importDataset(this, format, file, updateStatusCallback);
        };

        projectClass.prototype.backup.implementation = async function () {
            const result = await serverProxy.projects.backupProject(this.id);
            return result;
        };

        projectClass.restore.implementation = async function (file) {
            const result = await serverProxy.projects.restoreProject(file);
            return result.id;
        };

        return projectClass;
    }

    module.exports = implementProject;
})();
