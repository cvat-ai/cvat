// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context('Wrong attribute is removed in label constructor.', () => {
    const issueId = '2411';
    const taskRaw = [
        {
            name: "person",
            color: "#ff6037",
            attributes: [
            {
                name: "lower_body",
                input_type: "select",
                mutable: true,
                values: [
                    "__undefined__",
                    "long",
                    "short",
                    "n/a"
                ]
            },
            {
                name: "hair_color",
                input_type: "select",
                mutable: true,
                values: [
                    "__undefined__",
                    "black",
                    "brown",
                    "blond",
                    "grey",
                    "other",
                    "n/a"
                ]
            },
            {
                name: "cellphone",
                input_type: "select",
                mutable: true,
                values: [
                    "__undefined__",
                    "yes",
                    "no",
                    "n/a"
                ]
            }
            ]
        }
    ];

    before(() => {
        cy.visit('auth/login');
        cy.login();
    });

    describe(`Testing issue "${issueId}"`, () => {
        it('Open the create task page.', () => {
            cy.get('#cvat-create-task-button').click({ force: true });
        });
        it('Go to Raw labels editor. Insert values.', () => {
            cy.get('[role="tab"]').contains('Raw').click();
            cy.get('#labels').clear().type(JSON.stringify(taskRaw), { parseSpecialCharSequences: false });
            cy.contains('Done').click();
        });
        it('Go to constructor tab. The label "person" appeared there.', () => {
            cy.get('[role="tab"]').contains('Constructor').click();
            cy.get('.cvat-constructor-viewer-item').should('have.text', 'person').within(() => {
                cy.get('i[aria-label="icon: edit"]').click();
            });
        });
        it('Remove the average attribute "hair_color". It has been deleted.', () => {
            cy.get('.cvat-label-constructor-updater').within(() => {
                cy.get('.ant-row-flex-space-between').eq(1).within(() => {
                    cy.get('[placeholder="Name"]').invoke('val').then(placeholderNameValue => {
                        expect(placeholderNameValue).to.be.equal('hair_color');
                    });
                    cy.get('.cvat-delete-attribute-button').click();
                });
                cy.get('.ant-row-flex-space-between').eq(0).within(() => {
                    cy.get('[placeholder="Name"]').invoke('val').then(placeholderNameValue => {
                        expect(placeholderNameValue).to.be.equal('cellphone');
                    });
                });
                cy.get('.ant-row-flex-space-between').eq(1).within(() => {
                    cy.get('[placeholder="Name"]').invoke('val').then(placeholderNameValue => {
                        expect(placeholderNameValue).to.be.equal('lower_body');
                    });
                });
            });
        });
        it('Remove the latest attribute "lower_body". It has been deleted.', () => {
            cy.get('.cvat-label-constructor-updater').within(() => {
                cy.get('.ant-row-flex-space-between').eq(1).within(() => {
                    cy.get('[placeholder="Name"]').invoke('val').then(placeholderNameValue => {
                        expect(placeholderNameValue).to.be.equal('lower_body');
                    });
                    cy.get('.cvat-delete-attribute-button').click();
                });
                cy.get('.ant-row-flex-space-between').eq(0).within(() => {
                    cy.get('[placeholder="Name"]').invoke('val').then(placeholderNameValue => {
                        expect(placeholderNameValue).to.be.equal('cellphone');
                    });
                });
            });
        });
    });
});
