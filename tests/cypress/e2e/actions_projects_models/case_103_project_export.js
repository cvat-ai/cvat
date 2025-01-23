// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { projectName, labelName } from '../../support/const_project';

context('Export project dataset.', { browser: '!firefox' }, () => {
    const caseID = 103;
    const task = {
        name: `Case ${caseID}`,
        label: 'Tree',
        attrName: 'Kind',
        attrValue: 'Oak',
        nameSecond: `Case ${caseID} second`,
        labelSecond: 'Car',
        attrNameSecons: 'Color',
        attrValueSecond: 'Red',
        multiAttrParams: false,
        advancedConfigurationParams: false,
        forProject: true,
        attachToProject: false,
    };
    const imagesCount = 1;
    const imageFileName = `image_${task.name.replace(' ', '_').toLowerCase()}`;
    const width = 800;
    const height = 800;
    const posX = 10;
    const posY = 10;
    const color = 'gray';
    const archiveName = `${imageFileName}.zip`;
    const archivePath = `cypress/fixtures/${archiveName}`;
    const imagesFolder = `cypress/fixtures/${imageFileName}`;
    const directoryToArchive = imagesFolder;

    let datasetArchiveName;

    function checkCounTasksInXML(projectParams, expectedCount) {
        cy.exportProject(projectParams);
        cy.downloadExport().then((file) => {
            cy.verifyDownload(file);
        });
        cy.unpackZipArchive(`cypress/fixtures/${projectParams.archiveCustomName}.zip`);
        cy.readFile('cypress/fixtures/annotations.xml').should('exist').then((xml) => {
            const tasks = Cypress.$(Cypress.$.parseXML(xml)).find('task').find('name');
            expect(tasks.length).to.be.eq(expectedCount);
        });
        cy.goBack();
    }

    before(() => {
        cy.imageGenerator(imagesFolder, imageFileName, width, height, color, posX, posY, labelName, imagesCount);
        cy.createZipArchive(directoryToArchive, archivePath);
        cy.openProject(projectName);
        cy.createAnnotationTask(
            task.nameSecond,
            task.labelSecond,
            task.attrNameSecond,
            task.attrValueSecond,
            archiveName,
            task.multiAttrParams,
            task.advancedConfigurationParams,
            task.forProject,
            task.attachToProject,
            projectName,
        );
        cy.openProject(projectName);
        cy.createAnnotationTask(
            task.name,
            task.label,
            task.attrName,
            task.attrValue,
            archiveName,
            task.multiAttrParams,
            task.advancedConfigurationParams,
            task.forProject,
            task.attachToProject,
            projectName,
        );
    });

    after(() => {
        cy.logout();
        cy.getAuthKey().then((authKey) => {
            cy.deleteProjects(authKey, [projectName]);
        });
    });

    describe(`Testing "Case ${caseID}"`, () => {
        it('Export project dataset. Annotation.', () => {
            cy.goToProjectsList();
            const exportAnnotation = {
                projectName,
                as: 'exportAnnotations',
                type: 'annotations',
                dumpType: 'CVAT for images',
            };
            cy.exportProject(exportAnnotation);
            cy.downloadExport().then((file) => {
                cy.verifyDownload(file);
            });
            cy.goBack();
        });

        it('Export project dataset. Dataset.', () => {
            cy.goToProjectsList();
            const exportDataset = {
                projectName,
                as: 'exportDataset',
                type: 'dataset',
                dumpType: 'CVAT for images',
            };
            cy.exportProject(exportDataset);
            cy.downloadExport().then((file) => {
                cy.verifyDownload(file);
                datasetArchiveName = file;
            });
            cy.goBack();
        });

        it('Export project dataset. Annotation. Rename an archive.', () => {
            cy.goToProjectsList();
            const exportAnnotationsRenameArchive = {
                projectName,
                as: 'exportAnnotationsRenameArchive',
                type: 'annotations',
                dumpType: 'CVAT for images',
                archiveCustomName: 'export_project_annotation',
            };
            // Check issue 3810
            checkCounTasksInXML(exportAnnotationsRenameArchive, 2);
            cy.openProject(projectName);
            cy.deleteTask(task.nameSecond);
            cy.goToProjectsList();
            checkCounTasksInXML(exportAnnotationsRenameArchive, 1);
        });

        it('Import dataset.', () => {
            cy.openProject(projectName);
            cy.deleteTask(task.name);
            cy.get('.cvat-tasks-list-item')
                .should('have.length', 1)
                .should('have.attr', 'style')
                .and('contain', 'pointer-events: none; opacity: 0.5;');
            cy.goToProjectsList();
            const importDataset = {
                projectName,
                format: 'CVAT 1.1',
                archive: datasetArchiveName,
            };
            cy.importProject(importDataset);
            cy.verifyNotification();
            cy.openProject(projectName);
            cy.get('.cvat-tasks-list-item').should('have.length', 1);
        });

        it('Import dataset to project without labels.', () => {
            // Deleting the task
            cy.get('.cvat-item-task-name').then((name) => {
                cy.deleteTask(name.text());
            });
            cy.get('.cvat-tasks-list-item')
                .should('have.length', 1)
                .should('have.attr', 'style')
                .and('contain', 'pointer-events: none; opacity: 0.5;');
            // Deleting the label
            cy.get('.cvat-constructor-viewer-item')
                .should('have.length', 1)
                .find('[aria-label="delete"]')
                .click();
            cy.get('.cvat-modal-delete-label')
                .contains('button', 'OK')
                .click();
            cy.get('.cvat-modal-delete-label').should('not.exist');
            cy.goToProjectsList();
            const importDataset = {
                projectName,
                format: 'CVAT 1.1',
                archive: datasetArchiveName,
            };
            cy.importProject(importDataset);
            cy.verifyNotification();
            cy.openProject(projectName);
            cy.get('.cvat-tasks-list-item').should('have.length', 1);
            cy.get('.cvat-constructor-viewer-item')
                .should('have.length', 1)
                .should('have.text', labelName);
        });
    });
});
