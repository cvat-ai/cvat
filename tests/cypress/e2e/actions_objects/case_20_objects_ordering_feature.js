// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { defaultTaskSpec } from '../../support/default-specs';

context('Objects ordering feature', () => {
    const caseId = '20';
    const taskName = `Case ${caseId}`;
    const attrName = 'attr';
    const textDefaultValue = 'Text';

    const labels = [
        {
            name: 'Zebra',
            attributes: [
                {
                    name: attrName,
                    mutable: false,
                    input_type: 'text',
                    default_value: textDefaultValue,
                    values: [],
                },
            ],
            type: 'any',
        },
        {
            name: 'Apple',
            attributes: [],
            type: 'any',
        },
        {
            name: 'Monkey',
            attributes: [],
            type: 'any',
        },
    ];

    let taskId = null;
    let jobId = null;

    const createRectangle = (labelName, offsetX = 0, offsetY = 0) => ({
        points: 'By 2 Points',
        type: 'Shape',
        labelName,
        firstX: 250 + offsetX,
        firstY: 350 + offsetY,
        secondX: 350 + offsetX,
        secondY: 450 + offsetY,
    });

    const rectangles = [
        createRectangle('Zebra'),
        createRectangle('Apple', 300, 0),
        createRectangle('Zebra', 100, 0),
        createRectangle('Monkey', 150, 150),
    ];

    function checkSideBarItemOrdering(ordering) {
        const cvatObjectsSidebarStateItemIdList1 = [];
        cy.get(`.cvat-objects-sidebar-state-item ${ordering === 'label-name' ? '.ant-select-selection-item' : ''}`).then(
            ($cvatObjectsSidebarStateItemId) => {
                for (let i = 0; i < $cvatObjectsSidebarStateItemId.length; i++) {
                    cvatObjectsSidebarStateItemIdList1.push(
                        ordering === 'label-name' ?
                            $cvatObjectsSidebarStateItemId[i].getAttribute('title') :
                            Number($cvatObjectsSidebarStateItemId[i].id.match(/\d+$/)),
                    );
                }

                if (ordering === 'label-name') {
                    const isAlphabetical = cvatObjectsSidebarStateItemIdList1.every(
                        (value, index) => {
                            if (index === 0) return true;
                            const prev = cvatObjectsSidebarStateItemIdList1[index - 1];
                            return value.localeCompare(prev) >= 0;
                        },
                    );
                    expect(isAlphabetical).to.be.true;
                } else if (ordering === 'ascent') {
                    const idAscent = cvatObjectsSidebarStateItemIdList1.every(
                        (value, index) => index === 0 ||
                            value >= cvatObjectsSidebarStateItemIdList1[index - 1],
                    );
                    expect(idAscent).to.be.true;
                } else {
                    const idDescent = cvatObjectsSidebarStateItemIdList1.every(
                        (value, index) => index === 0 || value <= cvatObjectsSidebarStateItemIdList1[index - 1],
                    );
                    expect(idDescent).to.be.true;
                }
            });
    }

    function moveObjectToForeground(clientId) {
        cy.get(`#cvat-objects-sidebar-state-item-${clientId}`)
            .find('.cvat-object-item-menu-button').click();
        cy.get('.cvat-object-item-menu:visible')
            .find('.cvat-object-item-menu-to-layer-foreground').click();
    }

    function layerVisibilityButton(zOrder) {
        return cy.get(`.cvat-objects-sidebar-z-layer[data-z-order="${zOrder}"]`)
            .find('.cvat-objects-sidebar-z-layer-visibility-indicator');
    }

    before(() => {
        cy.visit('/auth/login');
        cy.headlessLogin();

        const { taskSpec, dataSpec, extras } = defaultTaskSpec({
            labelName: 'Zebra',
            labelType: 'any',
            attributes: [{
                name: attrName,
                type: 'text',
                values: textDefaultValue,
            }],
            taskName,
            serverFiles: ['images/image_1.jpg'],
        });

        taskSpec.labels = labels;

        cy.headlessCreateTask(taskSpec, dataSpec, extras).then(({ taskId: tid, jobIds: [jid] }) => {
            [taskId, jobId] = [tid, jid];
            cy.visit(`/tasks/${taskId}/jobs/${jobId}`);
        });
    });

    after(() => {
        if (taskId !== null) {
            cy.headlessDeleteTask(taskId);
        }
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Create shapes with different labels.', () => {
            rectangles.forEach((rectangle) => {
                cy.createRectangle(rectangle);
            });
            checkSideBarItemOrdering('ascent');
        });

        it('Move objects to separate layers.', () => {
            moveObjectToForeground(1);
            moveObjectToForeground(2);

            cy.sidebarItemSortBy('Layer');
            cy.get('.cvat-objects-sidebar-z-layer').should('have.length', 3);
            [0, 1, 2].forEach((zOrder) => {
                cy.get(`.cvat-objects-sidebar-z-layer[data-z-order="${zOrder}"]`).should('exist');
            });

            cy.get('.cvat-canvas-layer-stack-trigger-layer').should('have.text', '0');
            cy.get('.cvat-objects-sidebar-z-layer[data-z-order="1"]')
                .find('.cvat-objects-sidebar-z-layer-select-button').click();
            cy.get('.cvat-canvas-layer-stack-trigger-layer').should('have.text', '1');

            layerVisibilityButton(1).click();
            cy.get('#cvat_canvas_shape_1').should('not.exist');

            cy.createRectangle(createRectangle('Apple', 300, 150));
            cy.get('.cvat-objects-sidebar-z-layer[data-z-order="1"]')
                .find('#cvat-objects-sidebar-state-item-5').should('exist');
            cy.get('#cvat_canvas_shape_1').should('exist');
            cy.get('#cvat_canvas_shape_5').should('exist');
            layerVisibilityButton(1).find('svg').should('have.attr', 'data-icon', 'eye');
        });

        it('Show and hide layers using layer visibility controls.', () => {
            cy.get('#cvat_canvas_shape_1').should('exist');
            cy.get('#cvat_canvas_shape_2').should('exist');
            cy.get('#cvat_canvas_shape_3').should('exist');
            cy.get('#cvat_canvas_shape_4').should('exist');

            layerVisibilityButton(1).click();
            cy.get('#cvat_canvas_shape_1').should('not.exist');
            cy.get('#cvat_canvas_shape_2').should('exist');
            cy.get('#cvat_canvas_shape_3').should('exist');
            cy.get('#cvat_canvas_shape_4').should('exist');

            layerVisibilityButton(1).click();
            cy.get('#cvat_canvas_shape_1').should('exist');

            layerVisibilityButton(0).click();
            cy.get('#cvat_canvas_shape_1').should('exist');
            cy.get('#cvat_canvas_shape_2').should('exist');
            cy.get('#cvat_canvas_shape_3').should('not.exist');
            cy.get('#cvat_canvas_shape_4').should('not.exist');

            layerVisibilityButton(1).click({ shiftKey: true });
            cy.get('#cvat_canvas_shape_1').should('not.exist');
            cy.get('#cvat_canvas_shape_2').should('exist');
            cy.get('#cvat_canvas_shape_3').should('not.exist');
            cy.get('#cvat_canvas_shape_4').should('not.exist');

            layerVisibilityButton(1).click({ shiftKey: true });
            cy.get('#cvat_canvas_shape_1').should('exist');
            cy.get('#cvat_canvas_shape_2').should('exist');
            cy.get('#cvat_canvas_shape_3').should('exist');
            cy.get('#cvat_canvas_shape_4').should('exist');
        });

        it('Sort object by "ID - descent".', () => {
            cy.sidebarItemSortBy('ID - descent');
            checkSideBarItemOrdering('descent');
        });

        it('Sort object by "Label name".', () => {
            cy.sidebarItemSortBy('Label name');
            checkSideBarItemOrdering('label-name');
        });

        it('Sort objects by "Updated time". Toggle lock on each object to update timestamps', () => {
            cy.sidebarItemSortBy('Updated time');

            // Update in descending ID order so the latest-first result is ascending by ID.
            [5, 4, 3, 2, 1].forEach((clientId) => {
                cy.get(`#cvat-objects-sidebar-state-item-${clientId}`).within(() => {
                    cy.get('.cvat-object-item-button-lock').click();
                });
            });

            checkSideBarItemOrdering('ascent');
        });
    });
});
