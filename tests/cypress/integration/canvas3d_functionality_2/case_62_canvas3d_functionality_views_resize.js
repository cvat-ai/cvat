// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName } from '../../support/const_canvas3d';

context('Canvas 3D functionality. Resize views.', () => {
    const caseId = '62';
    let widthHeightArrBeforeResize = [];
    let widthHeightArrAfterResize = [];

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
        getViewWidthHeight('.cvat-canvas3d-perspective', widthHeightArrBeforeResize);
        getViewWidthHeight('.cvat-canvas3d-topview', widthHeightArrBeforeResize);
        getViewWidthHeight('.cvat-canvas3d-sideview', widthHeightArrBeforeResize);
        getViewWidthHeight('.cvat-canvas3d-frontview', widthHeightArrBeforeResize);
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Resizing perspective.', () => {
            cy.get('.cvat-resizable-handle-horizontal').trigger('mousedown', { button: 0, scrollBehavior: false });
            cy.get('.cvat-canvas3d-perspective')
                .trigger('mousemove', 600, 300, { scrollBehavior: false })
                .trigger('mouseup');
            getViewWidthHeight('.cvat-canvas3d-perspective', widthHeightArrAfterResize);
        });

        it('Resizing topview.', () => {
            cy.get('.cvat-resizable-handle-vertical-top').trigger('mousedown', { button: 0, scrollBehavior: false });
            cy.get('.cvat-canvas3d-topview')
                .trigger('mousemove', 200, 200, { scrollBehavior: false })
                .trigger('mouseup');
            getViewWidthHeight('.cvat-canvas3d-topview', widthHeightArrAfterResize);
        });

        it('Resizing sideview.', () => {
            cy.get('.cvat-resizable-handle-vertical-side').trigger('mousedown', { button: 0, scrollBehavior: false });
            cy.get('.cvat-canvas3d-frontview')
                .trigger('mousemove', 200, 200, { scrollBehavior: false })
                .trigger('mouseup');
            getViewWidthHeight('.cvat-canvas3d-sideview', widthHeightArrAfterResize);
            getViewWidthHeight('.cvat-canvas3d-frontview', widthHeightArrAfterResize);
        });

        it('Checking for elements resizing.', () => {
            expect(widthHeightArrBeforeResize[0][0]).to.be.equal(widthHeightArrAfterResize[0][0]); // Width of cvat-canvas3d-perspective before and after didn't change
            expect(widthHeightArrBeforeResize[0][1]).not.be.equal(widthHeightArrAfterResize[0][1]); // Height of cvat-canvas3d-perspective changed
            expect(widthHeightArrAfterResize[1][1])
                .to.be.equal(widthHeightArrAfterResize[2][1])
                .to.be.equal(widthHeightArrAfterResize[3][1]); // Top/side/front has equal height after changes
            [
                [widthHeightArrBeforeResize[1][0], widthHeightArrAfterResize[1][0]],
                [widthHeightArrBeforeResize[2][0], widthHeightArrAfterResize[2][0]],
                [widthHeightArrBeforeResize[3][0], widthHeightArrAfterResize[3][0]],
            ].forEach(([widthBefore, widthAfter]) => {
                expect(widthBefore).not.be.equal(widthAfter); // Width of top/side/front changed
            });
            [
                [widthHeightArrBeforeResize[1][1], widthHeightArrAfterResize[1][1]],
                [widthHeightArrBeforeResize[2][1], widthHeightArrAfterResize[2][1]],
                [widthHeightArrBeforeResize[3][1], widthHeightArrAfterResize[3][1]],
            ].forEach(([heightBefore, heightAfter]) => {
                expect(heightBefore).not.be.equal(heightAfter); // Height of top/side/front changed
            });
        });
    });
});
