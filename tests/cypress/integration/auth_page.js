// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

describe('Check server availability', () => {
    it('Server web interface is available', () => {
        cy.visit('/');
    });

    it('"/auth/login" contains in the URL', () => {
        cy.url().should('include', '/auth/login');
    });

    it('"Sign in" button is exists', () => {
        cy.get('button[type="submit"]').should('exist');
    });

    it('Check placeholder "Username"', () => {
        cy.get('#credential').prev().should('contain', 'Email or username');
    });

    it('Enter value ib login field', () => {
        cy.get('#credential').type('Email or username');
    });

    it('Check placeholder "Password"', () => {
        cy.get('#password').should('exist');
    });

    it('Clear field username', () => {
        cy.get('#credential').clear();
    });

    it('Log in', () => {
        cy.login();
    });

    it('Log out', () => {
        cy.logout();
    });
});
