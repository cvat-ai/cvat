// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context('Multi-object selection', { scrollBehavior: false }, () => {
    const taskName = 'Multi-object selection';
    const serverFiles = ['images/image_1.jpg', 'images/image_2.jpg', 'images/image_3.jpg'];
    const labels = {
        car: 'car',
        person: 'person',
    };
    const objectIds = {
        carShape1: 1,
        carShape2: 2,
        personTrack1: 3,
        personTrack2: 4,
        points: 5,
        tag: 6,
    };
    const selectableObjectIds = Object.values(objectIds).filter((clientId) => clientId !== objectIds.tag);
    const rectangleIds = [
        objectIds.carShape1,
        objectIds.carShape2,
        objectIds.personTrack1,
        objectIds.personTrack2,
    ];

    let taskId = null;
    let jobId = null;

    const taskSpec = {
        name: taskName,
        labels: Object.values(labels).map((name) => ({
            name,
            type: 'any',
            attributes: [{
                name: 'quality',
                mutable: true,
                input_type: 'select',
                default_value: 'good',
                values: ['good', 'bad'],
            }],
        })),
        project_id: null,
        source_storage: { location: 'local' },
        target_storage: { location: 'local' },
    };
    const dataSpec = {
        server_files: serverFiles,
        image_quality: 70,
        use_zip_chunks: true,
        use_cache: true,
        sorting_method: 'lexicographical',
    };
    const rectangles = [{
        type: 'Shape',
        labelName: labels.car,
        firstX: 180,
        firstY: 200,
        secondX: 280,
        secondY: 300,
    }, {
        type: 'Shape',
        labelName: labels.car,
        firstX: 380,
        firstY: 200,
        secondX: 480,
        secondY: 300,
    }, {
        type: 'Track',
        labelName: labels.person,
        firstX: 180,
        firstY: 400,
        secondX: 280,
        secondY: 500,
    }, {
        type: 'Track',
        labelName: labels.person,
        firstX: 380,
        firstY: 400,
        secondX: 480,
        secondY: 500,
    }];
    const points = {
        type: 'Shape',
        labelName: labels.car,
        pointsMap: [{ x: 600, y: 250 }, { x: 650, y: 300 }],
        numberOfPoints: 2,
    };

    const sidebarItem = (clientId) => `#cvat-objects-sidebar-state-item-${clientId}`;

    function createRectangle(rectangle) {
        cy.interactControlButton('draw-rectangle');
        cy.switchLabel(rectangle.labelName, 'draw-rectangle');
        cy.get('.cvat-draw-rectangle-popover').within(() => {
            cy.contains(/2 Points$/).click();
            cy.contains('button', rectangle.type).click();
        });
        cy.get('.cvat-canvas-container').click(rectangle.firstX, rectangle.firstY);
        cy.get('.cvat-canvas-container').click(rectangle.secondX, rectangle.secondY);
        cy.checkPopoverHidden('draw-rectangle');
    }

    function assertSelection(expectedIds) {
        cy.get('.cvat-objects-sidebar-state-item-multi-selected')
            .should('have.length', expectedIds.length);
        expectedIds.forEach((clientId) => {
            cy.get(sidebarItem(clientId))
                .should('have.class', 'cvat-objects-sidebar-state-item-multi-selected');
        });
        if (expectedIds.length) {
            cy.get('.cvat_canvas_selected_objects_label_title')
                .should('have.text', `SELECTION (${expectedIds.length})`);
            cy.get('.cvat_canvas_selected_objects_box').should('exist').and('be.visible');
        } else {
            cy.get('.cvat_canvas_selected_objects_label').should('not.exist');
            cy.get('.cvat_canvas_selected_objects_box').should('not.exist');
        }
    }

    function selectFromSidebar(clientIds) {
        clientIds.forEach((clientId) => {
            cy.get(sidebarItem(clientId)).click({ metaKey: true, force: true });
        });
        assertSelection(clientIds);
    }

    function clearSelection() {
        cy.get('body').type('{esc}', { force: true });
        assertSelection([]);
    }

    function openSelectionMenu() {
        cy.get('body').then(($body) => {
            if (!$body.find('.cvat-object-item-menu:visible').length) {
                cy.get('button[aria-label="Open selection actions"]').click();
            }
        });
        cy.get('.cvat-object-item-menu').should('exist').and('be.visible');
    }

    function runSelectAllShortcut() {
        cy.get('body').trigger('keydown', {
            key: 'a',
            code: 'KeyA',
            metaKey: true,
        });
        cy.get('body').trigger('keyup', {
            key: 'a',
            code: 'KeyA',
            metaKey: true,
        });
    }

    function dragSelectionBox(deltaX, deltaY) {
        cy.get('.cvat_canvas_selected_objects_box').then(($box) => {
            const box = $box[0].getBoundingClientRect();
            const startX = box.left + box.width / 2;
            const startY = box.top + box.height / 2;
            cy.wrap($box).trigger('mousedown', {
                button: 0,
                buttons: 1,
                clientX: startX,
                clientY: startY,
            });
            cy.get('#cvat_canvas_content').trigger('mousemove', {
                button: 0,
                buttons: 1,
                clientX: startX + deltaX,
                clientY: startY + deltaY,
            });
            cy.document().trigger('mouseup', {
                button: 0,
                clientX: startX + deltaX,
                clientY: startY + deltaY,
            });
        });
    }

    function drawSelectionBox(start, end) {
        cy.get('#cvat_canvas_content').trigger('mousedown', {
            button: 0,
            buttons: 1,
            clientX: start.x,
            clientY: start.y,
        });
        cy.get('#cvat_canvas_content').trigger('mousemove', {
            button: 0,
            buttons: 1,
            clientX: end.x,
            clientY: end.y,
        });
        cy.document().trigger('mouseup', {
            button: 0,
            clientX: end.x,
            clientY: end.y,
        });
    }

    before(() => {
        cy.visit('/auth/login');
        cy.login();
        cy.headlessCreateTask(taskSpec, dataSpec).then((response) => {
            taskId = response.taskId;
            [jobId] = response.jobIds;
            cy.visit(`/tasks/${taskId}/jobs/${jobId}`);
            cy.get('.cvat-canvas-container').should('exist').and('be.visible');
        });

        rectangles.forEach((rectangle) => createRectangle(rectangle));
        cy.createPoint(points);
        cy.createTag(labels.car);

        // Drawn objects are pinned by default. Keep this fixture movable for movement tests.
        rectangleIds.forEach((clientId) => {
            cy.get(sidebarItem(clientId)).within(() => {
                cy.get('.cvat-object-item-button-pinned').then(($button) => {
                    if ($button.hasClass('cvat-object-item-button-pinned-enabled')) {
                        cy.wrap($button).click();
                    }
                });
            });
        });
    });

    after(() => {
        if (taskId !== null) {
            cy.headlessDeleteTask(taskId);
        }
    });

    beforeEach(() => {
        cy.goCheckFrameNumber(0);
        cy.contains('[role="tab"]', 'Objects').click();
        cy.get('.cvat-select-control').then(($control) => {
            if ($control.hasClass('cvat-active-canvas-control')) {
                cy.wrap($control).click();
            }
        });
        cy.get('body').type('{esc}', { force: true });
        cy.get('.cvat_canvas_selected_objects_label').should('not.exist');
    });

    it('Adds and removes objects with Command-click on the canvas and in the Objects tab', () => {
        cy.get(`#cvat_canvas_shape_${objectIds.carShape1}`).click({ metaKey: true, force: true });
        assertSelection([objectIds.carShape1]);

        cy.get(sidebarItem(objectIds.carShape2)).click({ metaKey: true });
        assertSelection([objectIds.carShape1, objectIds.carShape2]);

        cy.get(`#cvat_canvas_shape_${objectIds.carShape1}`).click({ metaKey: true, force: true });
        assertSelection([objectIds.carShape2]);

        cy.get('.cvat-canvas-container').click(700, 600);
        assertSelection([]);

        selectFromSidebar([objectIds.carShape1, objectIds.carShape2]);
        cy.get(sidebarItem(objectIds.personTrack1)).click();
        assertSelection([]);
        cy.get(sidebarItem(objectIds.personTrack1)).should('have.class', 'cvat-objects-sidebar-state-active-item');
    });

    it('Selects a sidebar range with Shift and all selectable objects with Command+A', () => {
        cy.get(sidebarItem(objectIds.carShape1)).click({ metaKey: true, force: true });
        cy.get(sidebarItem(objectIds.personTrack2)).click({ shiftKey: true, force: true });
        assertSelection([
            objectIds.carShape1,
            objectIds.carShape2,
            objectIds.personTrack1,
            objectIds.personTrack2,
        ]);

        clearSelection();
        runSelectAllShortcut();
        assertSelection(selectableObjectIds);
        cy.get(sidebarItem(objectIds.tag))
            .should('not.have.class', 'cvat-objects-sidebar-state-item-multi-selected');
    });

    it('Selects only objects fully contained by the selection bbox', () => {
        cy.get('.cvat-select-control').click();
        cy.get('.cvat-select-control').should('have.class', 'cvat-active-canvas-control');
        cy.get(`#cvat_canvas_shape_${objectIds.carShape1}`).then(($firstShape) => {
            const first = $firstShape[0].getBoundingClientRect();
            cy.get(`#cvat_canvas_shape_${objectIds.carShape2}`).then(($secondShape) => {
                const second = $secondShape[0].getBoundingClientRect();
                drawSelectionBox({
                    x: first.left - 5,
                    y: Math.min(first.top, second.top) - 5,
                }, {
                    x: second.left + second.width / 2,
                    y: Math.max(first.bottom, second.bottom) + 5,
                });
            });
        });
        assertSelection([objectIds.carShape1]);
        cy.get('.cvat-select-control').should('have.class', 'cvat-active-canvas-control');
    });

    it('Excludes hidden objects and tags from selection', () => {
        cy.get(sidebarItem(objectIds.carShape1)).within(() => {
            cy.get('.cvat-object-item-button-hidden').click();
        });
        runSelectAllShortcut();
        assertSelection(selectableObjectIds.filter((clientId) => clientId !== objectIds.carShape1));

        clearSelection();
        cy.get(sidebarItem(objectIds.carShape1)).within(() => {
            cy.get('.cvat-object-item-button-hidden-enabled').click();
        });
        cy.get(sidebarItem(objectIds.tag)).click({ metaKey: true, force: true });
        assertSelection([]);
    });

    it('Selects complete label and layer groups and works with Layer ordering', () => {
        cy.contains('[role="tab"]', 'Labels').click();
        cy.contains('.cvat-objects-sidebar-label-item', labels.car).click({ metaKey: true });
        assertSelection([objectIds.carShape1, objectIds.carShape2, objectIds.points]);
        cy.get('.cvat-objects-sidebar-label-item-multi-selected').should('have.length', 1);

        clearSelection();
        cy.contains('[role="tab"]', 'Objects').click();
        cy.sidebarItemSortBy('Layer');
        cy.get(sidebarItem(objectIds.carShape1)).click({ metaKey: true, force: true });
        cy.get(sidebarItem(objectIds.carShape2)).click({ metaKey: true, force: true });
        assertSelection([objectIds.carShape1, objectIds.carShape2]);

        clearSelection();
        cy.get('.cvat-objects-sidebar-z-layer-mark').first().click({ metaKey: true, force: true });
        assertSelection(selectableObjectIds);
        clearSelection();
        cy.sidebarItemSortBy('ID - ascent');
        assertSelection([]);
    });

    it('Keeps selected tracks across frames and restores the previous selection with Undo', () => {
        selectFromSidebar([objectIds.carShape1, objectIds.personTrack1, objectIds.personTrack2]);
        cy.goCheckFrameNumber(1);
        assertSelection([objectIds.personTrack1, objectIds.personTrack2]);
        cy.goCheckFrameNumber(0);
        assertSelection([objectIds.personTrack1, objectIds.personTrack2]);
        cy.contains('.cvat-annotation-header-button', 'Undo').click();
        assertSelection([objectIds.carShape1, objectIds.personTrack1, objectIds.personTrack2]);
    });

    it('Moves a selection as one action and restores it with Undo', () => {
        selectFromSidebar([objectIds.carShape1, objectIds.carShape2]);
        cy.get(`#cvat_canvas_shape_${objectIds.carShape1}`).invoke('attr', 'x').then((initialX) => {
            dragSelectionBox(30, 20);
            cy.get(`#cvat_canvas_shape_${objectIds.carShape1}`)
                .should('not.have.attr', 'x', initialX);
            cy.contains('.cvat-annotation-header-button', 'Undo').click();
            cy.get(`#cvat_canvas_shape_${objectIds.carShape1}`)
                .should('have.attr', 'x', initialX);
        });
        assertSelection([objectIds.carShape1, objectIds.carShape2]);
    });

    it('Moves unlocked members while locked members stay selected and stationary', () => {
        cy.get(sidebarItem(objectIds.carShape1)).within(() => {
            cy.get('.cvat-object-item-button-lock').click();
        });
        selectFromSidebar([objectIds.carShape1, objectIds.carShape2]);

        cy.get(`#cvat_canvas_shape_${objectIds.carShape1}`).invoke('attr', 'x').then((lockedX) => {
            cy.get(`#cvat_canvas_shape_${objectIds.carShape2}`).invoke('attr', 'x').then((movableX) => {
                dragSelectionBox(30, 20);
                cy.get(`#cvat_canvas_shape_${objectIds.carShape1}`).should('have.attr', 'x', lockedX);
                cy.get(`#cvat_canvas_shape_${objectIds.carShape2}`).should('not.have.attr', 'x', movableX);
                assertSelection([objectIds.carShape1, objectIds.carShape2]);
                cy.contains('.cvat-annotation-header-button', 'Undo').click();
                cy.get(`#cvat_canvas_shape_${objectIds.carShape2}`).should('have.attr', 'x', movableX);
            });
        });

        clearSelection();
        cy.get(sidebarItem(objectIds.carShape1)).within(() => {
            cy.get('.cvat-object-item-button-lock-enabled').click();
        });
    });

    it('Locks, unlocks, pins, and unpins every selected object', () => {
        selectFromSidebar([objectIds.carShape1, objectIds.carShape2]);
        openSelectionMenu();
        cy.contains('.cvat-object-item-menu button', 'Lock selection').click();
        [objectIds.carShape1, objectIds.carShape2].forEach((clientId) => {
            cy.get(sidebarItem(clientId)).find('.cvat-object-item-button-lock-enabled').should('exist');
        });

        openSelectionMenu();
        cy.contains('.cvat-object-item-menu button', 'Unlock selection').click();
        openSelectionMenu();
        cy.contains('.cvat-object-item-menu button', 'Pin selection').click();
        [objectIds.carShape1, objectIds.carShape2].forEach((clientId) => {
            cy.get(sidebarItem(clientId)).find('.cvat-object-item-button-pinned-enabled').should('exist');
        });

        openSelectionMenu();
        cy.contains('.cvat-object-item-menu button', 'Unpin selection').click();
    });

    it('Runs layer and annotation actions for the complete selection', () => {
        selectFromSidebar([objectIds.carShape1, objectIds.carShape2]);
        cy.get(`#cvat_canvas_shape_${objectIds.carShape1}`).invoke('attr', 'data-z-order').then((initialZOrder) => {
            openSelectionMenu();
            cy.contains('.cvat-object-item-menu button', 'To one layer forward').click();
            [objectIds.carShape1, objectIds.carShape2].forEach((clientId) => {
                cy.get(`#cvat_canvas_shape_${clientId}`)
                    .should('not.have.attr', 'data-z-order', initialZOrder);
            });
            cy.contains('.cvat-annotation-header-button', 'Undo').click();
        });

        openSelectionMenu();
        cy.contains('.cvat-object-item-menu button', 'Run annotation action').click();
        cy.get('.cvat-action-runner-list').should('exist').and('be.visible');
        cy.closeAnnotationsActionsModal();
    });

    it('Changes common labels and attributes and groups the selection', () => {
        selectFromSidebar([objectIds.carShape1, objectIds.carShape2]);
        openSelectionMenu();
        cy.get('.cvat-canvas-selected-objects-label-selector .ant-select-selector').click();
        cy.get('.ant-select-dropdown').not('.ant-select-dropdown-hidden')
            .find(`.ant-select-item-option[title="${labels.person}"]`).click();
        [objectIds.carShape1, objectIds.carShape2].forEach((clientId) => {
            cy.get(sidebarItem(clientId)).find('.ant-select-selection-item').should('have.text', labels.person);
        });

        openSelectionMenu();
        cy.get('.cvat-canvas-selected-objects-attributes .ant-collapse-header').click();
        cy.get('.cvat-object-item-menu .cvat-object-item-select-attribute').click();
        cy.get('.ant-select-dropdown').not('.ant-select-dropdown-hidden')
            .find('.ant-select-item-option[title="bad"]').click();

        openSelectionMenu();
        cy.contains('.cvat-object-item-menu button', 'Group selection').click();
        openSelectionMenu();
        cy.contains('.cvat-object-item-menu button', 'Ungroup selection').should('not.be.disabled').click();

        openSelectionMenu();
        cy.get('.cvat-canvas-selected-objects-label-selector .ant-select-selector').click();
        cy.get('.ant-select-dropdown').not('.ant-select-dropdown-hidden')
            .find(`.ant-select-item-option[title="${labels.car}"]`).click();
    });

    it('Copies and deletes a selection as batch history actions', () => {
        selectFromSidebar([objectIds.carShape1, objectIds.carShape2]);
        openSelectionMenu();
        cy.contains('.cvat-object-item-menu button', 'Make a copy').click();
        cy.get('.cvat_canvas_shape_drawing').should('have.length', 2);
        cy.get('.cvat-canvas-container').click(600, 500);
        cy.get('.cvat_canvas_shape').should('have.length', selectableObjectIds.length + 2);
        cy.contains('.cvat-annotation-header-button', 'Undo').click();
        cy.get('.cvat_canvas_shape').should('have.length', selectableObjectIds.length);
        cy.get('body').type('{esc}', { force: true });

        selectFromSidebar([objectIds.carShape1, objectIds.carShape2]);
        openSelectionMenu();
        cy.contains('.cvat-object-item-menu button', 'Delete selection').click();
        cy.get(`#cvat_canvas_shape_${objectIds.carShape1}`).should('not.exist');
        cy.get(`#cvat_canvas_shape_${objectIds.carShape2}`).should('not.exist');

        cy.contains('.cvat-annotation-header-button', 'Undo').click();
        cy.get(`#cvat_canvas_shape_${objectIds.carShape1}`).should('exist');
        cy.get(`#cvat_canvas_shape_${objectIds.carShape2}`).should('exist');
        assertSelection([objectIds.carShape1, objectIds.carShape2]);
    });
});
