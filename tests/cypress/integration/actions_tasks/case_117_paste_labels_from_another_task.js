// Copyright (C) 2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

// The test is disabled for Firefox because the "Cypress Real Events" plugin work only in the chromium-based browser.
context('Paste labels from one task to another.', { browser: '!firefox' }, () => {
    const caseID = '117';
    const task = {
        name: `Case ${caseID}`,
        label: 'Tree',
        attrName: 'Kind',
        attrValue: 'Oak',
        nameSecond: `Case ${caseID} second`,
        labelSecond: 'Car',
        attrNameSecond: 'Color',
        attrValueSecond: 'Red',
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

    before(() => {
        cy.visit('/');
        cy.login();
        cy.imageGenerator(imagesFolder, imageFileName, width, height, color, posX, posY, task.name, imagesCount);
        cy.createZipArchive(directoryToArchive, archivePath);
        cy.goToTaskList();
        cy.createAnnotationTask(task.name, task.label, task.attrName, task.attrValue, archiveName);
        cy.createAnnotationTask(
            task.nameSecond, task.labelSecond, task.attrNameSecond, task.attrValueSecond, archiveName,
        );
    });

    after(() => {
        cy.logout();
        cy.getAuthKey().then((authKey) => {
            cy.deleteTasks(authKey, [task.name, task.nameSecond]);
        });
    });

    describe(`Testing "Case ${caseID}"`, () => {
        it('Copying a label from a task via the raw editor.', () => {
            cy.openTask(task.name);
            cy.contains('[role="tab"]', 'Raw').click();
            cy.get('.cvat-raw-labels-viewer')
                .focus()
                .realPress(['ControlLeft', 'a'])
                .realPress(['ControlLeft', 'c']);
        });

        it('Paste the labels to another task instead of existing.', () => {
            cy.goToTaskList();
            cy.openTask(task.nameSecond);
            cy.contains('.cvat-constructor-viewer-item', task.labelSecond).should('exist');
            cy.contains('[role="tab"]', 'Raw').click();
            cy.get('.cvat-raw-labels-viewer')
                .focus()
                .clear()
                .realPress(['ControlLeft', 'v']);
            cy.get('.cvat-raw-labels-viewer').then((raw) => {
                expect(raw.text()).not.contain('"id":');
            });
            cy.contains('button', 'Done').click();
            cy.get('.cvat-modal-confirm-remove-existing-labels').should('be.visible').within(() => {
                cy.get('.cvat-modal-confirm-content-remove-existing-labels').should('have.text', task.labelSecond);
                cy.get('.cvat-modal-confirm-content-remove-existing-attributes')
                    .should('have.text', task.attrNameSecond);
                cy.contains('button', 'Delete existing data').click();
            });
            cy.get('.cvat-modal-confirm-remove-existing-labels').should('not.exist');
            cy.get('.cvat-raw-labels-viewer').then((raw) => {
                expect(raw.text()).contain('"id":');
            });
            cy.contains('[role="tab"]', 'Constructor').click();
            cy.get('.cvat-constructor-viewer-item').should('have.length', 1);
            cy.contains('.cvat-constructor-viewer-item', task.label).should('exist');
            cy.contains('.cvat-constructor-viewer-item', task.labelSecond).should('not.exist');
        });
    });
});
