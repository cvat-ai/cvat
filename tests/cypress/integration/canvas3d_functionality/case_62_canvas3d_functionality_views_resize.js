// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName } from '../../support/const_canvas3d';

context('Canvas 3D functionality. Resize views.', () => {
    const caseId = '62';
    let widthHightArrBeforeResize = [];
    let widthHightArrAfterResize = [];

    function getViewWidthHeight(element, arrToPush) {
        cy.get(element)
            .find('canvas')
            .invoke('attr', 'width')
            .then(($topviewWidth) => {
                cy.get(element)
                    .find('canvas')
                    .invoke('attr', 'height')
                    .then(($topviewHeight) => {
                        arrToPush.push([$topviewWidth, $topviewHeight]);
                    });
            });
    }

    before(() => {
        cy.openTaskJob(taskName);
        getViewWidthHeight('.cvat-canvas3d-perspective', widthHightArrBeforeResize);
        getViewWidthHeight('.cvat-canvas3d-topview', widthHightArrBeforeResize);
        getViewWidthHeight('.cvat-canvas3d-sideview', widthHightArrBeforeResize);
        getViewWidthHeight('.cvat-canvas3d-frontview', widthHightArrBeforeResize);
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Resizing perspective.', () => {
            cy.get('.cvat-resizable-handle-horizontal').trigger('mousedown', { button: 0, scrollBehavior: false });
            cy.get('.cvat-canvas3d-perspective')
                .trigger('mousemove', 600, 300, { scrollBehavior: false })
                .trigger('mouseup');
            getViewWidthHeight('.cvat-canvas3d-perspective', widthHightArrAfterResize);
        });

        it('Resizing topview.', () => {
            cy.get('.cvat-resizable-handle-vertical-top').trigger('mousedown', { button: 0, scrollBehavior: false });
            cy.get('.cvat-canvas3d-topview')
                .trigger('mousemove', 200, 200, { scrollBehavior: false })
                .trigger('mouseup');
            getViewWidthHeight('.cvat-canvas3d-topview', widthHightArrAfterResize);
        });

        it('Resizing sideview.', () => {
            cy.get('.cvat-resizable-handle-vertical-side').trigger('mousedown', { button: 0, scrollBehavior: false });
            cy.get('.cvat-canvas3d-frontview')
                .trigger('mousemove', 200, 200, { scrollBehavior: false })
                .trigger('mouseup');
            getViewWidthHeight('.cvat-canvas3d-sideview', widthHightArrAfterResize);
            getViewWidthHeight('.cvat-canvas3d-frontview', widthHightArrAfterResize);
        });

        it('Checking for elements resizing.', () => {
            expect(widthHightArrBeforeResize[0][0]).to.be.equal(widthHightArrAfterResize[0][0]); // Width of cvat-canvas3d-perspective before and after didn't change
            expect(widthHightArrBeforeResize[0][1]).not.be.equal(widthHightArrAfterResize[0][1]); // Height of cvat-canvas3d-perspective changed
            expect(widthHightArrAfterResize[1][1])
                .to.be.equal(widthHightArrAfterResize[2][1])
                .to.be.equal(widthHightArrAfterResize[3][1]); // Top/side/front has equal height after changes
            [
                [widthHightArrBeforeResize[1][0], widthHightArrAfterResize[1][0]],
                [widthHightArrBeforeResize[2][0], widthHightArrAfterResize[2][0]],
                [widthHightArrBeforeResize[3][0], widthHightArrAfterResize[3][0]],
            ].forEach(([widthBefore, widthAfter]) => {
                expect(widthBefore).not.be.equal(widthAfter); // Width of top/side/front changed
            });
            [
                [widthHightArrBeforeResize[1][1], widthHightArrAfterResize[1][1]],
                [widthHightArrBeforeResize[2][1], widthHightArrAfterResize[2][1]],
                [widthHightArrBeforeResize[3][1], widthHightArrAfterResize[3][1]],
            ].forEach(([heightBefore, heightAfter]) => {
                expect(heightBefore).not.be.equal(heightAfter); // Height of top/side/front changed
            });
        });
    });
});
