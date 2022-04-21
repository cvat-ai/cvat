// Copyright (C) 2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

let selectedValueGlobal = '';

Cypress.Commands.add('interactOpenCVControlButton', () => {
    cy.get('body').focus();
    cy.get('.cvat-tools-control').trigger('mouseleave').trigger('mouseout').trigger('mousemove').trigger('mouseover');
    cy.get('.cvat-tools-control').should('have.class', 'ant-popover-open');
    cy.get('.cvat-opencv-control-popover')
        .should('be.visible')
        .should('have.attr', 'style')
        .should('not.include', 'pointer-events: none');
});

Cypress.Commands.add('opencvCreateShape', (opencvShapeParams) => {
    if (!opencvShapeParams.reDraw) {
        cy.interactOpenCVControlButton();
        cy.switchLabel(opencvShapeParams.labelName, 'opencv-control');
        cy.get('.cvat-opencv-control-popover').within(() => {
            cy.get('.ant-select-selection-item').then(($labelValue) => {
                selectedValueGlobal = $labelValue.text();
            });
        });
        cy.get('.cvat-opencv-drawing-tool').click();
    }
    opencvShapeParams.pointsMap.forEach((element) => {
        cy.get('.cvat-canvas-container').click(element.x, element.y);
    });
    if (opencvShapeParams.finishWithButton) {
        cy.contains('span', 'Done').click();
    } else {
        const keyCodeN = 78;
        cy.get('.cvat-canvas-container')
            .trigger('keydown', { keyCode: keyCodeN, code: 'KeyN' })
            .trigger('keyup', { keyCode: keyCodeN, code: 'KeyN' });
    }
    cy.checkPopoverHidden('opencv-control');
    cy.opencvCheckObjectParameters('POLYGON');
});

Cypress.Commands.add('opencvCheckObjectParameters', (objectType) => {
    const listCanvasShapeId = [];
    cy.document().then((doc) => {
        const listCanvasShape = Array.from(doc.querySelectorAll('.cvat_canvas_shape'));
        for (let i = 0; i < listCanvasShape.length; i++) {
            listCanvasShapeId.push(listCanvasShape[i].id.match(/\d+$/));
        }
        const maxId = Math.max(...listCanvasShapeId);
        cy.get(`#cvat_canvas_shape_${maxId}`).should('be.visible');
        cy.get(`#cvat-objects-sidebar-state-item-${maxId}`)
            .should('contain', maxId)
            .and('contain', objectType)
            .within(() => {
                cy.get('.ant-select-selection-item').should('have.text', selectedValueGlobal);
            });
    });
});

Cypress.Commands.add('opencvOpenTab', (tabName) => {
    cy.checkPopoverHidden('opencv-control');
    cy.interactOpenCVControlButton();
    cy.get('.cvat-opencv-control-popover')
        .contains('[role="tab"]', tabName)
        .click()
        .parents('.ant-tabs-tab')
        .should('have.class', 'ant-tabs-tab-active');
});

Cypress.Commands.add('createOpenCVTrack', (trackParams) => {
    cy.opencvOpenTab('Tracking');
    cy.get('.cvat-opencv-tracking-label-select').find('.ant-select-selection-item').click();
    cy.get('.ant-select-dropdown')
        .not('.ant-select-dropdown-hidden')
        .find(`.ant-select-item-option[title="${trackParams.labelName}"]`)
        .click();
    cy.get('.cvat-opencv-tracker-select').find('.ant-select-selection-item').click();
    cy.get('.ant-select-dropdown')
        .not('.ant-select-dropdown-hidden')
        .find('.ant-select-item-option-content')
        .contains(trackParams.tracker)
        .click();
    cy.get('.cvat-tools-track-button').click();
    trackParams.pointsMap.forEach((point) => {
        cy.get('.cvat-canvas-container').click(point.x, point.y);
    });
});
