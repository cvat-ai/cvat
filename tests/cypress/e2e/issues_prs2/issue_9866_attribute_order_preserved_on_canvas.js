// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context('Reordered label attributes should be reflected in the constructor, canvas tooltip, and object details', () => {
    const issueId = '9866';
    const labelName = `Issue ${issueId}`;

    const attributeNames = ['z_first', 'm_second', 'a_third'];
    const reorderedAttributeNames = [...attributeNames].reverse();

    function makeAttribute(name) {
        return {
            name,
            mutable: false,
            input_type: 'text',
            default_value: '',
            values: [''],
        };
    }

    const taskSpec = {
        name: `Task for ${labelName}`,
        labels: [{ name: labelName, attributes: attributeNames.map(makeAttribute) }],
    };
    const dataSpec = {
        server_files: ['images/image_1.jpg'],
        image_quality: 70,
    };

    const rectangleShape = {
        points: 'By 2 Points',
        type: 'Shape',
        labelName,
        firstX: 250,
        firstY: 350,
        secondX: 350,
        secondY: 450,
    };
    const secondRectangleShape = {
        ...rectangleShape,
        firstX: 400,
        firstY: 350,
        secondX: 500,
        secondY: 450,
    };

    let taskId;

    function readLabel() {
        return cy.get('.cvat-raw-labels-viewer').then(($rawLabelsTextarea) => {
            const labels = JSON.parse($rawLabelsTextarea.text());
            return labels.find((_label) => _label.name === labelName);
        });
    }

    function writeLabels(labels) {
        cy.get('.cvat-raw-labels-viewer').clear();
        cy.get('.cvat-raw-labels-viewer').type(JSON.stringify(labels), { parseSpecialCharSequences: false });
        cy.contains('[type="submit"]', 'Save').click();
    }

    function reorderAttributes(names) {
        cy.contains('[role="tab"]', 'Raw').click();
        readLabel().then((label) => {
            const existingByName = new Map(label.attributes.map((attr) => [attr.name, attr]));
            const attributes = names.map((name) => existingByName.get(name));
            writeLabels([{ ...label, attributes }]);
        });
    }

    function checkTooltipAttributeOrder(shapeSelector, expectedOrder) {
        cy.get(shapeSelector).trigger('mousemove');
        cy.get('#cvat_canvas_text_content').should(($el) => {
            const text = $el.text();
            expectedOrder.forEach((name) => {
                expect(text, `"${name}" should be present in the tooltip`).to.include(name);
            });
        });
        cy.get('#cvat_canvas_text_content')
            .invoke('text')
            .then((text) => {
                const positions = expectedOrder.map((name) => text.indexOf(name));
                for (let i = 1; i < positions.length; i += 1) {
                    expect(positions[i]).to.be.greaterThan(positions[i - 1]);
                }
            });
    }

    function checkDetailsPanelAttributeOrder(clientId, expectedOrder) {
        const itemSelector = `#cvat-objects-sidebar-state-item-${clientId}`;
        cy.get(itemSelector).contains('.ant-collapse-header', 'DETAILS').click();
        cy.get(itemSelector).find('.cvat-object-item-attribute-wrapper').should('have.length', expectedOrder.length);
        cy.get(itemSelector)
            .find('.cvat-object-item-attribute-wrapper')
            .then(($wrappers) => {
                const names = [...$wrappers].map((el) => el.querySelector('.cvat-text').textContent.trim());
                expect(names).to.deep.equal(expectedOrder);
            });
    }

    function checkConstructorAttributeOrder(expectedOrder) {
        cy.reload();
        cy.contains('[role="tab"]', 'Constructor').click();
        cy.get('.cvat-constructor-viewer-item').find('[aria-label="edit"]').click();
        cy.get('.cvat-attribute-name-input input').should('have.length', expectedOrder.length);
        cy.get('.cvat-attribute-name-input input').then(($inputs) => {
            const names = [...$inputs].map((el) => el.value);
            expect(names).to.deep.equal(expectedOrder);
        });
        cy.get('.cvat-cancel-new-label-button').click();
    }

    before(() => {
        cy.prepareUserSession();
        cy.headlessCreateTask(taskSpec, dataSpec).then((response) => {
            taskId = response.taskId;
        });
    });

    after(() => {
        cy.headlessDeleteTask(taskId);
    });

    describe(`Testing issue "${issueId}"`, () => {
        it("Canvas tooltip shows attributes in the label's current order", () => {
            cy.openTaskById(taskId);
            cy.openJob();
            cy.createRectangle(rectangleShape);
            cy.saveJob();
            checkTooltipAttributeOrder('#cvat_canvas_shape_1', attributeNames);
        });

        it('Reorder the label attributes via the raw editor', () => {
            cy.interactMenu('Open the task');
            reorderAttributes(reorderedAttributeNames);
        });

        it('Constructor reflects the reordered attributes', () => {
            checkConstructorAttributeOrder(reorderedAttributeNames);
        });

        it('Canvas tooltip reflects the reordered attributes for the existing shape', () => {
            cy.openJob(0, false);
            checkTooltipAttributeOrder('#cvat_canvas_shape_1', reorderedAttributeNames);
        });

        it('Object details panel reflects the reordered attributes', () => {
            checkDetailsPanelAttributeOrder(1, reorderedAttributeNames);
        });

        it('Canvas tooltip reflects the reordered attributes for a new shape', () => {
            cy.createRectangle(secondRectangleShape);
            checkTooltipAttributeOrder('#cvat_canvas_shape_2', reorderedAttributeNames);
        });
    });
});
