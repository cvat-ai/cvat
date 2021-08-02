// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { labelName, taskName } from '../../support/const';

context('Save filtered object in AAM.', () => {
    const caseId = '99';
    const newLabelName = `New label for case ${caseId}`;
    let secondLabel = '';
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
        cy.document().then((doc) => {
            // Getting list of labels and create a label if neccessary
            const labelsList = Array.from(doc.querySelectorAll('.cvat-constructor-viewer-item'));
            if (labelsList.length < 2) {
                cy.addNewLabel(newLabelName);
            }
        });
        cy.document().then((doc) => {
            // Getting list of labels again
            const labelsList = Array.from(doc.querySelectorAll('.cvat-constructor-viewer-item'));
            for (let i = 0; i < labelsList.length; i++) {
                if (labelsList[i].innerText === labelName) {
                    cy.get(labelsList[i]).then(($el) => {
                        // If "labelName" is not first in the labels list and previous element is not "Add label" button than getting previous label
                        if ($el.prev().length !== 0 && ! $el.prev().hasClass('cvat-constructor-viewer-new-item')) {
                            secondLabel = $el.prev().text();
                        // If "labelName" is not last in the labels list than getting next label
                        } else if ($el.next().length !== 0) {
                            secondLabel = $el.next().text();
                        }
                    })
                }
            }
        });
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
            cy.changeLabelAAM(secondLabel);
            cy.saveJob();
            cy.get('#cvat_canvas_shape_1').should('not.exist');
            cy.get('.attribute-annotations-sidebar-not-found-wrapper').should('exist');
        });
    });
});
