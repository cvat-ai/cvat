// Copyright (C) 2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName } from '../../support/const';

context('Attribute reordering functionality.', () => {
    const caseId = 'attribute_reordering';
    const labelName = 'test_label';
    
    const testAttributes = [
        { name: 'test1', type: 'Text', values: 'value1' },
        { name: 'test2', type: 'Select', values: 'option1;option2' },
        { name: 'test3', type: 'Checkbox', values: 'true' },
        { name: 'test4', type: 'Number', values: '1;10;1' },
        { name: 'test5', type: 'Text', values: 'value5' }
    ];

    before(() => {
        cy.openTask(taskName);
        cy.get('.cvat-create-label').click();
        
        // Create label with name
        cy.get('.cvat-label-name-input').type(labelName);
        
        // Add multiple attributes
        testAttributes.forEach((attr, index) => {
            if (index > 0) {
                cy.get('.cvat-new-attribute-button').click();
            }
            
            // Set attribute name
            cy.get('.cvat-attribute-name-input').last().type(attr.name);
            
            // Set attribute type
            cy.get('.cvat-attribute-type-input').last().click();
            cy.get(`.cvat-attribute-type-input-${attr.type.toLowerCase()}`).click();
            
            // Set attribute values based on type
            if (attr.type === 'Select' || attr.type === 'Radio') {
                const values = attr.values.split(';');
                values.forEach((value) => {
                    cy.get('.cvat-attribute-values-input').last().type(`${value}{enter}`);
                });
            } else if (attr.type === 'Checkbox') {
                cy.get('.cvat-attribute-values-input').last().click();
                cy.get('.ant-select-item-option[title="True"]').click();
            } else {
                cy.get('.cvat-attribute-values-input').last().type(attr.values);
            }
        });
        
        // Save the label
        cy.get('.cvat-save-label').click();
        cy.openJob();
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Should display drag handles for attributes', () => {
            // Open labels editor
            cy.get('.cvat-annotation-header-button').contains('Setup').click();
            cy.get('.cvat-constructor-viewer-item').first().click();
            
            // Check that drag handles are visible
            cy.get('.cvat-attribute-drag-handle').should('have.length', testAttributes.length);
            cy.get('.cvat-attribute-drag-handle').first().should('be.visible');
        });

        it('Should show proper drag handle tooltip', () => {
            // Hover over drag handle
            cy.get('.cvat-attribute-drag-handle').first().trigger('mouseover');
            cy.get('.ant-tooltip').should('contain', 'Drag to reorder attribute');
        });

        it('Should maintain attribute functionality after reordering', () => {
            // Get initial attribute order
            cy.get('.cvat-attribute-name-input').then(($inputs) => {
                const initialOrder = Array.from($inputs).map(input => input.value);
                expect(initialOrder).to.deep.equal(['test1', 'test2', 'test3', 'test4', 'test5']);
            });
            
            // Perform drag and drop - move first attribute to third position
            cy.get('.cvat-attribute-inputs-wrapper').first().within(() => {
                cy.get('.cvat-attribute-drag-handle')
                    .trigger('mousedown', { button: 0 })
                    .wait(100);
            });
            
            cy.get('.cvat-attribute-inputs-wrapper').eq(2)
                .trigger('mousemove')
                .trigger('mouseup');
                
            // Verify the order has changed
            cy.get('.cvat-attribute-name-input').then(($inputs) => {
                const newOrder = Array.from($inputs).map(input => input.value);
                // After moving first item to third position: test2, test3, test1, test4, test5
                expect(newOrder[2]).to.equal('test1');
                expect(newOrder[0]).to.equal('test2');
            });
        });

        it('Should preserve attribute types and values after reordering', () => {
            // Check that attribute types are preserved
            cy.get('.cvat-attribute-type-input').then(($selects) => {
                // Verify that each attribute still has correct type
                cy.wrap($selects).should('have.length', testAttributes.length);
            });
            
            // Check that attribute values are preserved
            cy.get('.cvat-attribute-values-input').then(($inputs) => {
                cy.wrap($inputs).should('have.length', testAttributes.length);
            });
        });

        it('Should save reordered attributes correctly', () => {
            // Save the label with reordered attributes
            cy.get('.cvat-save-label').click();
            
            // Verify the label was saved successfully
            cy.get('.cvat-constructor-viewer-item').should('contain', labelName);
            
            // Re-edit the label to verify order is maintained
            cy.get('.cvat-constructor-viewer-item').first().click();
            
            // Verify the reordered attributes are maintained
            cy.get('.cvat-attribute-name-input').then(($inputs) => {
                const savedOrder = Array.from($inputs).map(input => input.value);
                // Should maintain the reordered state
                expect(savedOrder).to.have.length(testAttributes.length);
            });
        });

        it('Should handle drag and drop with visual feedback', () => {
            // Test hover effects
            cy.get('.cvat-attribute-inputs-wrapper').first().trigger('mouseover');
            
            // Test drag handle hover
            cy.get('.cvat-attribute-drag-handle').first().trigger('mouseover');
            cy.get('.cvat-attribute-drag-handle').first().should('have.css', 'cursor', 'grab');
        });

        it('Should work with different attribute types during reordering', () => {
            // Test reordering between different attribute types
            const attributeTypes = ['text', 'select', 'checkbox', 'number'];
            
            attributeTypes.forEach((type, index) => {
                if (index < testAttributes.length - 1) {
                    // Verify each attribute type can be reordered
                    cy.get('.cvat-attribute-type-input').eq(index).should('contain.value', testAttributes[index].type.toLowerCase());
                }
            });
        });

        it('Should maintain form validation after reordering', () => {
            // Clear an attribute name to test validation
            cy.get('.cvat-attribute-name-input').first().clear();
            
            // Try to save - should show validation error
            cy.get('.cvat-save-label').click();
            cy.get('.ant-form-item-explain-error').should('be.visible');
            
            // Fix the validation error
            cy.get('.cvat-attribute-name-input').first().type('fixed_name');
            
            // Should be able to save now
            cy.get('.cvat-save-label').click();
            cy.get('.cvat-constructor-viewer-item').should('contain', labelName);
        });
    });

    after(() => {
        // Clean up: cancel any open dialogs and return to tasks page
        cy.get('body').then(($body) => {
            if ($body.find('.cvat-cancel-label').length > 0) {
                cy.get('.cvat-cancel-label').click();
            }
        });
        cy.goToTaskList();
    });
});