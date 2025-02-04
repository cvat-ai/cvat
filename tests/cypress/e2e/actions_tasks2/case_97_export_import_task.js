// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
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
        cy.visit('/auth/login');
        cy.login();
        cy.imageGenerator(imagesFolder, imageFileName, width, height, color, posX, posY, labelName, imagesCount);
        cy.createZipArchive(directoryToArchive, archivePath);
        cy.createAnnotationTask(taskName, labelName, attrName, textDefaultValue, archiveName);
        cy.openTask(taskName);
        cy.url().then((url) => {
            const [link] = url.split('?');
            taskId = Number(link.split('/').slice(-1)[0]);
        });
        cy.addNewLabel({ name: newLabelName });
        cy.openJob();
        cy.createRectangle(createRectangleShape2Points).then(() => {
            Cypress.config('scrollBehavior', false);
        });
        cy.get('#cvat_canvas_shape_1').trigger('mousemove');
        cy.get('#cvat_canvas_shape_1').trigger('mouseover');
        cy.get('#cvat_canvas_shape_1').should('have.class', 'cvat_canvas_shape_activated');
        cy.get('.svg_select_points_rot').should('be.visible').and('have.length', 1);
        cy.get('.svg_select_points_rot').trigger('mousemove');
        cy.get('.svg_select_points_rot').trigger('mouseover');
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
                .click();
            cy.get('.ant-dropdown')
                .not('.ant-dropdown-hidden')
                .within(() => {
                    cy.contains('[role="menuitem"]', new RegExp('^Backup Task$')).click();
                });
            cy.get('.cvat-modal-export-task').find('.cvat-modal-export-filename-input').type(archiveName);
            cy.get('.cvat-modal-export-task').contains('button', 'OK').click();
            cy.get('.cvat-notification-notice-export-backup-start').should('be.visible');
            cy.closeNotification('.cvat-notification-notice-export-backup-start');
            cy.downloadExport().then((file) => {
                taskBackupArchiveFullName = file;
                cy.verifyDownload(taskBackupArchiveFullName);
            });
            cy.goBack();
            cy.deleteTask(taskName);
        });

        it('Import the task. Check id, labels, shape.', () => {
            cy.intercept({ method: /PATCH|POST/, url: /\/api\/tasks\/backup.*/ }).as('importTask');
            cy.intercept({ method: /GET/, url: /\/api\/requests.*/ }).as('requestStatus');
            cy.get('.cvat-create-task-dropdown').click();
            cy.get('.cvat-import-task-button').click();
            cy.get('input[type=file]').attachFile(taskBackupArchiveFullName, { subjectType: 'drag-n-drop' });
            cy.get(`[title="${taskBackupArchiveFullName}"]`).should('be.visible');
            cy.contains('button', 'OK').click();
            cy.get('.cvat-notification-notice-import-backup-start').should('be.visible');
            cy.closeNotification('.cvat-notification-notice-import-backup-start');

            cy.wait('@importTask').its('response.statusCode').should('equal', 202);
            cy.wait('@importTask').its('response.statusCode').should('equal', 201);
            cy.wait('@importTask').its('response.statusCode').should('equal', 204);
            cy.wait('@requestStatus').its('response.statusCode').should('equal', 200);

            cy.contains('The task has been restored successfully. Click here to open').should('exist').and('be.visible');
            cy.closeNotification('.ant-notification-notice-info');
            cy.openTask(taskName);
            cy.url().then((url) => {
                const [link] = url.split('?');
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
