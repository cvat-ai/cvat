// Copyright (C) 2021-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context('Add/delete labels and attributes.', () => {
    const caseId = '41';
    const labelName = `Case ${caseId}`;
    const attrName = `Attr for ${labelName}`;
    const textDefaultValue = 'Some default value for type Text';

    before(() => {
        cy.visit('/auth/login');
        cy.login();
        cy.get('.cvat-create-task-dropdown').click();
        cy.get('.cvat-create-task-button').click();
    });

    describe(`Testing "${labelName}"`, () => {
        it('Start adding a label. Press Cancel. The label is not created.', () => {
            cy.get('.cvat-constructor-viewer-new-item').click(); // Open label constructor
            cy.get('[placeholder="Label name"]').type(labelName);
            cy.contains('[type="button"]', 'Cancel').click();
            cy.get('.cvat-constructor-viewer-item').should('not.exist');
        });

        it('Start adding a label. Start adding an attribute. Press Cancel. The label is not created.', () => {
            cy.get('.cvat-constructor-viewer-new-item').click();
            cy.get('[placeholder="Label name"]').type(labelName);
            cy.get('.cvat-new-attribute-button').click();
            cy.get('.cvat-attribute-name-input').type(attrName);
            cy.get('.cvat-attribute-type-input').click();
            cy.get('.cvat-attribute-type-input-text').click();
            cy.get('.cvat-attribute-values-input').type(textDefaultValue);
            cy.contains('[type="button"]', 'Cancel').click();
            cy.get('.cvat-constructor-viewer-item').should('not.exist');
        });

        it('Start adding a label. Add an attribute. Press Done. The label should be created.', () => {
            cy.get('.cvat-constructor-viewer-new-item').click();
            cy.get('[placeholder="Label name"]').type(labelName);
            cy.get('.cvat-new-attribute-button').click();
            cy.get('.cvat-attribute-name-input').type(attrName);
            cy.get('.cvat-attribute-type-input').click();
            cy.get('.cvat-attribute-type-input-text').click();
            cy.get('.cvat-attribute-values-input').type(textDefaultValue);
            cy.contains('[type="submit"]', 'Continue').click();
            cy.contains('[type="button"]', 'Cancel').click();
            cy.get('.cvat-constructor-viewer-item').should('exist');
        });

        it('Start to edit the label. Attribute should exist. Remove the attribute. Press Done.', () => {
            cy.get('.cvat-constructor-viewer-item').find('[aria-label="edit"]').click();
            cy.get('.cvat-attribute-inputs-wrapper')
                .should('exist')
                .within(() => {
                    cy.get('.cvat-delete-attribute-button').click();
                });
            cy.get('.cvat-attribute-inputs-wrapper').should('not.exist');
            cy.contains('[type="submit"]', 'Done').click();
            // After deleting the attribute and saving the changes, check that the attribute is missing.
            cy.get('.cvat-constructor-viewer-item').find('[aria-label="edit"]').click();
            cy.get('.cvat-attribute-inputs-wrapper').should('not.exist');
            cy.contains('[type="button"]', 'Cancel').click();
        });

        it('Delete the added label. The label removed.', () => {
            cy.get('.cvat-constructor-viewer-item').find('[aria-label="delete"]').click();
            cy.get('.cvat-constructor-viewer-item').should('not.exist');
        });
    });
});
