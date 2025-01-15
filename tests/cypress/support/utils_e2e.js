// Copyright (C) 2025 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

export function clickDeleteFrame() {
    cy.get('.cvat-player-delete-frame').click();
    cy.get('.cvat-modal-delete-frame').within(() => {
        cy.contains('button', 'Delete').click();
    });
}

export function clickSave() {
    cy.get('button').contains('Save').click({ force: true });
    cy.get('button').contains('Save').trigger('mouseout');
}
