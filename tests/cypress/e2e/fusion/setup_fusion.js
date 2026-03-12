// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import {
    projectName, labelName, attrName,
    task2dName, task3dName, pcdZip, imageFile,
} from '../../support/const_fusion';
import { defaultTaskSpec } from '../../support/default-specs';

it('Set up fusion viewer test project', () => {
    cy.visit('/auth/login');
    cy.headlessLogin();

    // Create project with link_id attribute
    const projectSpec = {
        name: projectName,
        labels: [{
            name: labelName,
            attributes: [{
                name: attrName,
                input_type: 'text',
                mutable: true,
                default_value: '',
                values: [],
            }],
        }],
    };

    cy.headlessCreateProject(projectSpec).then(({ projectID }) => {
        // Write projectID to a file for other specs
        cy.writeFile('cypress/fixtures/fusion_project.json', { projectID });

        // Create 2D task
        const { taskSpec: taskSpec2d, dataSpec: dataSpec2d, extras: extras2d } = defaultTaskSpec({
            taskName: task2dName,
            labelName,
            serverFiles: [imageFile],
            projectID,
        });
        cy.intercept('POST', '/api/tasks**').as('createTask2d');
        cy.headlessCreateTask(taskSpec2d, dataSpec2d, extras2d);
        cy.wait('@createTask2d');

        // Create 3D task
        const { taskSpec: taskSpec3d, dataSpec: dataSpec3d, extras: extras3d } = defaultTaskSpec({
            taskName: task3dName,
            labelName,
            serverFiles: [pcdZip],
            projectID,
        });
        cy.intercept('POST', '/api/tasks**').as('createTask3d');
        cy.headlessCreateTask(taskSpec3d, dataSpec3d, extras3d);
        cy.wait('@createTask3d');
    });
});
