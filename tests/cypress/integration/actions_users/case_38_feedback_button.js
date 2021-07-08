// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context('Check feedback button.', () => {
    const caseId = '38';

    before(() => {
        cy.visit('auth/login');
        cy.login();
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Feedback button is available.', () => {
            cy.get('.cvat-feedback-button').should('be.visible').click();
        });

        it('Feedback popover is available. Check content.', () => {
            cy.get('.cvat-feedback-popover')
                .should('be.visible')
                .within(() => {
                    cy.get('a').then(($a) => {
                        expect($a.length).be.equal(3);
                        expect($a[0].href).be.eq('https://github.com/openvinotoolkit/cvat');
                        expect($a[1].href).be.eq('https://gitter.im/opencv-cvat/public');
                        expect($a[2].href).be.eq($a[1].href);
                    });
                    const socialNetworkList = [
                        'facebook',
                        'vk',
                        'twitter',
                        'reddit',
                        'linkedin',
                        'telegram',
                        'whatsapp',
                        'viber',
                    ];
                    socialNetworkList.forEach(($el) => {
                        cy.get(`[aria-label=${$el}]`).should('be.visible');
                    });
                });
        });
    });
});
