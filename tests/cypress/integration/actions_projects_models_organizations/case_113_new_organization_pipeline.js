// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context('New organization pipeline.', () => {
    const caseId = '113';
    const firstUserName = 'Firstuser';
    const secondUserName = 'Seconduser';
    const thirdUserName = 'Thirduser';

    const firstUser = {
        firstName: `${firstUserName} fitstname`,
        lastName: `${firstUserName} lastname`,
        emailAddr: `${firstUserName.toLowerCase()}@local.local`,
        password: 'UfdU21!dds',
    };
    const secondUser = {
        firstName: `${secondUserName} fitstname`,
        lastName: `${secondUserName} lastname`,
        emailAddr: `${secondUserName.toLowerCase()}@local.local`,
        password: 'UfdU21!dds',
    };
    const thirdUser = {
        firstName: `${thirdUserName} fitstname`,
        lastName: `${thirdUserName} lastname`,
        emailAddr: `${thirdUserName.toLowerCase()}@local.local`,
        password: 'Fv5Df3#f55g',
    };
    const organizationParams = {
        shortName: 'TestOrganization',
        fullName: 'Organization full name. Only for test.',
        description: 'This organization was created to test the functionality.',
        email: 'testorganization@local.local',
        phoneNumber: '+70000000000',
        location: 'Country, State, Address, 000000',
    };

    before(() => {
        cy.clearLocalStorage();
        cy.visit('auth/register');

        cy.userRegistration(
            firstUser.firstName,
            firstUser.lastName,
            firstUserName,
            firstUser.emailAddr,
            firstUser.password,
        );
        cy.logout(firstUserName);
        cy.goToRegisterPage();

        cy.userRegistration(
            secondUser.firstName,
            secondUser.lastName,
            secondUserName,
            secondUser.emailAddr,
            secondUser.password,
        );
        cy.logout(secondUserName);
        cy.goToRegisterPage();

        cy.userRegistration(
            thirdUser.firstName,
            thirdUser.lastName,
            thirdUserName,
            thirdUser.emailAddr,
            thirdUser.password,
        );
        cy.logout(thirdUserName);

        cy.login(firstUserName, firstUser.password);
    });

    beforeEach(() => {
        Cypress.Cookies.preserveOnce('sessionid', 'csrftoken');
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Create an organization.', () => {
            cy.createOrganization(organizationParams);
        });

        it('Activate the organization.', () => {
            cy.activateOrganization(organizationParams.shortName);
            cy.get('.cvat-header-menu-user-dropdown').should('contain.text', organizationParams.shortName);
        });

        it('Open the organization settings.', () => {
            cy.openOrganization(organizationParams.shortName);
        });
    });
});
