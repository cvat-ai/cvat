// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, labelName, attrName, textDefaultValue } from '../../support/const';

context('Message in UI when raw labels are wrong.', () => {
    const issueId = '1498';
    let taskRaw = [
        {
            name: labelName,
            id: 1,
            color: '#c4a71f',
            attributes: [
                {
                    id: 1,
                    name: attrName,
                    input_type: 'text',
                    mutable: false,
                    values: [textDefaultValue],
                },
            ],
        },
    ];

    before(() => {
        cy.openTask(taskName);
        cy.get('[role="tab"]').contains('Raw').click();
    });

    beforeEach('Clear "Raw" field', () => {
        cy.get('#labels').clear();
        cy.task('log', '\n');
    });

    describe(`Testing issue "${issueId}"`, () => {
        it('"Raw" field is empty.', () => {
            cy.get('.ant-form-explain')
                .should('exist')
                .invoke('text')
                .then(($explainText) => {
                    cy.task('log', `- "${$explainText}"`);
                });
        });
        it('Label "name" as a number.', () => {
            let taskRawNameNumber = JSON.parse(JSON.stringify(taskRaw));
            taskRawNameNumber[0].name = 1;
            let jsonNameNumber = JSON.stringify(taskRawNameNumber);
            cy.get('#labels').type(jsonNameNumber, { parseSpecialCharSequences: false });
            cy.get('.ant-form-explain')
                .should('exist')
                .invoke('text')
                .then(($explainText) => {
                    cy.task('log', `- "${$explainText}"`);
                });
        });
        it('Label "id" as a string.', () => {
            let taskRawLabelString = JSON.parse(JSON.stringify(taskRaw));
            taskRawLabelString[0].id = '1';
            let jsonLabelString = JSON.stringify(taskRawLabelString);
            cy.get('#labels').type(jsonLabelString, { parseSpecialCharSequences: false });
            cy.get('.ant-form-explain')
                .should('exist')
                .invoke('text')
                .then(($explainText) => {
                    cy.task('log', `- "${$explainText}"`);
                });
        });
        it('Label "attributes" as a number.', () => {
            let taskRawAttrNumber = JSON.parse(JSON.stringify(taskRaw));
            taskRawAttrNumber[0].attributes = 1;
            let jsonAttrNumber = JSON.stringify(taskRawAttrNumber);
            cy.get('#labels').type(jsonAttrNumber, { parseSpecialCharSequences: false });
            cy.get('.ant-form-explain')
                .should('exist')
                .invoke('text')
                .then(($explainText) => {
                    cy.task('log', `- "${$explainText}"`);
                });
        });
        it('Label "color" as a number.', () => {
            let taskRawColorNumber = JSON.parse(JSON.stringify(taskRaw));
            taskRawColorNumber[0].color = 1;
            let jsonColorNumber = JSON.stringify(taskRawColorNumber);
            cy.get('#labels').type(jsonColorNumber, { parseSpecialCharSequences: false });
            cy.get('.ant-form-explain')
                .should('exist')
                .invoke('text')
                .then(($explainText) => {
                    cy.task('log', `- "${$explainText}"`);
                });
        });
        it('Label "attributes id" as a string.', () => {
            let taskRawAttrIdString = JSON.parse(JSON.stringify(taskRaw));
            taskRawAttrIdString[0].attributes[0].id = '1';
            let jsonAttrIdString = JSON.stringify(taskRawAttrIdString);
            cy.get('#labels').type(jsonAttrIdString, { parseSpecialCharSequences: false });
            cy.get('.ant-form-explain')
                .should('exist')
                .invoke('text')
                .then(($explainText) => {
                    cy.task('log', `- "${$explainText}"`);
                });
        });
        it('Label "attributes input_type" is incorrect.', () => {
            const inputTypes = ['select radio', 'textt', 'nnumber'];
            let taskRawAttrTypeNumber = JSON.parse(JSON.stringify(taskRaw));
            for (let type of inputTypes) {
                taskRawAttrTypeNumber[0].attributes[0].input_type = type;
                let jsonAttrTypeNumber = JSON.stringify(taskRawAttrTypeNumber);
                cy.get('#labels').type(jsonAttrTypeNumber, { parseSpecialCharSequences: false });
                cy.get('.ant-form-explain')
                    .should('exist')
                    .invoke('text')
                    .then(($explainText) => {
                        cy.task('log', `- "${$explainText}"`);
                    });
                cy.get('#labels').clear();
            }
        });
        it('Label "attributes mutable" as a number.', () => {
            let taskRawAttrMutableNumber = JSON.parse(JSON.stringify(taskRaw));
            taskRawAttrMutableNumber[0].attributes[0].mutable = 1;
            let jsonAttrMutableNumber = JSON.stringify(taskRawAttrMutableNumber);
            cy.get('#labels').type(jsonAttrMutableNumber, { parseSpecialCharSequences: false });
            cy.get('.ant-form-explain')
                .should('exist')
                .invoke('text')
                .then(($explainText) => {
                    cy.task('log', `- "${$explainText}"`);
                });
        });
        it('Label "attributes values" as a number.', () => {
            let taskRawAttrValuesNumber = JSON.parse(JSON.stringify(taskRaw));
            taskRawAttrValuesNumber[0].attributes[0].values = 1;
            let jsonAttrValueNumber = JSON.stringify(taskRawAttrValuesNumber);
            cy.get('#labels').type(jsonAttrValueNumber, { parseSpecialCharSequences: false });
            cy.get('.ant-form-explain')
                .should('exist')
                .invoke('text')
                .then(($explainText) => {
                    cy.task('log', `- "${$explainText}"`);
                });
        });
        it('Label "attributes values" as a array with number.', () => {
            let taskRawAttrValuesNumberArr = JSON.parse(JSON.stringify(taskRaw));
            taskRawAttrValuesNumberArr[0].attributes[0].values = [1];
            let jsonAttrValuesNumberArr = JSON.stringify(taskRawAttrValuesNumberArr);
            cy.get('#labels').type(jsonAttrValuesNumberArr, { parseSpecialCharSequences: false });
            cy.get('.ant-form-explain')
                .should('exist')
                .invoke('text')
                .then(($explainText) => {
                    cy.task('log', `- "${$explainText}"`);
                });
        });
        it('Label "attributes name" as a number.', () => {
            let taskRawAttrNameNumber = JSON.parse(JSON.stringify(taskRaw));
            taskRawAttrNameNumber[0].attributes[0].name = 1;
            let jsonAttrNameNumber = JSON.stringify(taskRawAttrNameNumber);
            cy.get('#labels').type(jsonAttrNameNumber, { parseSpecialCharSequences: false });
            cy.get('.ant-form-explain')
                .should('exist')
                .invoke('text')
                .then(($explainText) => {
                    cy.task('log', `- "${$explainText}"`);
                });
        });
        it('Label "attributes values" as a empty array.', () => {
            let taskRawAttrValuesEmptyArr = JSON.parse(JSON.stringify(taskRaw));
            taskRawAttrValuesEmptyArr[0].attributes[0].values = [];
            let jsonAttrValuesEmptyArr = JSON.stringify(taskRawAttrValuesEmptyArr);
            cy.get('#labels').type(jsonAttrValuesEmptyArr, { parseSpecialCharSequences: false });
            cy.get('.ant-form-explain')
                .should('exist')
                .invoke('text')
                .then(($explainText) => {
                    cy.task('log', `- "${$explainText}"`);
                });
        });
    });
});
