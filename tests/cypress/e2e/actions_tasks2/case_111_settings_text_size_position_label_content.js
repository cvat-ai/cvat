// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context('Settings. Text size/position. Text labels content.', () => {
    const caseId = '111';
    const taskName = 'Test text size/position task';
    const labelName = 'Test label';
    const serverFiles = ['images/image_1.jpg', 'images/image_2.jpg', 'images/image_3.jpg'];
    const attrName = 'Attr for test label';
    const textDefaultValue = 'Default attr for test label';
    let taskID = null;
    let jobID = null;

    const skeletonLabel = {
        name: 'skeleton',
        attributes: [],
        type: 'skeleton',
        svg: '<line x1="41.89224624633789" y1="49.40426254272461" x2="22.661476135253906" y2="39.20359420776367" ' +
             'stroke="black" data-type="edge" data-node-from="3" stroke-width="0.5" data-node-to="4"></line>' +
             '<line x1="73.49759674072266" y1="36.36078643798828" x2="41.89224624633789" y2="49.40426254272461"' +
             ' stroke="black" data-type="edge" data-node-from="2" stroke-width="0.5" data-node-to="3"></line>' +
             '<line x1="28.34709358215332" y1="17.2972412109375" x2="73.49759674072266" y2="36.36078643798828"' +
             ' stroke="black" data-type="edge" data-node-from="1" stroke-width="0.5" data-node-to="2"></line>' +
             '<circle r="1.5" stroke="black" fill="#b3b3b3" cx="28.34709358215332" cy="17.2972412109375" ' +
             'stroke-width="0.1" data-type="element node" data-element-id="1" data-node-id="1" data-label-name="1">' +
             '</circle><circle r="1.5" stroke="black" fill="#b3b3b3" cx="73.49759674072266" cy="36.36078643798828"' +
             ' stroke-width="0.1" data-type="element node" data-element-id="2" data-node-id="2" data-label-name="2">' +
             '</circle><circle r="1.5" stroke="black" fill="#b3b3b3" cx="41.89224624633789" cy="49.40426254272461"' +
             ' stroke-width="0.1" data-type="element node" data-element-id="3" data-node-id="3" data-label-name="3">' +
             '</circle><circle r="1.5" stroke="black" fill="#b3b3b3" cx="22.661476135253906" cy="39.20359420776367" ' +
             'stroke-width="0.1" data-type="element node" data-element-id="4" data-node-id="4" ' +
             'data-label-name="4"></circle>',
        sublabels: [
            {
                name: '1',
                attributes: [],
                type: 'points',
            },
            {
                name: '2',
                attributes: [],
                type: 'points',
            },
            {
                name: '3',
                attributes: [],
                type: 'points',
            },
            {
                name: '4',
                attributes: [],
                type: 'points',
            },
        ],
    };
    const rectangleShape2Points = {
        points: 'By 2 Points',
        type: 'Shape',
        labelName,
        firstX: 100,
        firstY: 100,
        secondX: 500,
        secondY: 200,
    };
    const polygonTrack = {
        reDraw: false,
        type: 'Track',
        labelName,
        pointsMap: [
            { x: 100, y: 210 },
            { x: 550, y: 210 },
            { x: 550, y: 400 },
            { x: 100, y: 400 },
        ],
        complete: true,
        numberOfPoints: null,
    };

    const maskDrawingActions = [{
        method: 'brush',
        coordinates: [[150, 600], [500, 600], [500, 800], [150, 800]],
    }];

    const skeletonType = 'Shape';
    const skeletonPosition = {
        xtl: 600,
        ytl: 600,
        xbr: 700,
        ybr: 700,
    };

    function testTextPosition(shape, expectedPosition) {
        let shapeLeftPosition = 0;
        let shapeTopPosition = 0;
        let shapeWidth = 0;
        let shapeHeight = 0;
        let textLeftPosition = 0;
        let textTopPosition = 0;

        cy.get(shape).trigger('mouseover');
        cy.get(shape).then(([shapeObj]) => {
            const shapeBBox = shapeObj.getBoundingClientRect();
            shapeLeftPosition = shapeBBox.left;
            shapeTopPosition = shapeBBox.top;
            shapeWidth = shapeBBox.width;
            shapeHeight = shapeBBox.height;

            const id = shape[shape.length - 1];
            cy.get(`.cvat_canvas_text[data-client-id="${id}"]`)
                .then(([textObj]) => {
                    const textBBox = textObj.getBoundingClientRect();
                    textLeftPosition = textBBox.left;
                    textTopPosition = textBBox.top;

                    if (expectedPosition === 'outside') {
                        // Text outside the shape of the right. Slightly below the shape upper edge.
                        expect(+shapeLeftPosition + +shapeWidth).lessThan(+textLeftPosition);
                        expect(+textTopPosition).to.be.within(+shapeTopPosition, +shapeTopPosition + 15);
                    } else {
                        // Text inside the shape
                        expect(+shapeLeftPosition + +shapeWidth / 2).greaterThan(+textLeftPosition);
                        expect(+shapeTopPosition + +shapeHeight / 2).greaterThan(+textTopPosition);
                    }
                });
        });
    }

    function testLabelTextContent(id) {
        cy.get(`.cvat_canvas_text[data-client-id="${id}"]`).then(($labelText) => {
            const labelText = $labelText.text();
            expect(labelText).include(`${labelName} ${id} (manual)`);
            expect(labelText).include(`${attrName}: ${textDefaultValue}`);
        });
    }

    before(() => {
        cy.visit('auth/login');
        cy.login();
        cy.get('.cvat-tasks-page').should('exist').and('be.visible');

        cy.headlessCreateTask({
            labels: [
                {
                    name: labelName,
                    attributes: [{
                        name: attrName,
                        mutable: false,
                        input_type: 'text',
                        default_value: textDefaultValue,
                        values: [],
                    }],
                    type: 'any',
                },
                skeletonLabel,
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

            cy.createRectangle(rectangleShape2Points);
            cy.createPolygon(polygonTrack);
            cy.startMaskDrawing();
            cy.drawMask(maskDrawingActions);
            cy.finishMaskDrawing();
            cy.createSkeleton({
                ...skeletonPosition,
                labelName: skeletonLabel.name,
                type: skeletonType,
            });

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
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Text font size.', () => {
            cy.get('.cvat_canvas_text').should('have.attr', 'style', 'font-size: 14px;');
            cy.openSettings();

            // Change the text size to 16
            cy.get('.cvat-workspace-settings-text-size').find('input').should('have.attr', 'value', '14');
            cy.get('.cvat-workspace-settings-text-size').find('input').clear();
            cy.get('.cvat-workspace-settings-text-size').find('input').type('10');
            cy.get('.cvat-workspace-settings-text-size').find('input').should('have.attr', 'value', '10');
            cy.closeSettings();
            cy.get('.cvat_canvas_text').should('have.attr', 'style', 'font-size: 10px;');
        });

        it('Text position.', () => {
            testTextPosition('#cvat_canvas_shape_1', 'outside');
            testTextPosition('#cvat_canvas_shape_2', 'outside');
            testTextPosition('#cvat_canvas_shape_3', 'outside');
            testTextPosition('#cvat_canvas_shape_4', 'outside');

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
            testTextPosition('#cvat_canvas_shape_3', 'inside');
            testTextPosition('#cvat_canvas_shape_4', 'inside');
        });

        it('Text labels content.', () => {
            cy.openSettings();
            cy.get('.cvat-workspace-settings-text-content').within(() => {
                cy.get('[aria-label="close"]').each((el) => {
                    cy.wrap(el).click();
                });
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
            cy.get('.cvat_canvas_text_attribute').should('have.length', 3);
            cy.get('.cvat_canvas_text_description').should('not.exist');
        });
    });
});
