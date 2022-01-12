// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { projectName, labelName } from '../../support/const_project';

context('Backup, restore a project.', { browser: '!firefox' }, () => {
    const caseId = '114';

    const task = {
        name: `Case ${caseId}`,
        label: 'Tree',
        attrName: 'Kind',
        attrValue: 'Oak',
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

    let projectID = '';
    let projectBackupArchiveFullName;

    function getProjectID() {
        cy.contains('.cvat-project-name', projectName)
            .parents('.cvat-project-details')
            .should('have.attr', 'cvat-project-id')
            .then(($projectID) => {
                projectID = $projectID;
            });
    }

    const createRectangleShape2Points = {
        points: 'By 2 Points',
        type: 'Shape',
        labelName,
        firstX: 250,
        firstY: 350,
        secondX: 350,
        secondY: 450,
    };

    before(() => {
        cy.imageGenerator(imagesFolder, imageFileName, width, height, color, posX, posY, labelName, imagesCount);
        cy.createZipArchive(directoryToArchive, archivePath);
        cy.openProject(projectName);
        getProjectID();
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
        cy.openProject(projectName);
        cy.openTaskJob(task.name);
        cy.createRectangle(createRectangleShape2Points);
        cy.saveJob();
        cy.goToProjectsList();
    });

    after(() => {
        cy.goToProjectsList();
        cy.deleteProject(projectName, projectID);
    });

    describe(`Testing "${caseId}"`, () => {
        it('Export the project.', () => {
            cy.backupProject(projectName);
            cy.getDownloadFileName().then((file) => {
                projectBackupArchiveFullName = file;
                cy.verifyDownload(projectBackupArchiveFullName);
            });
        });

        it('Remove and restore the project from backup.', () => {
            cy.deleteProject(projectName, projectID);
            cy.intercept('POST', '/api/v1/projects/backup?**').as('importProject');
            cy.get('.cvat-import-project').click().find('input[type=file]').attachFile(projectBackupArchiveFullName);
            cy.wait('@importProject', { timeout: 5000 }).its('response.statusCode').should('equal', 202);
            cy.wait('@importProject').its('response.statusCode').should('equal', 201);
            cy.contains('Project has been created succesfully')
                .should('exist')
                .and('be.visible');
            cy.get('[data-icon="close"]').click(); // Close the notification
        });

        it('Checking the availability of a project, task, shape.', () => {
            cy.contains('.cvat-projects-project-item-title', projectName).should('exist');
            cy.openProject(projectName);
            getProjectID();
            cy.contains('.cvat-constructor-viewer-item', labelName).should('exist');
            cy.get('.cvat-tasks-list-item').should('have.length', 1);
            cy.openTaskJob(task.name, 0, false);
            cy.get('#cvat_canvas_shape_1').should('exist');
        });
    });
});
