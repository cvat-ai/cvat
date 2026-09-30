// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

it('Prepare for testing audio workspace', () => {
    cy.visit('/auth/login');
    cy.headlessLogin();
    cy.ensureAudioTask();
});
