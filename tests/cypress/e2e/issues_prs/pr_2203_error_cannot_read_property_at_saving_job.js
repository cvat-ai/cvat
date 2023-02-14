// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, labelName } from '../../support/const';

context('Check error cannot read property at saving job', () => {
    const prId = '2203';
    const createRectangleShape2Points = {
        points: 'By 2 Points',
        type: 'Shape',
        labelName,
        firstX: 100,
        firstY: 100,
        secondX: 300,
        secondY: 300,
    };

    before(() => {
        cy.openTaskJob(taskName);
    });

    describe(`Testing pr "${prId}"`, () => {
        it('Create an object in first frame', () => {
            cy.createRectangle(createRectangleShape2Points);
        });

        it('Go to next frame and create an object in second frame', () => {
            cy.get('.cvat-player-next-button').click();
            cy.createRectangle(createRectangleShape2Points);
        });

        it('Go to AAM', () => {
            cy.changeWorkspace('Attribute annotation');
            cy.changeLabelAAM(labelName);
        });

        it('Save job and go to previous frame at saving job', () => {
            cy.intercept('PATCH', '/api/jobs/**').as('saveJob');
            cy.saveJob();
            cy.get('body').type('d');
            cy.wait('@saveJob').its('response.statusCode').should('equal', 200);
        });

        it('Page with the error is missing', () => {
            cy.get('.cvat-global-boundary').should('not.exist');
        });
    });
});
