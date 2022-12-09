// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

const dummyData = {
    code: 'x'.repeat(20),
    process: 'login',
    authParams: '',
    scope: '',
    token: 'x'.repeat(40),
};

before(() => {
    cy.visit('/');
});

describe('Testing authentication through social accounts', () => {
    // it('Login with github. Logout', () => {
    //     cy.get('.cvat-social-authentication-github').should('be.visible');
    //     cy.intercept('GET', '/auth/github/login/', {
    //         statusCode: 200,
    //         body: {
    //             code: dummyData.code,
    //             auth_params: dummyData.authParams,
    //             scope: dummyData.scope,
    //             process: dummyData.process,
    //         },
    //     });
    //     cy.intercept('POST', '/api/auth/github/login/token**', {
    //         statusCode: 200,
    //         body: {
    //             key: dummyData.token,
    //         },
    //     }).as('getToken');
    //     cy.request({
    //         method: 'GET',
    //         url: '/api/auth/github/login/',
    //     }).then(async (response) => {
    //         console.log(response);
    //         cy.visit(
    //             '/auth/login-with-social-app?provider=github' +
    //             `&code=${dummyData.code}&auth_params=${dummyData.authParams}` +
    //             `&scope=${dummyData.scope}&process=${dummyData.process}`,
    //         );
    //         cy.wait('@getToken', { timeout: 10000 }).its('response.statusCode').should('equal', 200);
    //         expect(localStorage.getItem('token')).to.eq(dummyData.token);
    //     });

    //     // cy.logout();
    // });

    it('Login with google. Logout', () => {
        let username = '';
        cy.get('.cvat-social-authentication-google').should('be.visible').click();
        cy.wait(5000);
        cy.get('.cvat-right-header').within(() => {
            cy.get('.cvat-header-menu-user-dropdown-user').should(($div) => {
                username = $div.text();
            });
        }).then(() => {
            cy.logout(username);
        });
    });
});
