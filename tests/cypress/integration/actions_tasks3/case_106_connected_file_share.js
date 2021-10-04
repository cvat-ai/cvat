// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context('Connected file share.', () => {
    const caseId = '106';
    const taskName = `Case ${caseId}`;
    const labelName = taskName;

    const imagesCount = 3;
    const imageFileName = `image_${labelName.replace(' ', '_').toLowerCase()}`;
    const width = 800;
    const height = 800;
    const posX = 10;
    const posY = 10;
    const color = 'gray';
    const imagesFolder = `cypress/fixtures/${imageFileName}`;

    before(() => {
        cy.imageGenerator(imagesFolder, imageFileName, width, height, color, posX, posY, labelName, imagesCount);
        cy.visit('auth/login');
        cy.login();
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Create a task with "Connected file share".', () => {
            cy.get('#cvat-create-task-button').should('be.visible').click();
            cy.get('#name').type(taskName);
            cy.addNewLabel(labelName);
            cy.contains('[role="tab"]', 'Connected file share').click();
            cy.get('.cvat-share-tree').should('be.visible');
        });
    });
});
