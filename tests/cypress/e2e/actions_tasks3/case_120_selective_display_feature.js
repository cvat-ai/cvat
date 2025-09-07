// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context('Settings. Selective Display Feature.', () => {
    const caseId = '120';
    const taskName = 'Test selective display feature';
    const labelName1 = 'Person';
    const labelName2 = 'Vehicle';
    const labelName3 = 'Background';
    const serverFiles = ['images/image_1.jpg', 'images/image_2.jpg', 'images/image_3.jpg'];
    const attrName1 = 'Color';
    const attrName2 = 'Size';
    const attrName3 = 'Visible';
    const textDefaultValue1 = 'red';
    const textDefaultValue2 = 'large';
    const textDefaultValue3 = 'yes';
    let taskID = null;
    let jobID = null;

    const rectangleShape1 = {
        points: 'By 2 Points',
        type: 'Shape',
        labelName: labelName1,
        firstX: 100,
        firstY: 100,
        secondX: 200,
        secondY: 150,
    };

    const rectangleShape2 = {
        points: 'By 2 Points',
        type: 'Shape',
        labelName: labelName2,
        firstX: 250,
        firstY: 100,
        secondX: 350,
        secondY: 150,
    };

    const rectangleShape3 = {
        points: 'By 2 Points',
        type: 'Shape',
        labelName: labelName3,
        firstX: 400,
        firstY: 100,
        secondX: 500,
        secondY: 150,
    };

    function checkTextVisibility(clientId, shouldBeVisible) {
        if (shouldBeVisible) {
            cy.get(`.cvat_canvas_text[data-client-id="${clientId}"]`).should('exist').and('be.visible');
        } else {
            cy.get(`.cvat_canvas_text[data-client-id="${clientId}"]`).should('not.exist');
        }
    }

    function checkAttributeVisibility(clientId, attributeNames) {
        cy.get(`.cvat_canvas_text[data-client-id="${clientId}"]`).then(($labelText) => {
            const labelText = $labelText.text();
            attributeNames.forEach((attrName) => {
                expect(labelText).include(attrName);
            });
        });
    }

    function checkSidebarAttributes(clientId, expectedAttributes) {
        cy.get(`#cvat-objects-sidebar-state-item-${clientId}`).click();
        cy.get(`#cvat_canvas_shape_${clientId}`).click();
        
        expectedAttributes.forEach((attrName) => {
            cy.get('.cvat-object-item-details').should('contain', attrName);
        });
    }

    before(() => {
        cy.visit('/auth/login');
        cy.login();
        cy.get('.cvat-tasks-page').should('exist').and('be.visible');

        cy.headlessCreateTask({
            labels: [
                {
                    name: labelName1,
                    attributes: [
                        {
                            name: attrName1,
                            mutable: false,
                            input_type: 'text',
                            default_value: textDefaultValue1,
                            values: [],
                        },
                        {
                            name: attrName2,
                            mutable: false,
                            input_type: 'text',
                            default_value: textDefaultValue2,
                            values: [],
                        },
                        {
                            name: attrName3,
                            mutable: false,
                            input_type: 'text',
                            default_value: textDefaultValue3,
                            values: [],
                        },
                    ],
                    type: 'any',
                },
                {
                    name: labelName2,
                    attributes: [
                        {
                            name: attrName1,
                            mutable: false,
                            input_type: 'text',
                            default_value: textDefaultValue1,
                            values: [],
                        },
                        {
                            name: attrName2,
                            mutable: false,
                            input_type: 'text',
                            default_value: textDefaultValue2,
                            values: [],
                        },
                    ],
                    type: 'any',
                },
                {
                    name: labelName3,
                    attributes: [
                        {
                            name: attrName1,
                            mutable: false,
                            input_type: 'text',
                            default_value: textDefaultValue1,
                            values: [],
                        },
                    ],
                    type: 'any',
                },
            ],
            name: taskName,
            project_id: null,
            source_storage: { location: 'local' },
            target_storage: { location: 'local' },
        }, {
            server_files: serverFiles,
            image_quality: 70,
            use_zip_chunks: true,
            use_cache: true,
            sorting_method: 'lexicographical',
        }).then((response) => {
            taskID = response.taskID;
            [jobID] = response.jobIDs;
        }).then(() => {
            cy.visit(`/tasks/${taskID}/jobs/${jobID}`);
            cy.get('.cvat-canvas-container').should('exist').and('be.visible');

            // Create shapes with different labels
            cy.createRectangle(rectangleShape1);
            cy.createRectangle(rectangleShape2);
            cy.createRectangle(rectangleShape3);

            // Enable "Always show object details" first
            cy.openSettings();
            cy.get('.cvat-settings-modal').within(() => {
                cy.contains('Workspace').click();
                cy.get('.cvat-workspace-settings-show-text-always').within(() => {
                    cy.get('[type="checkbox"]').check();
                });
            });
            cy.closeSettings();
        });
    });

    describe(`Testing case "${caseId}"`, () => {
        it('All objects should be visible by default', () => {
            // Check that all shapes have visible text
            checkTextVisibility(1, true);
            checkTextVisibility(2, true);
            checkTextVisibility(3, true);
        });

        it('Enable selective display', () => {
            cy.openSettings();
            cy.get('.cvat-settings-modal').within(() => {
                cy.contains('Workspace').click();
                
                // Enable selective display
                cy.get('.cvat-workspace-settings-selective-display').within(() => {
                    cy.get('[type="checkbox"]').check();
                });

                // Initially no labels are selected, so no dropdowns should appear
                cy.get('.cvat-workspace-settings-selective-labels').should('not.exist');
            });
            cy.closeSettings();

            // With selective display enabled but no labels selected, no text should be visible
            checkTextVisibility(1, false);
            checkTextVisibility(2, false);
            checkTextVisibility(3, false);
        });

        it('Select specific labels to show', () => {
            cy.openSettings();
            cy.get('.cvat-settings-modal').within(() => {
                cy.contains('Workspace').click();
                
                // Select labels to show
                cy.get('.cvat-workspace-settings-selective-labels-select').click();
                cy.get('.ant-select-dropdown')
                    .not('.ant-select-dropdown-hidden')
                    .within(() => {
                        cy.get(`[title="${labelName1}"]`).click();
                        cy.get(`[title="${labelName2}"]`).click();
                    });

                // Click outside to close dropdown
                cy.get('.cvat-settings-modal').click();
            });
            cy.closeSettings();

            // Only selected label objects should be visible
            checkTextVisibility(1, true); // Person
            checkTextVisibility(2, true); // Vehicle
            checkTextVisibility(3, false); // Background (not selected)
        });

        it('Select specific attributes for labels', () => {
            cy.openSettings();
            cy.get('.cvat-settings-modal').within(() => {
                cy.contains('Workspace').click();
                
                // Should see attribute selectors for selected labels
                cy.contains(`Attributes for "${labelName1}"`).should('exist');
                cy.contains(`Attributes for "${labelName2}"`).should('exist');

                // Select specific attributes for Person label
                cy.get('.cvat-workspace-settings-selective-attributes-select').first().click();
                cy.get('.ant-select-dropdown')
                    .not('.ant-select-dropdown-hidden')
                    .within(() => {
                        cy.get(`[title="${attrName1}"]`).click(); // Color
                        cy.get(`[title="${attrName3}"]`).click(); // Visible
                    });
                
                // Click outside to close dropdown
                cy.get('.cvat-settings-modal').click();

                // Select attributes for Vehicle label
                cy.get('.cvat-workspace-settings-selective-attributes-select').last().click();
                cy.get('.ant-select-dropdown')
                    .not('.ant-select-dropdown-hidden')
                    .within(() => {
                        cy.get(`[title="${attrName2}"]`).click(); // Size
                    });

                // Click outside to close dropdown
                cy.get('.cvat-settings-modal').click();
            });
            cy.closeSettings();

            // Check that only selected attributes are visible in canvas text
            checkAttributeVisibility(1, [attrName1, attrName3]); // Person: Color, Visible
            checkAttributeVisibility(2, [attrName2]); // Vehicle: Size
        });

        it('Sidebar should respect selective display settings', () => {
            // Check sidebar attributes for Person (should show Color and Visible only)
            checkSidebarAttributes(1, [attrName1, attrName3]);
            
            // Check sidebar attributes for Vehicle (should show Size only)
            checkSidebarAttributes(2, [attrName2]);
        });

        it('Disable selective display should show all objects again', () => {
            cy.openSettings();
            cy.get('.cvat-settings-modal').within(() => {
                cy.contains('Workspace').click();
                
                // Disable selective display
                cy.get('.cvat-workspace-settings-selective-display').within(() => {
                    cy.get('[type="checkbox"]').uncheck();
                });
            });
            cy.closeSettings();

            // All objects should be visible again
            checkTextVisibility(1, true);
            checkTextVisibility(2, true);
            checkTextVisibility(3, true);

            // All attributes should be visible again
            checkAttributeVisibility(1, [attrName1, attrName2, attrName3]);
            checkAttributeVisibility(2, [attrName1, attrName2]);
            checkAttributeVisibility(3, [attrName1]);
        });

        it('Selective display works independently of "Always show object details"', () => {
            // Enable selective display again
            cy.openSettings();
            cy.get('.cvat-settings-modal').within(() => {
                cy.contains('Workspace').click();
                
                cy.get('.cvat-workspace-settings-selective-display').within(() => {
                    cy.get('[type="checkbox"]').check();
                });

                // Select Person label only
                cy.get('.cvat-workspace-settings-selective-labels-select').click();
                cy.get('.ant-select-dropdown')
                    .not('.ant-select-dropdown-hidden')
                    .within(() => {
                        cy.get(`[title="${labelName1}"]`).click();
                    });
                
                // Click outside to close dropdown
                cy.get('.cvat-settings-modal').click();
            });
            cy.closeSettings();

            // Only Person should be visible
            checkTextVisibility(1, true);
            checkTextVisibility(2, false);
            checkTextVisibility(3, false);

            // Disable "Always show object details"
            cy.openSettings();
            cy.get('.cvat-settings-modal').within(() => {
                cy.contains('Workspace').click();
                cy.get('.cvat-workspace-settings-show-text-always').within(() => {
                    cy.get('[type="checkbox"]').uncheck();
                });
            });
            cy.closeSettings();

            // Selective display should still work - only Person text visible when hovering
            cy.get('#cvat_canvas_shape_1').trigger('mouseover');
            checkTextVisibility(1, true);
            
            cy.get('#cvat_canvas_shape_2').trigger('mouseover');
            checkTextVisibility(2, false);
            
            cy.get('#cvat_canvas_shape_3').trigger('mouseover');
            checkTextVisibility(3, false);
        });
    });
});