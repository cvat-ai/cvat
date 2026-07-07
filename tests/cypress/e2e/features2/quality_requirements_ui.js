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
            if ($row.find('.ant-table-row-expand-icon-collapsed').length) {
                cy.wrap($row).find('.ant-table-row-expand-icon-collapsed').click();
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

    it('Switches between constructor and raw editor tabs', () => {
        openSettingsTab();

        cy.get('.cvat-quality-requirements-editor').within(() => {
            cy.contains('.ant-tabs-tab', 'Raw').click();
        });
        cy.get('.cvat-quality-requirements-raw-viewer').should('be.visible');
        cy.get('.cvat-quality-requirements-raw-actions').within(() => {
            cy.contains('button', 'Apply').should('not.exist');
            cy.contains('button', 'Cancel').should('exist');
        });

        cy.get('.cvat-quality-requirements-raw-viewer').then(($textarea) => {
            const initialValue = $textarea.val();

            cy.wrap($textarea).clear();
            cy.get('.cvat-quality-requirements-raw-viewer').type('[]', { parseSpecialCharSequences: false });
            cy.contains('.cvat-quality-requirements-raw-actions button', 'Cancel').click();
            cy.get('.cvat-quality-requirements-raw-viewer').should('have.value', initialValue);
        });

        cy.get('.cvat-quality-requirements-editor').within(() => {
            cy.contains('.ant-tabs-tab', 'Constructor').click();
        });
        cy.get('.cvat-quality-requirements-configuration-table').should('be.visible');
    });
});
