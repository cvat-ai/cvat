// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName } from '../../support/const';

context('Canvas bitmap feature', () => {
    const caseId = '25';

    before(() => {
        cy.openTaskJob(taskName);
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Bitmap not visible.', () => {
            cy.get('#cvat_canvas_bitmap').should('not.be.visible');
        });
        it('Activate bitmap.', () => {
            cy.get('.cvat-appearance-bitmap-checkbox').click();
            cy.get('#cvat_canvas_bitmap').should('be.visible').and('have.css', 'background-color', 'rgb(0, 0, 0)');
        });
    });
});
