// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import {
    taskName, labelName, attrName, textDefaultValue,
} from '../../support/const';

context('Message in UI when raw labels are wrong.', () => {
    const issueId = '1498';
    const taskRaw = [
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
            cy.get('.ant-form-item-explain')
                .should('exist')
                .invoke('text')
                .then(($explainText) => {
                    cy.task('log', `- "${$explainText}"`);
                });
        });
        it('Label "name" as a number.', () => {
            const taskRawNameNumber = JSON.parse(JSON.stringify(taskRaw));
            taskRawNameNumber[0].name = 1;
            const jsonNameNumber = JSON.stringify(taskRawNameNumber);
            cy.get('#labels').type(jsonNameNumber, { parseSpecialCharSequences: false });
            cy.get('.ant-form-item-explain')
                .should('exist')
                .invoke('text')
                .then(($explainText) => {
                    cy.task('log', `- "${$explainText}"`);
                });
        });
        it('Label "id" as a string.', () => {
            const taskRawLabelString = JSON.parse(JSON.stringify(taskRaw));
            taskRawLabelString[0].id = '1';
            const jsonLabelString = JSON.stringify(taskRawLabelString);
            cy.get('#labels').type(jsonLabelString, { parseSpecialCharSequences: false });
            cy.get('.ant-form-item-explain')
                .should('exist')
                .invoke('text')
                .then(($explainText) => {
                    cy.task('log', `- "${$explainText}"`);
                });
        });
        it('Label "attributes" as a number.', () => {
            const taskRawAttrNumber = JSON.parse(JSON.stringify(taskRaw));
            taskRawAttrNumber[0].attributes = 1;
            const jsonAttrNumber = JSON.stringify(taskRawAttrNumber);
            cy.get('#labels').type(jsonAttrNumber, { parseSpecialCharSequences: false });
            cy.get('.ant-form-item-explain')
                .should('exist')
                .invoke('text')
                .then(($explainText) => {
                    cy.task('log', `- "${$explainText}"`);
                });
        });
        it('Label "color" as a number.', () => {
            const taskRawColorNumber = JSON.parse(JSON.stringify(taskRaw));
            taskRawColorNumber[0].color = 1;
            const jsonColorNumber = JSON.stringify(taskRawColorNumber);
            cy.get('#labels').type(jsonColorNumber, { parseSpecialCharSequences: false });
            cy.get('.ant-form-item-explain')
                .should('exist')
                .invoke('text')
                .then(($explainText) => {
                    cy.task('log', `- "${$explainText}"`);
                });
        });
        it('Label "attributes id" as a string.', () => {
            const taskRawAttrIdString = JSON.parse(JSON.stringify(taskRaw));
            taskRawAttrIdString[0].attributes[0].id = '1';
            const jsonAttrIdString = JSON.stringify(taskRawAttrIdString);
            cy.get('#labels').type(jsonAttrIdString, { parseSpecialCharSequences: false });
            cy.get('.ant-form-item-explain')
                .should('exist')
                .invoke('text')
                .then(($explainText) => {
                    cy.task('log', `- "${$explainText}"`);
                });
        });
        it('Label "attributes input_type" is incorrect.', () => {
            const inputTypes = ['select radio', 'textt', 'nnumber'];
            const taskRawAttrTypeNumber = JSON.parse(JSON.stringify(taskRaw));
            for (const type of inputTypes) {
                taskRawAttrTypeNumber[0].attributes[0].input_type = type;
                const jsonAttrTypeNumber = JSON.stringify(taskRawAttrTypeNumber);
                cy.get('#labels').type(jsonAttrTypeNumber, { parseSpecialCharSequences: false });
                cy.get('.ant-form-item-explain')
                    .should('exist')
                    .invoke('text')
                    .then(($explainText) => {
                        cy.task('log', `- "${$explainText}"`);
                    });
                cy.get('#labels').clear();
            }
        });
        it('Label "attributes mutable" as a number.', () => {
            const taskRawAttrMutableNumber = JSON.parse(JSON.stringify(taskRaw));
            taskRawAttrMutableNumber[0].attributes[0].mutable = 1;
            const jsonAttrMutableNumber = JSON.stringify(taskRawAttrMutableNumber);
            cy.get('#labels').type(jsonAttrMutableNumber, { parseSpecialCharSequences: false });
            cy.get('.ant-form-item-explain')
                .should('exist')
                .invoke('text')
                .then(($explainText) => {
                    cy.task('log', `- "${$explainText}"`);
                });
        });
        it('Label "attributes values" as a number.', () => {
            const taskRawAttrValuesNumber = JSON.parse(JSON.stringify(taskRaw));
            taskRawAttrValuesNumber[0].attributes[0].values = 1;
            const jsonAttrValueNumber = JSON.stringify(taskRawAttrValuesNumber);
            cy.get('#labels').type(jsonAttrValueNumber, { parseSpecialCharSequences: false });
            cy.get('.ant-form-item-explain')
                .should('exist')
                .invoke('text')
                .then(($explainText) => {
                    cy.task('log', `- "${$explainText}"`);
                });
        });
        it('Label "attributes values" as a array with number.', () => {
            const taskRawAttrValuesNumberArr = JSON.parse(JSON.stringify(taskRaw));
            taskRawAttrValuesNumberArr[0].attributes[0].values = [1];
            const jsonAttrValuesNumberArr = JSON.stringify(taskRawAttrValuesNumberArr);
            cy.get('#labels').type(jsonAttrValuesNumberArr, { parseSpecialCharSequences: false });
            cy.get('.ant-form-item-explain')
                .should('exist')
                .invoke('text')
                .then(($explainText) => {
                    cy.task('log', `- "${$explainText}"`);
                });
        });
        it('Label "attributes name" as a number.', () => {
            const taskRawAttrNameNumber = JSON.parse(JSON.stringify(taskRaw));
            taskRawAttrNameNumber[0].attributes[0].name = 1;
            const jsonAttrNameNumber = JSON.stringify(taskRawAttrNameNumber);
            cy.get('#labels').type(jsonAttrNameNumber, { parseSpecialCharSequences: false });
            cy.get('.ant-form-item-explain')
                .should('exist')
                .invoke('text')
                .then(($explainText) => {
                    cy.task('log', `- "${$explainText}"`);
                });
        });
        it('Label "attributes values" as a empty array.', () => {
            const taskRawAttrValuesEmptyArr = JSON.parse(JSON.stringify(taskRaw));
            taskRawAttrValuesEmptyArr[0].attributes[0].values = [];
            const jsonAttrValuesEmptyArr = JSON.stringify(taskRawAttrValuesEmptyArr);
            cy.get('#labels').type(jsonAttrValuesEmptyArr, { parseSpecialCharSequences: false });
            cy.get('.ant-form-item-explain')
                .should('exist')
                .invoke('text')
                .then(($explainText) => {
                    cy.task('log', `- "${$explainText}"`);
                });
        });
    });
});
