// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, labelName } from '../../support/const';

Cypress.automation('remote:debugger:protocol', {
    command: 'Browser.grantPermissions',
    params: {
        permissions: ['clipboardReadWrite', 'clipboardSanitizedWrite'],
        origin: window.location.origin,
    },
});

context('Create a link for shape, frame.', () => {
    const caseId = '102';
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
        cy.openTaskJob(taskName);
        cy.createRectangle(createRectangleShape2Points);
        cy.saveJob('PATCH', 200, `case${caseId}`);
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Create a link for a shape.', () => {
            cy.window()
                .its('navigator.clipboard')
                .then((clipboard) => {
                    cy.spy(clipboard, 'writeText').as('copyTextToClipboard');
                });

            cy.interactAnnotationObjectMenu('#cvat-objects-sidebar-state-item-1', 'Create object URL');
            cy.get('@copyTextToClipboard').should('be.called');
            cy.get('@copyTextToClipboard').then((stub) => {
                const url = stub.args[0][0];
                expect(url).include('frame=');
                expect(url).include('type=');
                expect(url).include('serverID=');
                cy.visit(url);
                cy.get('.cvat-canvas-container').should('be.visible');
                cy.get('#cvat_canvas_shape_1').should('be.visible');
            });
        });

        it('Create a link for a frame.', () => {
            cy.window()
                .its('navigator.clipboard')
                .then((clipboard) => {
                    cy.spy(clipboard, 'writeText').as('copyTextToClipboard');
                });

            cy.get('.cvat-player-frame-url-icon').click();
            cy.get('@copyTextToClipboard').should('be.called');
            cy.get('@copyTextToClipboard').then((stub) => {
                const url = stub.args[0][0];
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
