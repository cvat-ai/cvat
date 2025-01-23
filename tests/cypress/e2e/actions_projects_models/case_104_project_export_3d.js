// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { projectName, labelName } from '../../support/const_project';

context('Export project dataset with 3D task.', { browser: '!firefox' }, () => {
    const caseID = 104;
    const task = {
        name3d: `Case ${caseID}`,
        label3d: labelName,
        attrName3d: 'Kind',
        attrValue3d: 'Oak',
        archiveName: '../../cypress/e2e/canvas3d_functionality/assets/test_canvas3d.zip',
        advancedConfigurationParams: false,
        forProject: true,
        attachToProject: false,
        multiAttrParams: false,
    };
    let projectID = '';
    let datasetArchiveName;

    function getProjectID() {
        cy.url().then((url) => {
            projectID = Number(url.split('/').slice(-1)[0].split('?')[0]);
        });
    }

    before(() => {
        cy.openProject(projectName);
        getProjectID();
        cy.createAnnotationTask(
            task.name3d,
            task.label3d,
            task.attrName3d,
            task.attrValue3d,
            task.archiveName,
            task.multiAttrParams,
            task.advancedConfigurationParams,
            task.forProject,
            task.attachToProject,
            projectName,
        );
    });

    after(() => {
        cy.goToProjectsList();
        cy.deleteProject(projectName, projectID);
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
