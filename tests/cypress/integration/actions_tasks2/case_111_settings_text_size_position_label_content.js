// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import {
    taskName,
    labelName,
    attrName,
    textDefaultValue,
} from '../../support/const';

context('Settings. Text size/position. Text labels content.', () => {
    const caseId = '111';
    const rectangleShape2Points = {
        points: 'By 2 Points',
        type: 'Shape',
        labelName,
        firstX: 100,
        firstY: 100,
        secondX: 500,
        secondY: 300,
    };
    const polygonTrack = {
        reDraw: false,
        type: 'Track',
        labelName,
        pointsMap: [
            { x: 100, y: 400 },
            { x: 550, y: 400 },
            { x: 550, y: 700 },
            { x: 100, y: 700 },
        ],
        complete: true,
        numberOfPoints: null,
    };

    function testTextPosition(shape, expectedPosition) {
        let shapeLeftPosition = 0;
        let shapeTopPosition = 0;
        let shapeWidth = 0;
        let shapeHeight = 0;
        let textLeftPosition = 0;
        let textTopPosition = 0;
        let getText;

        cy.get(shape).then(($shape) => {
            shapeLeftPosition = Math.trunc($shape.position().left);
            shapeTopPosition = Math.trunc($shape.position().top);
            if (shape === '#cvat_canvas_shape_1') {
                shapeWidth = $shape.attr('width');
                shapeHeight = $shape.attr('height');
            } else {
                const points = $shape.attr('points').split(' ');
                shapeWidth = +points[1].split(',')[0] - +points[0].split(',')[0];
                shapeHeight = +points[2].split(',')[1] - +points[0].split(',')[1];
            }
            if (shape === '#cvat_canvas_shape_1') {
                getText = cy.get('.cvat_canvas_text').first();
            } else {
                getText = cy.get('.cvat_canvas_text').last();
            }
            getText.then(($text) => {
                textLeftPosition = Math.trunc($text.position().left);
                textTopPosition = Math.trunc($text.position().top);
                if (expectedPosition === 'outside') {
                    // Text outside the shape of the right. Slightly below the shape upper edge.
                    expect(+shapeLeftPosition + +shapeWidth).lessThan(+textLeftPosition);
                    expect(+textTopPosition).to.be.within(+shapeTopPosition, +shapeTopPosition + 10);
                } else {
                    // Text inside the shape
                    expect(+shapeLeftPosition + +shapeWidth / 2).greaterThan(+textLeftPosition);
                    expect(+shapeTopPosition + +shapeHeight / 2).greaterThan(+textTopPosition);
                }
            });
        });
    }

    function testLabelTextContent(id) {
        let getTextContent;
        if (id === 1) {
            getTextContent = cy.get('.cvat_canvas_text').first();
        } else {
            getTextContent = cy.get('.cvat_canvas_text').last();
        }
        getTextContent.then(($labelText) => {
            const labelText = $labelText.text();
            expect(labelText).include(`${labelName} ${id} (manual)`);
            expect(labelText).include(`${attrName}: ${textDefaultValue}`);
        });
    }

    before(() => {
        cy.openTaskJob(taskName);
        cy.createRectangle(rectangleShape2Points);
        cy.createPolygon(polygonTrack);

        // Always show object details
        cy.openSettings();
        cy.get('.cvat-settings-modal').within(() => {
            cy.contains('Workspace').click();
            cy.get('.cvat-workspace-settings-show-text-always').within(() => {
                cy.get('[type="checkbox"]').check();
            });
        });
        cy.closeSettings();
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Text position.', () => {
            testTextPosition('#cvat_canvas_shape_1', 'outside');
            testTextPosition('#cvat_canvas_shape_2', 'outside');

            // Change the text position
            cy.openSettings();
            cy.get('.cvat-workspace-settings-text-position')
                .find('[title="Auto"]')
                .click();
            cy.get('.ant-select-dropdown')
                .not('.ant-select-dropdown-hidden')
                .find('[title="Center"]')
                .click();
            cy.closeSettings();

            testTextPosition('#cvat_canvas_shape_1', 'inside');
            testTextPosition('#cvat_canvas_shape_2', 'inside');
        });

        it('Text font size.', () => {
            cy.get('.cvat_canvas_text').should('have.attr', 'style', 'font-size: 14px;');
            cy.openSettings();

            // Change the text size to 16
            cy.get('.cvat-workspace-settings-text-size')
                .find('input')
                .should('have.attr', 'value', '14')
                .clear()
                .type('16')
                .should('have.attr', 'value', '16');
            cy.closeSettings();
            cy.get('.cvat_canvas_text').should('have.attr', 'style', 'font-size: 16px;');
        });

        it('Text labels content.', () => {
            cy.openSettings();
            cy.get('.cvat-workspace-settings-text-content').within(() => {
                cy.get('[aria-label="close"]').click({ multiple: true });
            });

            cy.get('.cvat-workspace-settings-text-content').click();
            cy.get('.ant-select-dropdown')
                .not('.ant-select-dropdown-hidden')
                .within(() => {
                    cy.get('[data-icon="check"]').should('have.length', 0);
                });

            cy.get('.cvat_canvas_text').each((el) => {
                expect(el.text()).to.be.equal('  ');
            });
            cy.get('.cvat_canvas_text_attribute').should('not.exist');
            cy.get('.cvat_canvas_text_description').should('not.exist');

            cy.get('.ant-select-dropdown')
                .not('.ant-select-dropdown-hidden')
                .within(() => {
                    const textContentItems = ['ID', 'Label', 'Attributes', 'Source', 'Descriptions'];
                    for (const item of textContentItems) {
                        cy.get(`[title=${item}]`).click();
                    }
                    cy.get('[data-icon="check"]').should('have.length', textContentItems.length);
                });

            testLabelTextContent(1);
            testLabelTextContent(2);
            cy.get('.cvat_canvas_text_attribute').should('have.length', 4);
            cy.get('.cvat_canvas_text_description').should('not.exist');
        });
    });
});
