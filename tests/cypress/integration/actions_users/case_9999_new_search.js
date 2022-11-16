// Copyright (C) 2021-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context('Search a task', () => {
    const caseId = '39';
    const labelName = `Case ${caseId}`;
    const taskName = `New annotation task for ${labelName}`;
    const attrName = `Attr for ${labelName}`;
    const textDefaultValue = 'Some default value for type Text';
    const imageFileName = `image_${labelName.replace(' ', '_').toLowerCase()}`;
    const archiveName = `${imageFileName}.zip`;

    function searchTask(par) {
        cy.get('[placeholder="Search ..."]').type(`${par}{Enter}`);
    }

    before(() => {
        cy.visit('auth/login');
        cy.login();
        cy.goToTaskList();
        cy.createAnnotationTask(taskName, labelName, attrName, textDefaultValue, archiveName);
    });

    after(() => {
        cy.visit('/tasks');
        cy.deleteTask(taskName);
        cy.logout();
    });

    describe('Checking the search function', () => {
        it('Search a task by caseId', () => {
            cy.goToTaskList();
            searchTask(caseId);
            cy.openTask(taskName);
        });
    });
});
