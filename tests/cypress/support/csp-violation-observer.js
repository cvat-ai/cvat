// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

let violations = [];

function recordViolation(event, win) {
    violations.push({
        blockedURI: event.blockedURI || '(inline)',
        columnNumber: event.columnNumber,
        disposition: event.disposition,
        documentURI: event.documentURI || win.location.href,
        effectiveDirective: event.effectiveDirective,
        lineNumber: event.lineNumber,
        originalPolicy: event.originalPolicy,
        sourceFile: event.sourceFile,
        violatedDirective: event.violatedDirective,
    });
}

Cypress.on('window:before:load', (win) => {
    win.document.addEventListener('securitypolicyviolation', (event) => {
        recordViolation(event, win);
    });
});

beforeEach(() => {
    violations = [];
});

afterEach(() => {
    cy.then(() => {
        if (!violations.length) {
            return;
        }

        throw new Error(`Unexpected Content Security Policy violations:\n${JSON.stringify(violations, null, 4)}`);
    });
});
