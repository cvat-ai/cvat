// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import serverProxy from './server-proxy';
import { decodePreview } from './frames';
import ProjectClass from './project';
import { exportDataset, importDataset } from './annotations';
import { SerializedLabel } from './server-response-types';
import { Label } from './labels';
import AnnotationGuide from './guide';

export default function implementProject(Project: typeof ProjectClass): typeof ProjectClass {
    Object.defineProperty(Project.prototype.save, 'implementation', {
        value: async function saveImplementation(
            this: ProjectClass,
        ): ReturnType<typeof ProjectClass.prototype.save> {
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
        },
    });

    Object.defineProperty(Project.prototype.delete, 'implementation', {
        value: function deleteImplementation(
            this: ProjectClass,
        ): ReturnType<typeof ProjectClass.prototype.delete> {
            return serverProxy.projects.delete(this.id);
        },
    });

    Object.defineProperty(Project.prototype.preview, 'implementation', {
        value: function previewImplementation(
            this: ProjectClass,
        ): ReturnType<typeof ProjectClass.prototype.preview> {
            if (this.id === null) {
                return Promise.resolve('');
            }

            return serverProxy.projects.getPreview(this.id).then((preview) => {
                if (!preview) {
                    return Promise.resolve('');
                }
                return decodePreview(preview);
            });
        },
    });

    Object.defineProperty(Project.prototype.annotations.exportDataset, 'implementation', {
        value: async function exportDatasetImplementation(
            this: ProjectClass,
            format: Parameters<typeof ProjectClass.prototype.annotations.exportDataset>[0],
            saveImages: Parameters<typeof ProjectClass.prototype.annotations.exportDataset>[1],
            useDefaultSettings: Parameters<typeof ProjectClass.prototype.annotations.exportDataset>[2],
            targetStorage: Parameters<typeof ProjectClass.prototype.annotations.exportDataset>[3],
            customName: Parameters<typeof ProjectClass.prototype.annotations.exportDataset>[4],
        ): ReturnType<typeof ProjectClass.prototype.annotations.exportDataset> {
            const rqID = await exportDataset(this, format, saveImages, useDefaultSettings, targetStorage, customName);
            return rqID;
        },
    });

    Object.defineProperty(Project.prototype.annotations.importDataset, 'implementation', {
        value: async function importDatasetImplementation(
            this: ProjectClass,
            format: Parameters<typeof ProjectClass.prototype.annotations.importDataset>[0],
            useDefaultSettings: Parameters<typeof ProjectClass.prototype.annotations.importDataset>[1],
            sourceStorage: Parameters<typeof ProjectClass.prototype.annotations.importDataset>[2],
            file: Parameters<typeof ProjectClass.prototype.annotations.importDataset>[3],
            options: Parameters<typeof ProjectClass.prototype.annotations.importDataset>[4],
        ): ReturnType<typeof ProjectClass.prototype.annotations.importDataset> {
            const rqID = await importDataset(this, format, useDefaultSettings, sourceStorage, file, options);
            return rqID;
        },
    });

    Object.defineProperty(Project.prototype.backup, 'implementation', {
        value: async function backupImplementation(
            this: ProjectClass,
            targetStorage: Parameters<typeof ProjectClass.prototype.backup>[0],
            useDefaultSettings: Parameters<typeof ProjectClass.prototype.backup>[1],
            fileName: Parameters<typeof ProjectClass.prototype.backup>[2],
        ): ReturnType<typeof ProjectClass.prototype.backup> {
            const rqID = await serverProxy.projects.backup(this.id, targetStorage, useDefaultSettings, fileName);
            return rqID;
        },
    });

    Object.defineProperty(Project.restore, 'implementation', {
        value: async function restoreImplementation(
            this: ProjectClass,
            storage: Parameters<typeof ProjectClass.restore>[0],
            file: Parameters<typeof ProjectClass.restore>[1],
        ): ReturnType<typeof ProjectClass.restore> {
            const rqID = await serverProxy.projects.restore(storage, file);
            return rqID;
        },
    });

    Object.defineProperty(Project.prototype.guide, 'implementation', {
        value: async function guideImplementation(
            this: ProjectClass,
        ): ReturnType<typeof ProjectClass.prototype.guide> {
            if (this.guideId === null) {
                return null;
            }

            const result = await serverProxy.guides.get(this.guideId);
            return new AnnotationGuide(result);
        },
    });

    return Project;
}
