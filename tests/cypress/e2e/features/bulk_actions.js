// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />
/// <reference types="../../support/index.d.ts" />

import { defaultTaskSpec } from '../../support/default-specs';

context('This is your test project title', () => {
    const taskName = 'task_bulk_actions';
    const projectName = 'project_bulk_actions';
    const serverFiles = ['smallArchive.zip'];
    const labelName = 'car';
    const project = {
        name: projectName,
        label: 'car',
        attrName: 'color',
        attrValue: 'red',
        multiAttrParams: false,
    };
    const projectSpec = {
        name: project.name,
        labels: [{
            name: labelName,
            attributes: [{
                name: project.attrName,
                mutable: false,
                input_type: 'text',
                default_value: project.attrValue,
                values: [project.attrValue],
            }],
        }],
    };
    const projects = [];
    const augmentName = ((obj, suffix) => ({ ...obj, name: obj.name.concat(suffix) }));
    before(() => {
        cy.visit('/auth/login');
        cy.headlessLogin();

        const ntasks = 2;
        const nprojects = 2;
        for (let i = 1; i <= nprojects; i++) {
            const pspec = augmentName(projectSpec, `_${i}`);
            cy.headlessCreateProject(pspec).then(({ projectID }) => {
                const { taskSpec, dataSpec, extras } = defaultTaskSpec({
                    labelName, taskName, serverFiles, projectID,
                });
                for (let j = 1; j <= ntasks; j++) {
                    const tspec = augmentName(taskSpec, `_${j}`);
                    cy.headlessCreateTask(tspec, dataSpec, extras);
                }
                projects.push(projectID);
            });
        }
    });

    after(() => {
        projects.forEach(cy.headlessDeleteProject);
    });

    describe('This is your test suite title', () => {
        it('This is your test case two title', () => {

        });
    });
});
