// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, labelName, attrName } from '../../support/const';

context('Validation of numerical attributes in the raw label editor.', () => {
    const issueId = '11034';

    function rawLabels(inputType, values) {
        return JSON.stringify([{
            name: labelName,
            color: '#c4a71f',
            type: 'any',
            attributes: [{
                name: attrName,
                input_type: inputType,
                mutable: false,
                values,
            }],
        }]);
    }

    function typeRawLabels(inputType, values) {
        cy.get('#labels').clear();
        cy.get('#labels').type(rawLabels(inputType, values), { parseSpecialCharSequences: false });
    }

    before(() => {
        cy.prepareUserSession();
        cy.openTask(taskName);
        cy.get('[role="tab"]').contains('Raw').click();
    });

    describe(`Testing issue "${issueId}"`, () => {
        it('A range whose bounds repeat is accepted.', () => {
            // "1;4;1" is stored as ["1", "4", "1"], and the repeated "1" used to be
            // reported as a duplicate value
            typeRawLabels('number', ['1', '4', '1']);
            cy.get('.ant-form-item-explain-error').should('not.exist');
            cy.get('.cvat-submit-raw-labels-conf-button').should('not.be.disabled');
        });

        it('An invalid range is rejected.', () => {
            const invalidRanges = [
                [['1', '4'], 'three numbers are expected'],
                [['1', 'four', '1'], '"four" is not a number'],
                [['4', '1', '1'], 'minimum must be less than maximum'],
                [['1', '4', '5'], 'step must be less than minmax difference'],
                [['1', '4', '0'], 'step must be a positive number'],
            ];

            for (const [values, message] of invalidRanges) {
                typeRawLabels('number', values);
                cy.get('.ant-form-item-explain-error').should('contain.text', message);
                cy.get('.cvat-submit-raw-labels-conf-button').should('be.disabled');
            }
        });

        it('Duplicated values of a non-numerical attribute are still rejected.', () => {
            typeRawLabels('select', ['first', 'second', 'first']);
            cy.get('.ant-form-item-explain-error').should('contain.text', 'attribute values must be unique');
            cy.get('.cvat-submit-raw-labels-conf-button').should('be.disabled');
        });
    });
});
