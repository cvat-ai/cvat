// Copyright (C) 2023-2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context('Cloudstorages', () => {
    before(() => {
        cy.visit('auth/login');
        cy.login();
        cy.visit('/cloudstorages');
    });

    const nonExistCloudstorageId = 99;

    describe('Cloudstorage page', () => {
        it('Verify that attempting to update a non-existent cloud storage displays an error message', () => {
            cy.intercept({
                method: 'GET',
                url: `/api/cloudstorages/${nonExistCloudstorageId}`,
            }).as('cloudstorageRequest');

            cy.visit(`/cloudstorages/update/${nonExistCloudstorageId}`);
            cy.wait('@cloudstorageRequest').its('response.statusCode').should('eq', 404);
            cy.get('.cvat-spinner').should('not.exist');
            cy.contains('Sorry, but the requested cloud storage was not found');
        });
    });
});
