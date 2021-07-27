// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

(() => {
    const serverProxy = require('./server-proxy');
    const { getPreview } = require('./frames');

    const { Project } = require('./project');
    const { exportDataset } = require('./annotations');

    function implementProject(projectClass) {
        projectClass.prototype.save.implementation = async function () {
            const trainingProjectCopy = this.trainingProject;
            if (typeof this.id !== 'undefined') {
                // project has been already created, need to update some data
                const projectData = {
                    name: this.name,
                    assignee_id: this.assignee ? this.assignee.id : null,
                    bug_tracker: this.bugTracker,
                    labels: [...this._internalData.labels.map((el) => el.toJSON())],
                };

                if (trainingProjectCopy) {
                    projectData.training_project = trainingProjectCopy;
                }

                await serverProxy.projects.save(this.id, projectData);
                return this;
            }

            // initial creating
            const projectSpec = {
                name: this.name,
                labels: [...this.labels.map((el) => el.toJSON())],
            };

            if (this.bugTracker) {
                projectSpec.bug_tracker = this.bugTracker;
            }

            if (trainingProjectCopy) {
                projectSpec.training_project = trainingProjectCopy;
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
            format, saveImages, customName,
        ) {
            const result = exportDataset(this, format, customName, saveImages);
            return result;
        };

        return projectClass;
    }

    module.exports = implementProject;
})();
