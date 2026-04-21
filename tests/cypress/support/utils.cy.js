// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

export function selectAll() {
    cy.get('.cvat-bulk-wrapper').should('exist').and('be.visible');
    cy.contains('Select all').click();
}

export function getBulkActionsMenu() {
    cy.get('.cvat-item-selected').first().within(() => {
        cy.get('.cvat-actions-menu-button').click();
    });
    return cy.get('.ant-dropdown');
}

export function assignAllTo(username, numberOfObjects = null) {
    if (numberOfObjects) {
        // if caller asks, check number of objects
        cy.contains(`Assignee (${numberOfObjects})`)
            .should('exist').and('be.visible').click();
    } else {
        cy.contains('Assignee (').click();
    }
    cy.get('.cvat-user-search-field').type(username, { delay: 0 }); // all at once
    return cy.get('.cvat-user-search-field').type('{enter}');
}

export function checkAutoborderPointsCount(expectedCount) {
    if (expectedCount === 0) {
        cy.get('.cvat_canvas_autoborder_point').should('not.exist');
    } else {
        cy.get('.cvat_canvas_autoborder_point')
            .should('exist')
            .and('be.visible')
            .then(($autoborderPoints) => {
                expect($autoborderPoints.length).to.be.equal(expectedCount);
            });
    }
}

/**
 * Draw a shape by clicking through an array of points
 * using cy.trigger events
 * @param {Array<{x: number, y: number}>} points - Array of points to trigger
 */
export function drawWithTriggers(pointsMap) {
    pointsMap.forEach((p) => {
        cy.get('.cvat-canvas-container').trigger('mousemove', ...[p.x, p.y]);
        cy.get('.cvat-canvas-container').trigger('mousedown', ...[p.x, p.y], { button: 0 });
    });
}

/**
 * Draw a shape by clicking through an array of points
 * using cy.click
 * @param {Array<{x: number, y: number}>} points - Array of points to click
 */
export function drawWithClicks(pointsMap) {
    pointsMap.forEach((element) => {
        cy.get('.cvat-canvas-container').click(element.x, element.y);
    });
}

export function getShapeCoord(type, objectId) {
    const arrToPush = [];
    if (type === 'rect') {
        cy.get(objectId).invoke('attr', 'x').then((x) => arrToPush.push(+x));
        cy.get(objectId).invoke('attr', 'y').then((y) => arrToPush.push(+y));
        cy.get(objectId).invoke('attr', 'width').then((width) => arrToPush.push(arrToPush[0] + +width));
        cy.get(objectId).invoke('attr', 'height').then((height) => arrToPush.push(arrToPush[1] + +height));
    } else {
        cy.get(objectId).invoke('attr', 'points').then((points) => arrToPush.push(...points.split(/[\s]/)));
    }
    return cy.wrap(arrToPush);
}
