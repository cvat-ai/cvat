// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { labelName, taskName } from '../../support/const';

context('Save filtered object in AAM.', () => {
    const caseId = '99';
    const newLabelName = `New label for case ${caseId}`;
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
        cy.openTask(taskName);
        cy.addNewLabel(newLabelName);
        cy.openJob();
        cy.createCuboid(createCuboidShape2Points);
    });

    describe(`Testing case "${caseId}"`, () => {
        it(`Set filter label == “${labelName}”.`, () => {
            cy.addFiltersRule(0);
            cy.setFilter({
                groupIndex: 0,
                ruleIndex: 0,
                field: 'Label',
                operator: '==',
                value: labelName,
                submit: true,
            });
        });

        it(`Go to AAM and change a label for the shape. Save the changes. UI is not failed.`, () => {
            cy.changeWorkspace('Attribute annotation');
            cy.changeLabelAAM(newLabelName);
            cy.saveJob();
            cy.get('#cvat_canvas_shape_1').should('not.exist');
            cy.get('.attribute-annotations-sidebar-not-found-wrapper').should('exist');
        });
    });
});
