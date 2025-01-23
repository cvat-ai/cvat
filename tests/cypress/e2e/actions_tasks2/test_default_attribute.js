// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context('Test default value for an attribute', () => {
    const taskName = 'Default attribute value test';
    const serverFiles = {
        images: ['image_1.jpg', 'image_2.jpg', 'image_3.jpg'],
    };

    const label = 'test label';
    const attributes = [
        {
            name: 'test select attribute',
            values: 'first{Enter}second{Enter}third',
            defaultValue: 'second',
            type: 'Select',
        },
        {
            name: 'test radio attribute',
            values: 'first{Enter}second{Enter}third',
            defaultValue: 'second',
            type: 'Radio',
        },
    ];

    let taskID = null;
    let jobID = null;

    function checkCreatedObject(attr1Value, attr2Value) {
        cy.createRectangle({
            points: 'By 2 Points',
            type: 'Shape',
            labelName: label,
            firstX: 150,
            firstY: 350,
            secondX: 250,
            secondY: 450,
        });

        cy.get('#cvat-objects-sidebar-state-item-1').within(() => {
            cy.contains('.cvat-objects-sidebar-state-item-collapse', 'DETAILS').click();
            cy.get('.cvat-object-item-select-attribute').contains(attr1Value);
            cy.get('.cvat-object-item-radio-attribute').within(() => {
                cy.get('.ant-radio-wrapper-checked').should('have.text', attr2Value);
            });
        });
    }

    before(() => {
        cy.visit('/auth/login');
        cy.headlessLogin({ nextURL: '/tasks/create' });
        cy.get('#name').type(taskName);
        cy.addNewLabel({ name: label }, attributes);
        cy.selectFilesFromShare(serverFiles);
        cy.intercept('POST', '/api/tasks**').as('createTaskRequest');
        cy.intercept('GET', '/api/jobs**').as('getJobsRequest');
        cy.contains('button', 'Submit & Continue').click();
        cy.wait('@createTaskRequest').then((interception) => {
            expect(interception.response.statusCode).to.equal(201);
            taskID = interception.response.body.id;
        });
        cy.wait('@getJobsRequest').then((interception) => {
            expect(interception.response.statusCode).to.equal(200);
            jobID = interception.response.body.results[0].id;
        });
    });

    describe('Annotation view has correct default attribute after task creationg', () => {
        it('Rectangle has correct default attributes', () => {
            cy.visit(`/tasks/${taskID}/jobs/${jobID}`);
            cy.get('.cvat-canvas-container').should('exist').and('be.visible');
            checkCreatedObject(attributes[0].defaultValue, attributes[1].defaultValue);
        });
    });

    describe('Test can change default attribute', () => {
        it('Can change default attribute value on task page', () => {
            const newDefaultValue = 'third';
            cy.visit(`/tasks/${taskID}`);
            cy.get('.cvat-task-details').should('exist').and('be.visible');
            cy.get('.cvat-constructor-viewer-item').within(() => {
                cy.get('[aria-label="edit"]').click();
            });

            cy.get('.cvat-attribute-inputs-wrapper').then(($el) => {
                $el.each((_, el) => {
                    cy.wrap(el).within(() => {
                        cy.get('.ant-tag').contains(newDefaultValue).click();
                    });
                });
            });
            cy.get('button[type="submit"]').click();
            cy.visit(`/tasks/${taskID}/jobs/${jobID}`);
            cy.get('.cvat-canvas-container').should('exist').and('be.visible');
            checkCreatedObject(newDefaultValue, newDefaultValue);
        });
    });

    after(() => {
        cy.logout();
        cy.getAuthKey().then((response) => {
            const authKey = response.body.key;
            cy.request({
                method: 'DELETE',
                url: `/api/tasks/${taskID}`,
                headers: {
                    Authorization: `Token ${authKey}`,
                },
            });
        });
    });
});
