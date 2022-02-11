// Copyright (C) 2021-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { projectName, labelName } from '../../support/const_project';

context('Delete a label from a project.', () => {
    const caseID = 57;
    const taskName = `Task case ${caseID}`;
    const attrName = `Attr for ${labelName}`;
    const textDefaultValue = 'Some value for type Text';
    const imagesCount = 1;
    const imageFileName = `image_${taskName.replace(/\s+/g, '_').toLowerCase()}`;
    const width = 800;
    const height = 800;
    const posX = 10;
    const posY = 10;
    const color = 'white';
    const archiveName = `${imageFileName}.zip`;
    const archivePath = `cypress/fixtures/${archiveName}`;
    const imagesFolder = `cypress/fixtures/${imageFileName}`;
    const directoryToArchive = imagesFolder;
    const advancedConfigurationParams = false;
    const forProject = true;
    const attachToProject = false;
    const multiAttrParams = false;
    let projectID = '';

    function getProjectID() {
        cy.contains('.cvat-project-name', projectName)
            .parents('.cvat-project-details')
            .should('have.attr', 'cvat-project-id')
            .then(($projectID) => {
                projectID = $projectID;
            });
    }

    before(() => {
        cy.imageGenerator(imagesFolder, imageFileName, width, height, color, posX, posY, labelName, imagesCount);
        cy.createZipArchive(directoryToArchive, archivePath);
        cy.openProject(projectName);
    });

    after(() => {
        cy.goToProjectsList();
        cy.deleteProject(projectName, projectID);
    });

    describe(`Testing "Case ${caseID}"`, () => {
        it('Create a task from project.', () => {
            cy.createAnnotationTask(
                taskName,
                labelName,
                attrName,
                textDefaultValue,
                archiveName,
                multiAttrParams,
                advancedConfigurationParams,
                forProject,
                attachToProject,
                projectName,
            );
        });

        it('Delete a label from project.', () => {
            cy.openProject(projectName);
            getProjectID(projectName);
            cy.deleteLabel(labelName);
        });

        it('Try to open job with no labels in the project. Successful.', () => {
            cy.openTaskJob(taskName);
            cy.get('.cvat-disabled-canvas-control').should('exist');
            cy.contains('.cvat-notification-no-labels', 'does not contain any label').should('exist').and('be.visible');
        });
    });
});
