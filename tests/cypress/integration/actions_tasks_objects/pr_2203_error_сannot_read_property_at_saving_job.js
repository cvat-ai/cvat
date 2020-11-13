// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, labelName } from '../../support/const';

context('Check error сannot read property at saving job', () => {

    const prId = '2203';
    const createRectangleShape2Points = {
        points: 'By 2 Points',
        type: 'Shape',
        switchLabel: false,
        firstX: 100,
        firstY: 100,
        secondX: 300,
        secondY: 300,
    };

    before(() => {
        cy.openTaskJob(taskName);
    });

    after('Go to task list', () => {
        cy.removeAnnotations();
        cy.saveJob();
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
            cy.changeWorkspace('Attribute annotation', labelName);
        });

        it('Save job and go to previous frame at saving job', () => {
            cy.saveJob();
            cy.get('body').type('d');
        });

        it('Page with the error is missing', () => {
            cy.wait(100);
            cy.contains('Oops, something went wrong').should('not.exist');
        });
    });
});