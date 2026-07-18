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
 * @param {Array<{x: number, y: number}>} pointsMap - Array of points to trigger
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
 * @param {Array<{x: number, y: number}>} pointsMap - Array of points to click
 */
export function drawWithClicks(pointsMap) {
    pointsMap.forEach((element) => {
        cy.get('.cvat-canvas-container').click(element.x, element.y);
    });
}

export function imagePointToCanvasCoordinates(point, {
    content,
    background,
    container,
}) {
    const contentWidth = Number.parseFloat(content.style.width) || content.width.baseVal.value;
    const contentHeight = Number.parseFloat(content.style.height) || content.height.baseVal.value;
    const imageWidth = Number(background.getAttribute('width')) || background.width;
    const imageHeight = Number(background.getAttribute('height')) || background.height;
    const matrix = content.getScreenCTM();

    if (!matrix) {
        throw new Error('Canvas image coordinates cannot be converted without a screen matrix');
    }

    const svgPoint = content.createSVGPoint();
    svgPoint.x = point.x + (contentWidth - imageWidth) / 2;
    svgPoint.y = point.y + (contentHeight - imageHeight) / 2;

    const screenPoint = svgPoint.matrixTransform(matrix);
    const containerRect = container.getBoundingClientRect();

    return {
        x: screenPoint.x - containerRect.left,
        y: screenPoint.y - containerRect.top,
    };
}

export function clickCanvasImagePoint(point, options = {}) {
    cy.get('#cvat_canvas_content').then(([content]) => {
        const background = content.ownerDocument.getElementById('cvat_canvas_background');
        const container = content.ownerDocument.querySelector('.cvat-canvas-container');

        if (!background || !container) {
            throw new Error('Canvas image or container was not found');
        }

        const { x, y } = imagePointToCanvasCoordinates(point, { content, background, container });

        cy.get('.cvat-canvas-container').click(x, y, options);
    });
}

/**
 * Draw a shape by clicking through an array of points
 * using cy.click
 * @param {Array<{x: number, y: number}>} pointsMap - Array of points to click
 */
export function drawWithShiftHover(pointsMap) {
    const [firstPoint, ...points] = pointsMap;

    cy.get('.cvat-canvas-container').click(firstPoint.x, firstPoint.y);

    points.forEach((point) => {
        cy.get('.cvat-canvas-container').trigger('mousemove', point.x, point.y, { shiftKey: true });
    });
}

/**
 * Description
 * @param {any} createPolyshapeParams
 * @param {'trigger' | 'shiftHover' | 'click'} drawMethod
 * @returns {any}
 */
export function drawPolyshape(createPolyshapeParams, drawMethod) {
    if (drawMethod === 'trigger') {
        drawWithTriggers(createPolyshapeParams.pointsMap);
    } else if (drawMethod === 'shiftHover') {
        drawWithShiftHover(createPolyshapeParams.pointsMap);
    } else if (drawMethod === 'click') {
        drawWithClicks(createPolyshapeParams.pointsMap);
    }
}

/**
 * Toggle auto-simplify switch for a shape
 * @param {boolean} expectedState
 * @param {'polygon' | 'polyline'} shape
 */
export function toggleAutoSimplify(expectedState, shape) {
    cy.get(`.cvat-draw-shape-popover .cvat-draw-${shape}-popover-simplify-switch`)
        .should('exist').and('be.visible')
        .click();
    if (expectedState === true) {
        cy.get(`.cvat-draw-${shape}-popover-simplify-switch`)
            .should('have.class', 'ant-switch-checked');
    } else {
        cy.get(`.cvat-draw-${shape}-popover-simplify-switch`).should('not.have.class', 'ant-switch-checked');
    }
}

export function getShapeCoord(type, objectSelector) {
    const arrToPush = [];
    if (type === 'rect') {
        cy.get(objectSelector).invoke('attr', 'x').then((x) => arrToPush.push(+x));
        cy.get(objectSelector).invoke('attr', 'y').then((y) => arrToPush.push(+y));
        cy.get(objectSelector).invoke('attr', 'width').then((width) => arrToPush.push(arrToPush[0] + +width));
        cy.get(objectSelector).invoke('attr', 'height').then((height) => arrToPush.push(arrToPush[1] + +height));
    } else {
        cy.get(objectSelector).invoke('attr', 'points').then((points) => arrToPush.push(...points.split(/[\s]/)));
    }
    return cy.wrap(arrToPush);
}
