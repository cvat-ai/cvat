// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context('Export, import an annotation task.', { browser: '!firefox' }, () => {
    const caseId = '97';
    const labelName = 'car';
    const taskName = `Case ${caseId}`;
    const attrName = 'color';
    const textDefaultValue = 'red';
    const imagesCount = 1;
    const imageFileName = `image_${taskName.replace(/\s+/g, '_').toLowerCase()}`;
    const width = 800;
    const height = 800;
    const posX = 10;
    const posY = 10;
    const color = 'gray';
    const archiveName = `${imageFileName}.zip`;
    const archivePath = `cypress/fixtures/${archiveName}`;
    const imagesFolder = `cypress/fixtures/${imageFileName}`;
    const directoryToArchive = imagesFolder;
    const newLabelName = 'person';
    let taskId;
    let taskBackupArchiveShortName = `task_${taskName.toLowerCase()}_backup`;
    let taskBackupArchiveFullName;

    const createPointsShape = {
        type: 'Shape',
        labelName: labelName,
        pointsMap: [
            { x: 200, y: 200 },
            { x: 250, y: 200 },
            { x: 250, y: 250 },
        ],
        complete: true,
        numberOfPoints: null,
    };

    before(() => {
        cy.visit('auth/login');
        cy.login();
        cy.imageGenerator(imagesFolder, imageFileName, width, height, color, posX, posY, labelName, imagesCount);
        cy.createZipArchive(directoryToArchive, archivePath);
        cy.createAnnotationTask(taskName, labelName, attrName, textDefaultValue, archiveName);
        cy.openTask(taskName);
        cy.url().then((link) => {
            taskId = Number(link.split('/').slice(-1)[0]);
        });
        cy.addNewLabel(newLabelName);
        cy.openJob();
        cy.createPoint(createPointsShape);
        cy.saveJob();
        cy.goToTaskList();
    });

    after(() => {
        cy.goToTaskList();
        cy.deleteTask(taskName);
    });

    describe(`Testing "${taskName}"`, () => {
        it('Export a task.', () => {
            cy.contains('.cvat-item-task-name', taskName)
                .parents('.cvat-tasks-list-item')
                .find('.cvat-item-open-task-actions > .cvat-menu-icon')
                .trigger('mouseover');
            cy.intercept('GET', '/api/v1/tasks/**?action=export').as('exportTask');
            cy.get('.ant-dropdown')
                .not('.ant-dropdown-hidden')
                .within(() => {
                    cy.contains('[role="menuitem"]', new RegExp('^Export task$')).click().trigger('mouseout');
                });
            cy.wait('@exportTask', { timeout: 5000 }).its('response.statusCode').should('equal', 202);
            cy.wait('@exportTask').its('response.statusCode').should('equal', 201);
            cy.deleteTask(taskName);
            cy.task('listFiles', 'cypress/fixtures').each((fileName) => {
                if (fileName.includes(taskBackupArchiveShortName)) {
                    taskBackupArchiveFullName = fileName;
                }
            });
        });

        it('Import the task. Check id, labels, shape.', () => {
            cy.intercept('POST', '/api/v1/tasks?action=import').as('importTask');
            cy.get('.cvat-import-task').click().find('input[type=file]').attachFile(taskBackupArchiveFullName);
            cy.wait('@importTask', { timeout: 5000 }).its('response.statusCode').should('equal', 202);
            cy.wait('@importTask').its('response.statusCode').should('equal', 201);
            cy.contains('Task has been imported succesfully').should('exist').and('be.visible');
            cy.openTask(taskName);
            cy.url().then((link) => {
                expect(Number(link.split('/').slice(-1)[0])).to.be.equal(taskId + 1);
            });
            cy.get('.cvat-constructor-viewer-item').then((labels) => {
                expect(labels.length).to.be.equal(2);
            });
            cy.openJob(0, false);
            cy.get('#cvat_canvas_shape_1').should('exist');
            cy.get('#cvat-objects-sidebar-state-item-1').should('exist');
        });
    });
});
