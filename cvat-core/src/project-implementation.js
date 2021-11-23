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
            if (typeof this.id !== 'undefined') {
                const projectData = {};
                for (const [field, isUpdated] of Object.entries(this._updatedFields)) {
                    if (isUpdated) {
                        switch (field) {
                            case 'name':
                                projectData.name = this.name;
                                break;
                            case 'assignee':
                                projectData.assignee_id = this.assignee ? this.assignee.id : null;
                                break;
                            case 'bugTracker':
                                projectData.bug_tracker = this.bugTracker;
                                break;
                            case 'labels':
                                projectData.labels = this.labels.map((el) => el.toJSON());
                                break;
                            case 'trainingProject':
                                projectData.training_project = this.trainingProject;
                                break;
                            default:
                                break;
                        }
                    }
                }

                await serverProxy.projects.save(this.id, projectData);
                this._updatedFields.reset();
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
            format, saveImages, customName,
        ) {
            const result = exportDataset(this, format, customName, saveImages);
            return result;
        };

        return projectClass;
    }

    module.exports = implementProject;
})();
