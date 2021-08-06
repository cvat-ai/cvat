// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, labelName } from '../../support/const';

context('Create a link for shape, frame.', () => {
    const caseId = '102';
    const createRectangleShape2Points = {
        points: 'By 2 Points',
        type: 'Shape',
        labelName: labelName,
        firstX: 250,
        firstY: 350,
        secondX: 350,
        secondY: 450,
    };

    before(() => {
        cy.openTaskJob(taskName);
        cy.createRectangle(createRectangleShape2Points);
        cy.saveJob('PATCH', 200, `case${caseId}`);
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Create a link for a shape, for a frame.', () => {
            cy.window().then(win => {
                cy.stub(win, 'prompt').returns(win.prompt).as('copyToClipboardPromptShape');
            });
            cy.get('#cvat-objects-sidebar-state-item-1').find('[aria-label="more"]').trigger('mouseover');
            cy.get('#cvat_canvas_shape_1').should('have.class', 'cvat_canvas_shape_activated')
            cy.get('.cvat-object-item-menu').last().should('be.visible').contains('button', 'Create object URL').click();
            cy.get('@copyToClipboardPromptShape').should('be.called');
            cy.get('@copyToClipboardPromptShape').then(prompt => {
                const url = prompt.args[0][1];
                expect(url).include('frame=');
                expect(url).include('type=');
                expect(url).include('serverID=');
                cy.visit(url);
                cy.closeModalUnsupportedPlatform();
                cy.get('.cvat-canvas-container').should('be.visible');
                cy.get('#cvat_canvas_shape_1').should('be.visible');
            });

            cy.window().then(win => {
                cy.stub(win, 'prompt').returns(win.prompt).as('copyToClipboardPromptFrame');
            });
            cy.get('.cvat-player-frame-url-icon').click();
            cy.get('@copyToClipboardPromptFrame').should('be.called');
            cy.get('@copyToClipboardPromptFrame').then(prompt => {
                const url = prompt.args[0][1];
                expect(url).include('frame=');
                expect(url).not.include('type=');
                expect(url).not.include('serverID=');
                cy.visit(url);
                cy.get('.cvat-canvas-container').should('be.visible');
                cy.get('#cvat_canvas_shape_1').should('be.visible');
            });
        });
    });
});
