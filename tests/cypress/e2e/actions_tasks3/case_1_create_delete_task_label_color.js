// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context('Create and delete a annotation task. Color collision.', () => {
    const caseId = '1';
    const labelName = 'adaf';
    const taskName = `New annotation task for Case ${caseId}`;
    const attrName = `Attr for Case ${caseId}`;
    const textDefaultValue = 'Some default value for type Text';
    const imagesCount = 1;
    const imageFileName = 'image_case_1';
    const width = 800;
    const height = 800;
    const posX = 10;
    const posY = 10;
    const color = 'gray';
    const archiveName = `${imageFileName}.zip`;
    const archivePath = `cypress/fixtures/${archiveName}`;
    const imagesFolder = `cypress/fixtures/${imageFileName}`;
    const directoryToArchive = imagesFolder;
    const newLabelName = 'adia';

    before(() => {
        cy.visit('/auth/login');
        cy.login();
        cy.imageGenerator(imagesFolder, imageFileName, width, height, color, posX, posY, labelName, imagesCount);
        cy.createZipArchive(directoryToArchive, archivePath);
    });

    describe(`Testing "Case ${caseId}"`, () => {
        it('Create a task.', () => {
            cy.createAnnotationTask(taskName, labelName, attrName, textDefaultValue, archiveName);
        });

        it('Add a label. Check labels color.', () => {
            cy.openTask(taskName);
            cy.addNewLabel({ name: newLabelName });
            cy.get('.cvat-constructor-viewer-item').first().then((firstLabel) => {
                cy.get('.cvat-constructor-viewer-item').last().then((secondLabel) => {
                    expect(firstLabel.attr('style')).not.equal(secondLabel.attr('style'));
                });
            });
        });

        it('Delete the created task.', () => {
            cy.goToTaskList();
            cy.deleteTask(taskName);
        });

        it('Deleted task not exist.', () => {
            cy.contains('strong', taskName)
                .parents('.cvat-tasks-list-item')
                .should('have.attr', 'style')
                .and('contain', 'pointer-events: none; opacity: 0.5;');
        });
    });
});
