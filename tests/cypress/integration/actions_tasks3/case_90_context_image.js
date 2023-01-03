// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context('Context images for 2D tasks.', () => {
    const caseId = '90';
    const labelName = `Case ${caseId}`;
    const taskName = `New annotation task for ${labelName}`;
    const attrName = `Attr for ${labelName}`;
    const textDefaultValue = 'color';
    const pathToArchive = `../../${__dirname}/assets/case_90/case_90_context_image.zip`;
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
        cy.createAnnotationTask(taskName, labelName, attrName, textDefaultValue, pathToArchive);
        cy.openTaskJob(taskName);
    });

    after(() => {
        cy.goToTaskList();
        cy.deleteTask(taskName);
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Check a context image.', () => {
            cy.get('.cvat-context-image-wrapper').should('exist').and('be.visible');
            cy.get('.cvat-player-next-button').click();
            cy.get('.cvat-context-image').should('exist').and('be.visible'); // Check a context image on the second frame
            cy.get('.cvat-player-previous-button').click();
        });

        it('Checking issue "Context image disappears after undo/redo".', () => {
            cy.createRectangle(createRectangleShape2Points);
            cy.contains('.cvat-annotation-header-button', 'Undo').click();
            cy.get('.cvat-context-image').should('have.attr', 'src');
            cy.get('#cvat_canvas_shape_1').should('not.exist');
            cy.contains('.cvat-annotation-header-button', 'Redo').click();
            cy.get('.cvat-context-image').should('have.attr', 'src');
            cy.get('#cvat_canvas_shape_1').should('exist');
        });
    });
});
