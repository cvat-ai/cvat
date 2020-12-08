// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, labelName } from '../../support/const';

context('Dump annotation if cuboid created', () => {
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

    before(() => {
        cy.openTaskJob(taskName);
    });

    after('Go to task list', () => {
        cy.removeAnnotations();
        cy.saveJob();
    });

    describe(`Testing issue "${issueId}"`, () => {
        it('Create a cuboid', () => {
            cy.createCuboid(createCuboidShape2Points);
            cy.get('#cvat-objects-sidebar-state-item-1').should('contain', '1').and('contain', 'CUBOID SHAPE');
        });
        it('Dump an annotation', () => {
            cy.get('.cvat-annotation-header-left-group').within(() => {
                cy.saveJob();
                cy.get('button').contains('Menu').trigger('mouseover', { force: true });
            });
            cy.get('.cvat-annotation-menu').within(() => {
                cy.get('[title="Dump annotations"]').trigger('mouseover');
            });
            cy.get('.cvat-menu-dump-submenu-item').within(() => {
                cy.contains('Datumaro').click();
            });
            cy.wait(3000);
        });
        it('Error notification is not exists', () => {
            cy.get('.ant-notification-notice').should('not.exist');
        });
    });
});
