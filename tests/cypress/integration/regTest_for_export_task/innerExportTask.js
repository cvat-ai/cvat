// Start writing your Cypress tests below!
// If you're unfamiliar with how Cypress works,
// check out the link below and learn how to write your first test:
// https://on.cypress.io/writing-first-test

/// <reference types="cypress" />

Cypress.Commands.add('exportInnerTask', ({
    taskName,
    archiveCustomName,
    order,
    imageClick = false,
}) => {
    const orderId = Number.isNaN(parseInt(order, 10)) ? 0 : parseInt(order, 10);
    const archFileNameFin = `${orderId}_${archiveCustomName}_${taskName}`;
    cy.get('.cvat-task-page-actions-button')
        .trigger('mouseover');
    cy.get('.ant-dropdown')
        .not('.ant-dropdown-hidden')
        .within(() => {
            cy.contains('[role="menuitem"]', new RegExp('^Export task dataset$')).click();
        });
    cy.get('.cvat-modal-export-task')
        .should('be.visible')
        .find('.cvat-modal-export-select')
        .click();
    cy.get('.cvat-modal-export-option-item')
        .eq(orderId)
        .click();
    cy.get('.cvat-modal-export-task')
        .find('.cvat-modal-export-filename-input')
        .type(archFileNameFin);

    if (imageClick) {
        cy.get('.cvat-modal-export-save-images').click();
    }

    cy.get('.cvat-modal-export-task').contains('button', 'OK').click();

    cy.get('.cvat-notification-notice-export-task-start').should('be.visible');
    cy.closeNotification('.cvat-notification-notice-export-task-start');
    cy.getDownloadFileName().then((file) => {
        cy.verifyDownload(file);
        cy.get('.ant-notification-notice-info').first().should('be.visible');
        cy.closeNotification('.ant-notification-notice-info');
    });
});

context('Export task inner.', { browser: '!firefox' }, () => {
    const caseId = '999';
    const labelName = 'block';
    const taskName = `Case test inner ${caseId}`;
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
    const exportOrders = [0, 1, 2];

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
        cy.addNewLabel(newLabelName);
        cy.openJob();
        cy.createRectangle(createRectangleShape2Points).then(() => {
            Cypress.config('scrollBehavior', false);
        });
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
        cy.get('.cvat-canvas-container').trigger('mousemove', 340, 150);
        cy.get('.cvat-canvas-container').trigger('mouseup');
        cy.get('#cvat_canvas_shape_1').should('have.attr', 'transform');
        cy.saveJob();
        cy.goToTaskList();
    });

    after(() => {
        cy.goToTaskList();
        cy.deleteTask(taskName);
    });

    describe(`Testing "${taskName}"`, () => {
        it('Open a task', () => {
            cy.openTask(taskName);
        });

        const archiveCustomName = 'file';
        exportOrders.forEach(
            (ord) => {
                const parms = {
                    taskName,
                    archiveCustomName,
                    ord,
                    imageClick: false,
                };

                it(`Export a task without image, number ${ord}`, () => {
                    cy.exportInnerTask(parms); // without image
                });

                it(`Export a task with image, number ${ord}`, () => {
                    cy.exportInnerTask({ ...parms, imageClick: true }); // with image
                });
            },
        );
    });
});
