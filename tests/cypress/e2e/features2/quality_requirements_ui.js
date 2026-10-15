// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { defaultTaskSpec } from '../../support/default-specs';

context('Quality requirements UI', () => {
    const taskName = 'Quality requirements UI task';
    const labelName = 'quality_requirement_label';
    const serverFiles = ['images/image_1.jpg', 'images/image_2.jpg', 'images/image_3.jpg'];
    const childRequirementName = 'E2E rectangle accuracy';
    const grandchildRequirementName = 'E2E precise rectangle accuracy';
    const copiedRequirementName = `Copy of ${childRequirementName}`;
    const defaultRectangleRequirementName = 'Base rectangle';
    const thresholdEditor = '.cvat-threshold-policy-editor';
    const thresholdRows = `${thresholdEditor} .cvat-threshold-policy-row`;
    const linearIouPolicy = {
        type: 'iou',
        mode: 'linear',
        input: 'gt.shape_area',
        extrapolation: 'clamp',
        points: [{ x: 100, y: 0.4 }, { x: 1000, y: 0.9 }],
    };
    const validationParams = {
        frameCount: 2,
        mode: 'gt',
        frameSelectionMethod: 'random_uniform',
    };
    let taskId = null;

    function openSettingsTab() {
        cy.visit(`/tasks/${taskId}/quality-control#settings`);
        cy.get('.cvat-quality-control-settings-tab').should('be.visible');
        cy.get('.cvat-quality-requirements-configuration-table').should('be.visible');
    }

    function requirementRow(name) {
        return cy.contains('.cvat-quality-requirements-configuration-table tr', name);
    }

    // The constructor persists expanded rows in localStorage, so a row may already be
    // expanded on a later visit. Expand only when it is currently collapsed.
    function ensureRowExpanded(name) {
        requirementRow(name).then(($row) => {
            const expandIcon = $row.find('.anticon-caret-down');
            const iconIsCollapsed = expandIcon.find('svg').attr('style')?.includes('rotate(-90deg)');

            if (iconIsCollapsed) {
                cy.wrap(expandIcon).click();
            }
        });
    }

    function clickRowAction(name, ariaLabel) {
        requirementRow(name).within(() => {
            cy.get(`[aria-label="${ariaLabel}"]`).closest('button').click();
        });
    }

    function setFormName(name) {
        cy.get('.cvat-quality-requirement-form #name').clear();
        cy.get('.cvat-quality-requirement-form #name').type(name);
    }

    function setFormThreshold(value) {
        cy.get('.cvat-quality-requirement-form #requiredScore').clear();
        cy.get('.cvat-quality-requirement-form #requiredScore').type(`${value}`);
        cy.get('.cvat-quality-requirement-form #requiredScore').blur();
    }

    function submitForm() {
        cy.get('.cvat-quality-requirement-form-actions').contains('button', 'Save').click();
    }

    function selectThresholdMode(mode) {
        cy.get(`${thresholdEditor} .ant-select-selector`).click();
        cy.get('.ant-select-dropdown:not(.ant-select-dropdown-hidden)')
            .contains('.ant-select-item-option-content', mode).click();
    }

    function expectLinearThreshold(points = linearIouPolicy.points) {
        cy.get(`${thresholdEditor} .ant-select-selection-item`).should('have.text', 'Linear interpolation');
        cy.get(thresholdRows).should('have.length', points.length);
        points.forEach((point, index) => {
            cy.get(thresholdRows).eq(index).find('input[id*="area"]').should('have.value', `${point.x}`);
            cy.get(thresholdRows).eq(index).find('input[id*="iou"]').should('have.value', `${point.y * 100}`);
        });
    }

    function expectPolicyRequest(alias, policy, status = 200) {
        cy.wait(alias).then(({ request, response }) => {
            expect(response.statusCode).to.equal(status);
            expect(request.body.similarity_threshold_policy).to.deep.equal(policy);
            expect(request.body).not.to.have.property('iou_threshold');
        });
    }

    function saveSettings() {
        cy.get('.cvat-quality-settings-save-btn').contains('button', 'Save').click();
    }

    function expectNotification(message) {
        cy.contains('.ant-notification-notice-message', message).should('be.visible');
        cy.closeNotification('.ant-notification-notice');
    }

    before(() => {
        cy.visit('/auth/login');
        cy.login();

        const { taskSpec, dataSpec, extras } = defaultTaskSpec({
            taskName,
            labelName,
            serverFiles,
            validationParams,
        });

        cy.headlessCreateTask(taskSpec, dataSpec, extras).then((response) => {
            taskId = response.taskId;
        }).then(() => {
            // Start every run with a clean expansion state so persistence assertions are deterministic.
            cy.window().then((win) => {
                Object.keys(win.localStorage)
                    .filter((key) => key.startsWith('qualityRequirementsConstructorExpandedRows'))
                    .forEach((key) => win.localStorage.removeItem(key));
            });
        });
    });

    after(() => {
        if (taskId !== null) {
            cy.headlessDeleteTask(taskId);
        }
    });

    it('Default requirement row is read-only and disabled by default', () => {
        openSettingsTab();

        requirementRow(defaultRectangleRequirementName).within(() => {
            cy.contains('Rectangle').should('exist');
            cy.contains('Accuracy').should('exist');
            // Default requirements may not be copied or deleted.
            cy.get('[aria-label="copy"]').should('not.exist');
            cy.get('[aria-label="delete"]').should('not.exist');
            // But may be created from, edited and toggled.
            cy.get('[aria-label="plus"]').should('exist');
            cy.get('[aria-label="edit"]').should('exist');
            cy.get('.ant-switch').should('not.have.class', 'ant-switch-checked');
        });
        requirementRow(defaultRectangleRequirementName).should('have.class', 'cvat-quality-requirements-disabled-row');
    });

    it('Saves requirement enabled changes from the main settings form', () => {
        openSettingsTab();

        requirementRow(defaultRectangleRequirementName).find('.ant-switch').click();
        requirementRow(defaultRectangleRequirementName).find('.ant-switch').should('have.class', 'ant-switch-checked');
        requirementRow(defaultRectangleRequirementName).should('not.have.class', 'cvat-quality-requirements-disabled-row');

        // The constructor switch is a draft until the main settings form is saved.
        cy.reload();
        cy.get('.cvat-quality-requirements-configuration-table').should('be.visible');
        requirementRow(defaultRectangleRequirementName).find('.ant-switch').should('not.have.class', 'ant-switch-checked');
        requirementRow(defaultRectangleRequirementName).should('have.class', 'cvat-quality-requirements-disabled-row');

        requirementRow(defaultRectangleRequirementName).find('.ant-switch').click();
        saveSettings();
        expectNotification('Settings have been updated');

        cy.reload();
        cy.get('.cvat-quality-requirements-configuration-table').should('be.visible');
        requirementRow(defaultRectangleRequirementName).find('.ant-switch').should('have.class', 'ant-switch-checked');
        requirementRow(defaultRectangleRequirementName).should('not.have.class', 'cvat-quality-requirements-disabled-row');
    });

    it('Creates a child requirement through the form', () => {
        openSettingsTab();

        clickRowAction(defaultRectangleRequirementName, 'plus');

        cy.get('.cvat-quality-requirement-form').should('be.visible');
        cy.contains('Create requirement').should('exist');
        // Parent and target are fixed when creating from an existing requirement.
        cy.contains('.ant-form-item', 'Parent requirement').find('.ant-select-disabled').should('exist');
        cy.contains('.ant-form-item', 'Target').find('.ant-select-disabled').should('exist');

        setFormName(childRequirementName);
        setFormThreshold(80);
        submitForm();

        expectNotification('Requirement has been created');

        // Back in the list, the new child appears under the default requirement with inherited type/metric.
        cy.get('.cvat-quality-requirements-configuration-table').should('be.visible');
        ensureRowExpanded(defaultRectangleRequirementName);
        requirementRow(childRequirementName).within(() => {
            cy.contains('Rectangle').should('exist');
            cy.contains('Accuracy').should('exist');
            cy.contains('80%').should('exist');
            // Non-default requirements expose the full set of actions.
            cy.get('[aria-label="copy"]').should('exist');
            cy.get('[aria-label="delete"]').should('exist');
            cy.get('[aria-label="edit"]').should('exist');
        });
    });

    it('Creates a grandchild requirement that inherits parent values', () => {
        openSettingsTab();

        ensureRowExpanded(defaultRectangleRequirementName);
        clickRowAction(childRequirementName, 'plus');

        cy.get('.cvat-quality-requirement-form').should('be.visible');
        setFormName(grandchildRequirementName);
        // Leave the threshold untouched so it is inherited from the parent.
        submitForm();

        expectNotification('Requirement has been created');

        cy.get('.cvat-quality-requirements-configuration-table').should('be.visible');
        ensureRowExpanded(defaultRectangleRequirementName);
        ensureRowExpanded(childRequirementName);
        requirementRow(grandchildRequirementName).within(() => {
            cy.contains('Rectangle').should('exist');
            cy.contains('Accuracy').should('exist');
            cy.contains('80%').should('exist');
        });
    });

    it('Validates the requirement form', () => {
        openSettingsTab();

        clickRowAction(defaultRectangleRequirementName, 'plus');
        cy.get('.cvat-quality-requirement-form').should('be.visible');

        // Empty name is rejected.
        cy.get('.cvat-quality-requirement-form #name').clear();
        submitForm();
        cy.contains('.ant-form-item-explain-error', 'This field is required').should('exist');

        // Duplicate names are rejected.
        setFormName(childRequirementName);
        submitForm();
        cy.contains('.ant-form-item-explain-error', 'Requirement name must be unique').should('exist');

        // A valid unique name clears the name error.
        setFormName('E2E temporary requirement');
        cy.contains('.ant-form-item-explain-error', 'Requirement name must be unique').should('not.exist');

        // Empty threshold is rejected.
        cy.get('.cvat-quality-requirement-form #requiredScore').clear();
        cy.get('.cvat-quality-requirement-form #requiredScore').blur();
        submitForm();
        cy.contains('.ant-form-item-explain-error', 'This field is required').should('exist');

        // Cancelling discards the form and returns to the list without creating anything.
        cy.get('.cvat-quality-requirement-form-actions').contains('button', 'Cancel').click();
        cy.get('.cvat-quality-requirements-configuration-table').should('be.visible');
        requirementRow('E2E temporary requirement').should('not.exist');
    });

    it('Edits a requirement threshold and propagates it to inheritors', () => {
        openSettingsTab();

        ensureRowExpanded(defaultRectangleRequirementName);
        clickRowAction(childRequirementName, 'edit');

        cy.get('.cvat-quality-requirement-form').should('be.visible');
        cy.contains('Edit requirement').should('exist');
        setFormThreshold(90);
        submitForm();

        expectNotification('Requirement has been updated');

        cy.get('.cvat-quality-requirements-configuration-table').should('be.visible');
        ensureRowExpanded(defaultRectangleRequirementName);
        requirementRow(childRequirementName).contains('90%').should('exist');

        // The grandchild inherits the new threshold.
        ensureRowExpanded(childRequirementName);
        requirementRow(grandchildRequirementName).contains('90%').should('exist');
    });

    it('Copies a requirement from an existing one', () => {
        openSettingsTab();

        ensureRowExpanded(defaultRectangleRequirementName);
        clickRowAction(childRequirementName, 'copy');

        cy.get('.cvat-quality-requirement-form').should('be.visible');
        cy.contains('Create requirement').should('exist');
        // The copy form prefills the name with a "Copy of" prefix and the source threshold.
        cy.get('.cvat-quality-requirement-form #name').should('have.value', copiedRequirementName);
        cy.get('.cvat-quality-requirement-form #requiredScore').should('have.value', '90');
        submitForm();

        expectNotification('Requirement has been created');

        cy.get('.cvat-quality-requirements-configuration-table').should('be.visible');
        ensureRowExpanded(defaultRectangleRequirementName);
        requirementRow(copiedRequirementName).within(() => {
            cy.contains('Rectangle').should('exist');
            cy.contains('90%').should('exist');
        });
    });

    it('Deletes a requirement with confirmation', () => {
        openSettingsTab();

        ensureRowExpanded(defaultRectangleRequirementName);
        clickRowAction(copiedRequirementName, 'delete');

        cy.get('.ant-modal-confirm').should('be.visible');
        cy.contains('.ant-modal-confirm-title', `Delete "${copiedRequirementName}" requirement?`).should('exist');
        cy.get('.ant-modal-confirm-btns').contains('button', 'Delete').click();

        cy.get('.cvat-quality-requirements-configuration-table').should('be.visible');
        requirementRow(copiedRequirementName).should('not.exist');
    });

    it('Persists expanded rows across reloads', () => {
        openSettingsTab();

        ensureRowExpanded(defaultRectangleRequirementName);
        ensureRowExpanded(childRequirementName);
        requirementRow(childRequirementName).should('be.visible');
        requirementRow(grandchildRequirementName).should('be.visible');

        cy.reload();
        cy.get('.cvat-quality-requirements-configuration-table').should('be.visible');
        // The previously expanded rows stay expanded, so their descendants are still rendered.
        requirementRow(childRequirementName).should('be.visible');
        requirementRow(grandchildRequirementName).should('be.visible');
    });

    it('Selects Jaccard Index and propagates it to inheritors', () => {
        openSettingsTab();

        clickRowAction(defaultRectangleRequirementName, 'edit');
        cy.get('.cvat-quality-requirement-form').should('be.visible');
        cy.contains('.ant-form-item', 'Target metric').find('.ant-form-item-tooltip').trigger('mouseover');
        cy.get('.ant-tooltip').contains('View metric formulas in the documentation')
            .should('have.attr', 'href')
            .and('include', '/docs/qa-analytics/auto-qa/#quality-target-metrics');
        cy.contains('.ant-form-item', 'Target metric').find('.ant-select-selector').click();
        cy.get('.ant-select-dropdown').within(() => {
            cy.contains('.ant-select-item-group', 'Micro average').should('exist');
            cy.contains('.ant-select-item-group', 'Macro average')
                .should('have.css', 'color', 'rgb(24, 144, 255)');
            cy.contains('.ant-select-item-group', 'Worst label').should('exist');
            cy.contains('.ant-select-item-option-content', /\((micro|macro\/mean|worst label)\)/)
                .should('not.exist');
            cy.contains('.ant-select-item-group', 'Macro average')
                .nextAll('.ant-select-item-option')
                .contains('.ant-select-item-option-content', /^Jaccard Index$/)
                .first()
                .click();
        });
        cy.contains('.ant-form-item', 'Target metric').find('.ant-select-selection-item')
            .should('have.text', 'Jaccard Index (macro/mean)');
        submitForm();

        expectNotification('Requirement has been updated');
        cy.get('.cvat-quality-requirements-configuration-table').should('be.visible');
        requirementRow(defaultRectangleRequirementName).contains('Jaccard Index (macro/mean)').should('exist');
        ensureRowExpanded(defaultRectangleRequirementName);
        requirementRow(childRequirementName).contains('Jaccard Index (macro/mean)').should('exist');
        ensureRowExpanded(childRequirementName);
        requirementRow(grandchildRequirementName).contains('Jaccard Index (macro/mean)').should('exist');
    });

    it('Renames a base requirement without sending empty inherited fields', () => {
        openSettingsTab();

        clickRowAction(defaultRectangleRequirementName, 'edit');
        cy.get('.cvat-quality-requirement-form').should('be.visible');
        setFormName('Base rectangle renamed');
        submitForm();

        expectNotification('Requirement has been updated');
        cy.get('.cvat-quality-requirements-configuration-table').should('be.visible');
        requirementRow('Base rectangle renamed').should('be.visible');
    });

    it('Edits and persists interpolated IoU', () => {
        openSettingsTab();
        clickRowAction('Base rectangle renamed', 'edit');
        const editor = '.cvat-threshold-policy-editor';
        const rows = `${editor} .cvat-threshold-policy-row`;
        const canvas = `${editor} .cvat-threshold-policy-chart canvas`;
        const pointer = (type, x, y, buttons = 0) => {
            cy.get(canvas).then(($canvas) => {
                const rect = $canvas[0].getBoundingClientRect();
                cy.wrap($canvas).trigger(type, {
                    eventConstructor: 'PointerEvent',
                    pointerId: 1,
                    button: 0,
                    buttons,
                    clientX: rect.left + rect.width * x,
                    clientY: rect.top + rect.height * y,
                });
            });
        };
        cy.get(`${editor} input.ant-input-number-input`).should('have.length', 1).and('have.value', '40');
        cy.get(`${editor} .cvat-threshold-policy-chart`).should('not.exist');
        selectThresholdMode('Linear interpolation');
        cy.get(rows).should('have.length', 2);
        cy.get(rows).last().find('input[id*="iou"]').clear();
        cy.get(rows).last().find('input[id*="iou"]').type('90');
        cy.get(rows).last().find('input[id*="iou"]').blur();
        cy.get(rows).last().find('input[id*="area"]').clear();
        cy.get(`${rows}.selected`).find('input[id*="area"]').type('100');
        cy.get(`${rows}.selected`).find('input[id*="area"]').blur();
        submitForm();
        cy.contains('.ant-form-item-explain-error', 'Correct the IoU threshold fields before saving.')
            .should('be.visible');
        cy.get(`${rows}.selected`).find('input[id*="area"]').clear();
        cy.get(`${rows}.selected`).find('input[id*="area"]').type('1000');
        cy.get(`${rows}.selected`).find('input[id*="area"]').blur();
        cy.get(canvas).scrollIntoView();
        cy.get(canvas).should('be.visible');
        pointer('pointermove', 0.5, 0.5);
        cy.get(`${editor} .cvat-threshold-policy-tooltip`).should('contain', 'GT area:')
            .and('contain', 'px²').and('contain', 'IoU threshold:').and('contain', '%');
        cy.contains(`${editor} button`, 'Add point').click();
        cy.get(rows).should('have.length', 3);
        cy.get(rows).eq(1).find('button').click();
        cy.get(rows).should('have.length', 2);
        if (Cypress.isBrowser({ family: 'chromium' })) {
            // Native pointer events are needed for canvas pointer capture during a drag.
            cy.get(canvas).scrollIntoView();
            cy.get(canvas).realClick({ position: 'center', scrollBehavior: false });
            cy.get(rows).should('have.length', 3);
            cy.get(`${rows}.selected`).find('input[id*="area"]').invoke('val').then((area) => {
                cy.get(canvas).then(($canvas) => {
                    const { width, height } = $canvas[0].getBoundingClientRect();
                    cy.wrap($canvas).realMouseDown({ x: width / 2, y: height / 2, scrollBehavior: false });
                    cy.wrap($canvas).realMouseMove(width * 0.6, height * 0.4, { scrollBehavior: false });
                    cy.wrap($canvas).realMouseUp({ x: width * 0.6, y: height * 0.4, scrollBehavior: false });
                });
                cy.get(`${rows}.selected`).find('input[id*="area"]').should(($input) => {
                    expect(Number($input.val())).to.be.greaterThan(Number(area));
                });
            });
            cy.contains(`${editor} button`, 'Undo').click();
            cy.get(canvas).scrollIntoView();
            cy.get(canvas).realClick({ button: 'right', position: 'center', scrollBehavior: false });
            cy.get(rows).should('have.length', 2);
        }
        cy.get(rows).first().find('button').should('be.disabled');

        cy.intercept('PATCH', '**/api/quality/requirements/*').as('saveIouPolicy');
        submitForm();
        expectPolicyRequest('@saveIouPolicy', linearIouPolicy);
        expectNotification('Requirement has been updated');
        cy.reload();
        cy.get('.cvat-quality-requirements-configuration-table').should('be.visible');
        clickRowAction('Base rectangle renamed', 'edit');
        expectLinearThreshold();
        cy.get('.cvat-quality-requirement-form-actions').contains('button', 'Cancel').click();
    });

    it('Preserves inherited IoU when another field changes, overrides it and resets the whole policy', () => {
        openSettingsTab();
        ensureRowExpanded('Base rectangle renamed');
        clickRowAction(childRequirementName, 'edit');
        expectLinearThreshold();
        setFormThreshold(91);
        cy.intercept('PATCH', '**/api/quality/requirements/*').as('saveInheritedIou');
        submitForm();
        cy.wait('@saveInheritedIou').then(({ request, response }) => {
            expect(response.statusCode).to.equal(200);
            expect(request.body).not.to.have.property('similarity_threshold_policy');
            expect(request.body).not.to.have.property('iou_threshold');
            expect(response.body.similarity_threshold_policy).to.equal(null);
            expect(response.body.effective.similarity_threshold_policy).to.deep.equal(linearIouPolicy);
        });
        expectNotification('Requirement has been updated');

        clickRowAction(childRequirementName, 'edit');
        expectLinearThreshold();
        selectThresholdMode('Constant');
        cy.get(`${thresholdEditor} input.ant-input-number-input`).clear();
        cy.get(`${thresholdEditor} input.ant-input-number-input`).type('65');
        cy.get(`${thresholdEditor} input.ant-input-number-input`).blur();
        submitForm();
        expectPolicyRequest('@saveInheritedIou', { type: 'iou', mode: 'constant', value: 0.65 });
        expectNotification('Requirement has been updated');

        clickRowAction(childRequirementName, 'edit');
        cy.get(`${thresholdEditor} input.ant-input-number-input`).should('have.value', '65');
        cy.contains('.ant-form-item', 'IoU threshold')
            .find('.ant-form-item-label .cvat-quality-requirement-revert-button').click();
        expectLinearThreshold();
        submitForm();
        expectPolicyRequest('@saveInheritedIou', null);
        expectNotification('Requirement has been updated');
        cy.reload();
        cy.get('.cvat-quality-requirements-configuration-table').should('be.visible');
        clickRowAction(childRequirementName, 'edit');
        expectLinearThreshold();
        cy.get('.cvat-quality-requirement-form-actions').contains('button', 'Cancel').click();
    });

    it('Copies a local IoU curve without changing the source requirement', () => {
        openSettingsTab();
        ensureRowExpanded('Base rectangle renamed');
        clickRowAction(childRequirementName, 'edit');
        expectLinearThreshold();
        cy.get(thresholdRows).last().find('input[id*="iou"]').clear();
        cy.get(thresholdRows).last().find('input[id*="iou"]').type('85');
        cy.get(thresholdRows).last().find('input[id*="iou"]').blur();
        const sourcePolicy = { ...linearIouPolicy, points: [{ x: 100, y: 0.4 }, { x: 1000, y: 0.85 }] };
        cy.intercept('PATCH', '**/api/quality/requirements/*').as('saveLocalIou');
        submitForm();
        expectPolicyRequest('@saveLocalIou', sourcePolicy);
        expectNotification('Requirement has been updated');

        clickRowAction(childRequirementName, 'copy');
        expectLinearThreshold(sourcePolicy.points);
        cy.get(thresholdRows).last().find('input[id*="iou"]').clear();
        cy.get(thresholdRows).last().find('input[id*="iou"]').type('75');
        cy.get(thresholdRows).last().find('input[id*="iou"]').blur();
        const copiedPolicy = { ...linearIouPolicy, points: [{ x: 100, y: 0.4 }, { x: 1000, y: 0.75 }] };
        cy.intercept('POST', '**/api/quality/requirements*').as('copyIouPolicy');
        submitForm();
        expectPolicyRequest('@copyIouPolicy', copiedPolicy, 201);
        expectNotification('Requirement has been created');

        cy.reload();
        cy.get('.cvat-quality-requirements-configuration-table').should('be.visible');
        clickRowAction(copiedRequirementName, 'edit');
        expectLinearThreshold(copiedPolicy.points);
        cy.get('.cvat-quality-requirement-form-actions').contains('button', 'Cancel').click();
        clickRowAction(childRequirementName, 'edit');
        expectLinearThreshold(sourcePolicy.points);
        cy.get('.cvat-quality-requirement-form-actions').contains('button', 'Cancel').click();
    });

    it('Keeps the curve draft when switching modes and saves a constant IoU', () => {
        openSettingsTab();
        clickRowAction('Base rectangle renamed', 'edit');
        expectLinearThreshold();
        selectThresholdMode('Constant');
        cy.get(`${thresholdEditor} .cvat-threshold-policy-chart`).should('not.exist');
        cy.get(`${thresholdEditor} input.ant-input-number-input`).should('have.length', 1).clear();
        cy.get(`${thresholdEditor} input.ant-input-number-input`).type('70');
        cy.get(`${thresholdEditor} input.ant-input-number-input`).blur();
        selectThresholdMode('Linear interpolation');
        expectLinearThreshold();
        selectThresholdMode('Constant');
        cy.get(`${thresholdEditor} input.ant-input-number-input`).should('have.value', '70');
        cy.intercept('PATCH', '**/api/quality/requirements/*').as('saveConstantIou');
        submitForm();
        expectPolicyRequest('@saveConstantIou', { type: 'iou', mode: 'constant', value: 0.7 });
        expectNotification('Requirement has been updated');
        cy.reload();
        cy.get('.cvat-quality-requirements-configuration-table').should('be.visible');
        clickRowAction('Base rectangle renamed', 'edit');
        cy.get(`${thresholdEditor} .cvat-threshold-policy-chart`).should('not.exist');
        cy.get(`${thresholdEditor} input.ant-input-number-input`).should('have.length', 1).and('have.value', '70');
    });
});
