// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { defaultTaskSpec } from '../../support/default-specs';

context('Export project dataset with 3D task.', { browser: '!firefox' }, () => {
    const caseID = 104;
    const projectName = `Case ${caseID}`;
    const task = {
        name3d: `Case ${caseID}`,
        label3d: 'label3d',
        attrName3d: 'Kind',
        attrValue3d: 'Oak',
        archiveName: 'test_canvas3d.zip',
        advancedConfigurationParams: false,
        forProject: true,
        attachToProject: false,
        multiAttrParams: false,
    };
    let datasetArchiveName;
    let projectID;

    before(() => {
        cy.prepareUserSession();
        cy.headlessCreateProject({
            name: projectName,
            labels: [{
                name: task.label3d,
                attributes: [{
                    mutable: false,
                    name: task.attrName3d,
                    values: [],
                    default_value: task.attrValue3d,
                    input_type: 'text',
                }],
            }],
        }).then(({ projectID: pid }) => {
            const { taskSpec, dataSpec, extras } = defaultTaskSpec({
                taskName: task.name3d,
                serverFiles: [task.archiveName],
                validationParams: task.advancedConfigurationParams,
                projectID: pid,
            });
            delete taskSpec.labels;
            cy.headlessCreateTask(taskSpec, dataSpec, extras);
            projectID = pid;
        });
    });

    after(() => {
        cy.headlessDeleteProject(projectID);
        cy.logout();
    });

    describe(`Testing "Case ${caseID}"`, () => {
        it('Export project with 3D task. Annotation.', () => {
            cy.goToProjectsList();
            const exportAnnotation3d = {
                projectName,
                as: 'exportAnnotations3d',
                type: 'annotations',
                dumpType: 'Kitti Raw Format',
            };
            cy.exportProject(exportAnnotation3d);
            cy.downloadExport().then((file) => {
                cy.verifyDownload(file);
            });
            cy.goBack();
        });

        it('Export project with 3D task. Dataset.', () => {
            cy.goToProjectsList();
            const exportDataset3d = {
                projectName,
                as: 'exportDataset3d',
                type: 'dataset',
                dumpType: 'Sly Point Cloud Format',
            };
            cy.exportProject(exportDataset3d);
            cy.downloadExport().then((file) => {
                datasetArchiveName = file;
                cy.verifyDownload(datasetArchiveName);
            });
            cy.goBack();
        });

        it('Export project with 3D task. Annotation. Rename a archive.', () => {
            cy.goToProjectsList();
            const exportAnnotations3dRenameArchive = {
                projectName,
                as: 'exportAnnotations3dRenameArchive',
                type: 'annotations',
                dumpType: 'Datumaro 3D',
                archiveCustomName: 'export_project_3d_annotation',
            };
            cy.exportProject(exportAnnotations3dRenameArchive);
            cy.downloadExport().then((file) => {
                cy.verifyDownload(file);
            });
            cy.goBack();
        });

        // FIXME: Activate after implementation
        it.skip('Import dataset.', () => {
            cy.openProject(projectName);
            cy.deleteTask(task.name3d);
            cy.get('.cvat-tasks-list-item')
                .should('have.length', 1)
                .should('have.attr', 'style')
                .and('contain', 'pointer-events: none; opacity: 0.5;');
            cy.goToProjectsList();
            const importDataset = {
                projectName,
                format: 'Sly Point Cloud Format',
                archive: datasetArchiveName,
            };
            cy.importProject(importDataset);
            cy.verifyNotification();
            cy.openProject(projectName);
            cy.get('.cvat-tasks-list-item').should('have.length', 1);
        });
    });
});
