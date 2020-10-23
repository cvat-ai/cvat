// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

let authKey = '';

describe('Delete users and tasks created during the test run.', () => {
    it('Get token', () => {
        cy.request({
            method: 'POST',
            url: '/api/v1/auth/login',
            body: {
                username: Cypress.env('user'),
                password: Cypress.env('password'),
            },
        }).then(async (responce) => {
            authKey = await responce['body']['key'];
        });
    });
    it('Get a list of users and delete all except id:1', () => {
        cy.request({
            url: '/api/v1/users',
            headers: {
                Authorization: `Token ${authKey}`,
            },
        }).then(async (responce) => {
            const responceResult = await responce['body']['results'];
            for (let user of responceResult) {
                let userId = user['id'];
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
    it('Get a list of tasks and delete them all', () => {
        cy.request({
            url: '/api/v1/tasks?page_size=1000',
            headers: {
                Authorization: `Token ${authKey}`,
            },
        }).then(async (responce) => {
            const responceResult = await responce['body']['results'];
            for (let tasks of responceResult) {
                let taskId = tasks['id'];
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
});
