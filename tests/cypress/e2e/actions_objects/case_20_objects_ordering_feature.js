// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

/* eslint-disable no-unused-expressions */

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

        cy.headlessCreateTask(taskSpec, dataSpec, extras).then(({ taskID: tid, jobIDs: [jid] }) => {
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

            // Toggle lock on each object in order to update their timestamps
            cy.get('.cvat-objects-sidebar-state-item').each(($item) => {
                cy.wrap($item).within(() => {
                    cy.get('.cvat-object-item-button-lock').click();
                });
            });

            checkSideBarItemOrdering('ascent');
        });
    });
});
