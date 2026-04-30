// Copyright (C) 2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

// The test is disabled for Firefox because the "Cypress Real Events" plugin work only in the chromium-based browser.
context('Paste labels from one task to another.', { browser: '!firefox' }, () => {
    const caseID = '117';
    let copiedLabels = '';
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

    function pasteIntoRawLabels(rawLabels) {
        cy.get('.cvat-raw-labels-viewer').should('exist');
        cy.get('.cvat-raw-labels-viewer').clear();
        cy.get('.cvat-raw-labels-viewer').trigger('paste', {
            clipboardData: {
                getData: (type) => (type === 'text' ? rawLabels : ''),
            },
            eventConstructor: 'ClipboardEvent',
        });
    }

    before(() => {
        cy.visit('/auth/login');
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
        cy.task('getAuthHeaders').then((authHeaders) => {
            cy.deleteTasks(authHeaders, [task.name, task.nameSecond]);
        });
    });

    describe(`Testing "Case ${caseID}"`, () => {
        it('Copying a label from a task via the raw editor.', () => {
            cy.openTask(task.name);
            cy.contains('[role="tab"]', 'Raw').click();
            cy.get('.cvat-raw-labels-viewer').invoke('val').then((value) => {
                copiedLabels = String(value);
            });
        });

        it('Paste the labels to another task instead of existing.', () => {
            cy.goToTaskList();
            cy.openTask(task.nameSecond);
            cy.contains('.cvat-constructor-viewer-item', task.labelSecond).should('exist');
            cy.contains('[role="tab"]', 'Raw').click();
            // Trigger the raw editor's paste handler directly instead of relying
            // on native clipboard shortcuts, which are flaky in CI. This keeps
            // the UI in charge of stripping IDs from pasted label JSON.
            pasteIntoRawLabels(copiedLabels);
            cy.get('.cvat-raw-labels-viewer').invoke('val').should('not.contain', '"id":');
            cy.intercept('PATCH', '/api/tasks/**').as('patchTaskLabels');
            cy.contains('button', 'Done').click();
            cy.get('.cvat-modal-confirm-remove-existing-labels').should('be.visible').within(() => {
                cy.get('.cvat-modal-confirm-content-remove-existing-labels').should('have.text', task.labelSecond);
                cy.get('.cvat-modal-confirm-content-remove-existing-attributes')
                    .should('have.text', task.attrNameSecond);
                cy.contains('button', 'Delete existing data').click();
            });
            cy.wait('@patchTaskLabels').its('response.statusCode').should('equal', 200);
            cy.get('.cvat-modal-confirm-remove-existing-labels').should('not.exist');
            cy.get('.cvat-spinner').should('not.exist');
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
