// Copyright (C) 2020-2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

let authKey = '';

describe('Delete users, tasks, projects, organizations created during the test run.', () => {
    it('Get token', () => {
        cy.request({
            method: 'POST',
            url: '/api/v1/auth/login',
            body: {
                username: Cypress.env('user'),
                email: Cypress.env('email'),
                password: Cypress.env('password'),
            },
        }).then(async (response) => {
            authKey = await response.body.key;
        });
    });

    it('Get a list of tasks and delete them all', () => {
        cy.request({
            url: '/api/v1/tasks?page_size=1000',
            headers: {
                Authorization: `Token ${authKey}`,
            },
        }).then(async (response) => {
            const responceResult = await response.body.results;
            for (const tasks of responceResult) {
                const taskId = tasks.id;
                cy.request({
                    method: 'DELETE',
                    url: `/api/v1/tasks/${taskId}`,
                    headers: {
                        Authorization: `Token ${authKey}`,
                    },
                });
            }
        });
    });

    it('Get a list of projects and delete them all', () => {
        cy.request({
            url: '/api/v1/projects?page_size=all',
            headers: {
                Authorization: `Token ${authKey}`,
            },
        }).then(async (response) => {
            const responceResult = await response.body.results;
            for (const tasks of responceResult) {
                const taskId = tasks.id;
                cy.request({
                    method: 'DELETE',
                    url: `/api/v1/projects/${taskId}`,
                    headers: {
                        Authorization: `Token ${authKey}`,
                    },
                });
            }
        });
    });

    it('Get a list of organizations and delete them all', () => {
        cy.request({
            url: '/api/v1/organizations?page_size=all',
            headers: {
                Authorization: `Token ${authKey}`,
            },
        }).then(async (response) => {
            const responceResult = await response.body;
            for (const orgs of responceResult) {
                const orgId = orgs.id;
                cy.request({
                    method: 'DELETE',
                    url: `/api/v1/organizations/${orgId}`,
                    headers: {
                        Authorization: `Token ${authKey}`,
                    },
                });
            }
        });
    });

    it('Get a list of users and delete all except id:1', () => {
        cy.request({
            url: '/api/v1/users',
            headers: {
                Authorization: `Token ${authKey}`,
            },
        }).then(async (response) => {
            const responceResult = await response.body.results;
            for (const user of responceResult) {
                const userId = user.id;
                if (userId !== 1) {
                    cy.request({
                        method: 'DELETE',
                        url: `/api/v1/users/${userId}`,
                        headers: {
                            Authorization: `Token ${authKey}`,
                        },
                    });
                }
            }
        });
    });
});
