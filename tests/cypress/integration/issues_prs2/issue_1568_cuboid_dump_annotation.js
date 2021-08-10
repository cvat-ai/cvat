// Copyright (C) 2020-2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, labelName } from '../../support/const';

context('Dump annotation if cuboid created.', () => {
    const issueId = '1568';
    const createCuboidShape2Points = {
        points: 'From rectangle',
        type: 'Shape',
        labelName: labelName,
        firstX: 250,
        firstY: 350,
        secondX: 350,
        secondY: 450,
    };
    const dumpType = 'Datumaro';

    before(() => {
        cy.openTaskJob(taskName);
    });

    describe(`Testing issue "${issueId}"`, () => {
        it('Create a cuboid.', () => {
            cy.createCuboid(createCuboidShape2Points);
        });

        it('Dump an annotation.', () => {
            cy.saveJob('PATCH', 200, `dump${dumpType}Format`);
            cy.intercept('GET', '/api/v1/tasks/**/annotations**').as('dumpAnnotations');
            cy.interactMenu('Export task dataset');
            cy.get('.cvat-modal-export-task').find('.cvat-modal-export-select').click();
            cy.get('.ant-select-dropdown')
                .not('.ant-select-dropdown-hidden')
                .contains('.cvat-modal-export-option-item', dumpType)
                .click();
            cy.get('.cvat-modal-export-select').should('contain.text', dumpType);
            cy.get('.cvat-modal-export-task').contains('button', 'OK').click();
            cy.wait('@dumpAnnotations', { timeout: 5000 }).its('response.statusCode').should('equal', 202);
            cy.wait('@dumpAnnotations').its('response.statusCode').should('equal', 201);
        });

        it('Error notification is not exists.', () => {
            cy.get('.ant-notification-notice').should('not.exist');
        });
    });
});
