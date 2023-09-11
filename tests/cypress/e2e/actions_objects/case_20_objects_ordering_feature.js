// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, labelName, attrName } from '../../support/const';

context('Objects ordering feature', () => {
    const caseId = '20';

    const createRectangleShape2Points = {
        points: 'By 2 Points',
        type: 'Shape',
        labelName,
        firstX: 250,
        firstY: 350,
        secondX: 350,
        secondY: 450,
    };

    const createRectangleShape2PointsSecond = {
        points: 'By 2 Points',
        type: 'Shape',
        labelName,
        firstX: createRectangleShape2Points.firstX + 300,
        firstY: createRectangleShape2Points.firstY,
        secondX: createRectangleShape2Points.secondX + 300,
        secondY: createRectangleShape2Points.secondY,
    };

    function checkSideBarItemOrdering(ordering) {
        const cvatObjectsSidebarStateItemIdList1 = [];
        cy.get('.cvat-objects-sidebar-state-item').then(($cvatObjectsSidebarStateItemId) => {
            for (let i = 0; i < $cvatObjectsSidebarStateItemId.length; i++) {
                cvatObjectsSidebarStateItemIdList1.push(Number($cvatObjectsSidebarStateItemId[i].id.match(/\d+$/)));
            }
            const idAscent = cvatObjectsSidebarStateItemIdList1.reduce((previousValue, currentValue) => (
                !(previousValue > currentValue)
            ));
            if (ordering === 'ascent') {
                /* eslint-disable-next-line */
                expect(idAscent).to.be.true; // expected true to be true (ascent)
            } else {
                /* eslint-disable-next-line */
                expect(idAscent).to.be.false; // expected false to be false (descent)
            }
        });
    }

    before(() => {
        cy.openTaskJob(taskName);
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Create a couple of shapes.', () => {
            cy.createRectangle(createRectangleShape2Points);
            cy.createRectangle(createRectangleShape2PointsSecond);
            checkSideBarItemOrdering('ascent');
        });

        it('Sort object by "ID - descent".', () => {
            cy.sidebarItemSortBy('ID - descent');
            checkSideBarItemOrdering('descent');
        });
        it('Sort objects by "Updated time". Change something in the first object. This object now in the top', () => {
            cy.sidebarItemSortBy('Updated time');
            cy.get('#cvat_canvas_shape_1').trigger('mousemove');
            cy.get('#cvat_canvas_shape_1').rightclick();
            cy.get('.cvat-canvas-context-menu').within(() => {
                cy.contains('.cvat-objects-sidebar-state-item-collapse', 'DETAILS').click();
                cy.contains('.cvat-object-item-attribute-wrapper', attrName).within(() => {
                    cy.get('.cvat-object-item-text-attribute').clear();
                });
            });
            cy.get('.cvat-canvas-container').click(); // Hide context menu
            checkSideBarItemOrdering('ascent');
        });
    });
});
