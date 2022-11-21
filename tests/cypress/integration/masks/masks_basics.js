// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />
import { drawingActions, editingActions } from '../../support/const';
import { drawMask, finishDrawing, startDrawing } from '../../support/utils';
import * as maskPage from '../../support/pages/masks_page';

context('Manipulations with masks', { scrollBehavior: false }, () => {
    maskPage.beforeMask();
    maskPage.afterMask();
    beforeEach(() => {
        cy.removeAnnotations();
        cy.goCheckFrameNumber(0);
    });

    describe('Draw a couple of masks masks', () => {
        it('Drawing a couple of masks. Save job, reopen job, masks must exist', () => {
            startDrawing();
            drawMask(drawingActions);
            maskPage.drawingMaskContinue();

            /** it is expected, that after clicking "continue", brush tools are still opened */
            drawMask(drawingActions);
            finishDrawing();
            maskPage.checkAfterSave();
        });

        it('Propagate mask to another frame', () => {
            startDrawing();
            drawMask(drawingActions);
            finishDrawing();

            maskPage.moveMask();
        });

        it('Copy mask to another frame', () => {
            startDrawing();
            drawMask(drawingActions);
            finishDrawing();

            maskPage.copyMask();
        });

        it('Editing a drawn mask', () => {
            startDrawing();
            drawMask(drawingActions);
            finishDrawing();

            maskPage.editMask();
            drawMask(editingActions);
            finishDrawing();
        });
    });
});
