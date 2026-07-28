// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

describe('Delete users, tasks, projects, organizations created during the tests run.', () => {
    let authHeaders = null;

    before(() => {
        cy.task('getAuthHeaders').then((_authHeaders) => {
            authHeaders = _authHeaders;
        });
    });

    it('Get a list of tasks and delete them all', () => {
        cy.request({
            url: '/api/tasks?page_size=1000',
            headers: authHeaders,
        }).then((response) => {
            const responseResult = response.body.results;
            for (const task of responseResult) {
                const { id } = task;
                cy.request({
                    method: 'DELETE',
                    url: `/api/tasks/${id}`,
                    headers: authHeaders,
                });
            }
        });
    });

    it('Get a list of projects and delete them all', () => {
        cy.request({
            url: '/api/projects?page_size=all',
            headers: authHeaders,
        }).then((response) => {
            const responseResult = response.body.results;
            for (const project of responseResult) {
                const { id } = project;
                cy.request({
                    method: 'DELETE',
                    url: `/api/projects/${id}`,
                    headers: authHeaders,
                });
            }
        });
    });

    it('Get a list of organizations and delete them all', () => {
        cy.request({
            url: '/api/organizations?page_size=all',
            headers: authHeaders,
        }).then((response) => {
            const responseResult = response.body.results;
            for (const org of responseResult) {
                const { id } = org;
                cy.request({
                    method: 'DELETE',
                    url: `/api/organizations/${id}`,
                    headers: authHeaders,
                });
            }
        });
    });

    it('Get a list of users and delete all except id:1', () => {
        cy.request({
            url: '/api/users',
            headers: authHeaders,
        }).then((response) => {
            const responseResult = response.body.results;
            for (const user of responseResult) {
                const { id } = user;
                if (id !== 1) {
                    cy.request({
                        method: 'DELETE',
                        url: `/api/users/${id}`,
                        headers: authHeaders,
                    });
                }
            }
        });
    });
});
