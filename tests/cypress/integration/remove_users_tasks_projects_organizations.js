// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

let authKey = '';

describe('Delete users, tasks, projects, organizations created during the tests run.', () => {
    it('Get token', () => {
        cy.request({
            method: 'POST',
            url: '/api/v1/auth/login',
            body: {
                username: Cypress.env('user'),
                email: Cypress.env('email'),
                password: Cypress.env('password'),
            },
        }).then((response) => {
            authKey = response.body.key;
        });
    });

    it('Get a list of tasks and delete them all', () => {
        cy.request({
            url: '/api/v1/tasks?page_size=1000',
            headers: {
                Authorization: `Token ${authKey}`,
            },
        }).then((response) => {
            const responseResult = response.body.results;
            for (const task of responseResult) {
                const { id } = task;
                cy.request({
                    method: 'DELETE',
                    url: `/api/v1/tasks/${id}`,
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
        }).then((response) => {
            const responseResult = response.body.results;
            for (const project of responseResult) {
                const { id } = project;
                cy.request({
                    method: 'DELETE',
                    url: `/api/v1/projects/${id}`,
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
        }).then((response) => {
            const responseResult = response.body;
            for (const org of responseResult) {
                const { id } = org;
                cy.request({
                    method: 'DELETE',
                    url: `/api/v1/organizations/${id}`,
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
        }).then((response) => {
            const responseResult = response.body.results;
            for (const user of responseResult) {
                const { id } = user;
                if (id !== 1) {
                    cy.request({
                        method: 'DELETE',
                        url: `/api/v1/users/${id}`,
                        headers: {
                            Authorization: `Token ${authKey}`,
                        },
                    });
                }
            }
        });
    });
});
