// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context('Raw label editor number attribute validation', { browser: '!firefox' }, () => {
    const projectName = 'Raw number attribute validation';

    before(() => {
        cy.visit('/');
        cy.login();

        cy.goToProjectsList();
        cy.get('.cvat-create-project-button').click();
        cy.get('#name').type(projectName);

        cy.contains('[role="tab"]', 'Raw').click();

        const labels = [
            {
                name: 'Test label',
                color: '#ff0000',
                type: 'any',
                attributes: [
                    {
                        name: 'attr',
                        mutable: false,
                        input_type: 'number',
                        default_value: '1',
                        values: ['1', '4', '1'],
                    },
                ],
            },
        ];

        cy.get('.cvat-raw-labels-viewer')
            .clear()
            .type(JSON.stringify(labels), {
                parseSpecialCharSequences: false,
            });

        cy.contains('button', 'Done').click();
        cy.contains('button', 'Submit').click();

        cy.get('.cvat-notification-create-project-success').should('exist');
    });

    after(() => {
        cy.getAuthKey().then((authKey) => {
            cy.deleteProjects(authKey, [projectName]);
        });
    });

    it('does not reject repeated values in number attribute configuration', () => {
        cy.goToProjectsList();
        cy.openProject(projectName);

        cy.contains('[role="tab"]', 'Raw').click();

        cy.get('.cvat-raw-labels-viewer')
            .focus()
            .realPress(['ControlLeft', 'a'])
            .realPress(['ControlLeft', 'c']);

        cy.get('.cvat-raw-labels-viewer')
            .focus()
            .clear()
            .realPress(['ControlLeft', 'v']);

        cy.contains(
            'attribute values must be unique',
        ).should('not.exist');

        cy.get('.cvat-submit-raw-labels-conf-button')
            .should('not.be.disabled');
    });
});