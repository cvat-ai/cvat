/// <reference types="cypress" />
import { taskName, labelName } from '../../support/const';

describe('Z-order button actions', () => {
  // Helper function to perform z-order action and verify result
  const performZOrderAction = (actionSelector, expectedZOrder) => {
    cy.wait(500); // Wait for UI to stabilize
    cy.get('#cvat-objects-sidebar-state-item-1', { timeout: 3000 })
      .find('.cvat-object-item-menu-button')
      .click();

    cy.get(actionSelector, { timeout: 3000 }).click();

    cy.get('#cvat_canvas_shape_1', { timeout: 3000 })
      .should('have.attr', 'data-z-order', expectedZOrder);
  };

  before(() => {
    // Open task and create the polygon shape
    cy.openTaskJob(taskName);
    cy.createPolygon({
      type: 'Shape',
      labelName,
      pointsMap: [
        { x: 100, y: 100 },
        { x: 200, y: 100 },
        { x: 200, y: 200 },
      ],
      complete: true,
    });

    // Verify the shape exists with zOrder = 0
    cy.get('#cvat_canvas_shape_1', { timeout: 3000 })
      .should('have.attr', 'data-z-order', '0');
  });

  it('Send shape to background', () => {
    performZOrderAction('.cvat-object-item-menu-to-background', '-1');
  });

  it('Move shape to next layer', () => {
    performZOrderAction('.cvat-object-item-menu-move-to-next-layer', '0');
  });

  it('Move shape to previous layer', () => {
    performZOrderAction('.cvat-object-item-menu-move-to-previous-layer', '-1');
  });

  it('Send shape to foreground', () => {
    performZOrderAction('.cvat-object-item-menu-to-foreground', '1');
  });
});