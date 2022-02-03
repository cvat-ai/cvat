// Copyright (C) 2021-2022 Intel Corporation
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
    let taskBackupArchiveFullName;
    let ctmBeforeExport;

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
        cy.createRectangle(createRectangleShape2Points);
        cy.get('#cvat_canvas_shape_1')
            .trigger('mousemove')
            .trigger('mouseover')
            .should('have.class', 'cvat_canvas_shape_activated');
        cy.get('.svg_select_points_rot')
            .should('be.visible')
            .and('have.length', 1)
            .trigger('mousemove')
            .trigger('mouseover');
        cy.get('.svg_select_points_rot').trigger('mousedown', { button: 0 });
        cy.get('.cvat-canvas-container').trigger('mousemove', 350, 150);
        cy.get('.cvat-canvas-container').trigger('mouseup');
        cy.get('#cvat_canvas_shape_1').should('have.attr', 'transform');
        cy.document().then((doc) => {
            ctmBeforeExport = doc.getElementById('cvat_canvas_shape_1').getCTM();
        });
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
            cy.get('.ant-dropdown')
                .not('.ant-dropdown-hidden')
                .within(() => {
                    cy.contains('[role="menuitem"]', new RegExp('^Backup Task$')).click().trigger('mouseout');
                });
            cy.getDownloadFileName().then((file) => {
                taskBackupArchiveFullName = file;
                cy.verifyDownload(taskBackupArchiveFullName);
            });
            cy.deleteTask(taskName);
        });

        it('Import the task. Check id, labels, shape.', () => {
            cy.intercept('POST', '/api/tasks/backup?**').as('importTask');
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
            cy.get('#cvat-objects-sidebar-state-item-1').should('exist');

            // Check fix 3932 "Rotation property is not dumped when backup a task"
            cy.get('#cvat_canvas_shape_1')
                .should('be.visible')
                .and('have.attr', 'transform');
            cy.document().then((doc) => {
                const ctmAfterImport = doc.getElementById('cvat_canvas_shape_1').getCTM();
                expect(ctmAfterImport).to.deep.eq(ctmBeforeExport);
            });
        });
    });
});
