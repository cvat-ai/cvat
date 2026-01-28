// Copyright (C) 2021-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context('Move a task between projects.', () => {
    const caseID = 94;
    const firstProject = {
        name: `First project case ${caseID}`,
        label: 'car',
        attrName: 'color',
        attrValue: 'red',
        multiAttrParams: false,
    };

    const secondProject = {
        name: `Second project case ${caseID}`,
        label: 'bicycle',
        attrName: 'color',
        attrValue: 'red',
        multiAttrParams: false,
    };

    const taskName = `Task case ${caseID}`;
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

    function checkTask(project, expectedResult) {
        cy.goToProjectsList();
        cy.openProject(project);
        cy.get('.cvat-tasks-list-item').should(expectedResult);
    }

    before(() => {
        cy.imageGenerator(
            imagesFolder,
            imageFileName,
            width,
            height,
            color,
            posX,
            posY,
            firstProject.label,
            imagesCount,
        );
        cy.createZipArchive(directoryToArchive, archivePath);
        cy.visit('/auth/login');
        cy.login();
    });

    beforeEach(() => {
        cy.goToProjectsList();
        cy.createProjects(
            firstProject.name,
            firstProject.label,
            firstProject.attrName,
            firstProject.attrValue,
            firstProject.multiAttrParams,
        );
        cy.createProjects(
            secondProject.name,
            secondProject.label,
            secondProject.attrName,
            secondProject.attrValue,
            secondProject.multiAttrParams,
        );
        cy.openProject(firstProject.name);
        cy.createAnnotationTask(
            taskName,
            firstProject.label,
            firstProject.attrName,
            firstProject.attrValue,
            archiveName,
            multiAttrParams,
            advancedConfigurationParams,
            forProject,
            attachToProject.no,
            firstProject.name,
        );
    });

    afterEach(() => {
        cy.goToProjectsList();
        cy.get('.cvat-spinner').should('not.exist');
        cy.openProject(firstProject.name);
        cy.deleteProjectViaActions(firstProject.name);
        cy.get('.cvat-spinner').should('not.exist');
        cy.openProject(secondProject.name);
        cy.deleteProjectViaActions(secondProject.name);
    });

    describe(`Testing "Case ${caseID}"`, () => {
        it('Check not able to move a task from one project to another.', () => {
            checkTask(secondProject.name, 'not.exist');
            checkTask(firstProject.name, 'exist');
            cy.contains('.cvat-item-open-task-actions', 'Actions').click();
            cy.get('.cvat-actions-menu')
                .should('be.visible')
                .find('[role="menuitem"]')
                .filter(':contains("Move to project")')
                .should('not.exist');
        });

        it.skip('Move a task between projects from a project.', () => {
            checkTask(secondProject.name, 'not.exist');
            checkTask(firstProject.name, 'exist');
            cy.movingTask(taskName, secondProject.name, firstProject.label, secondProject.label);
            checkTask(firstProject.name, 'not.exist');
            checkTask(secondProject.name, 'exist');
        });

        it.skip('Move a task between projects from task list.', () => {
            cy.goToTaskList();
            cy.movingTask(taskName, secondProject.name, firstProject.label, secondProject.label);
            checkTask(firstProject.name, 'not.exist');
            checkTask(secondProject.name, 'exist');
        });

        it.skip('Move a task between projects from a task.', () => {
            cy.goToTaskList();
            cy.openTask(taskName);
            cy.movingTask(taskName, secondProject.name, firstProject.label, secondProject.label, true);
            checkTask(firstProject.name, 'not.exist');
            checkTask(secondProject.name, 'exist');
        });
    });
});
