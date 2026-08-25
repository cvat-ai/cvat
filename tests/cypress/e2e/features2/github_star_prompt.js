// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context('GitHub star prompt', () => {
    const username = `github-star-prompt-${Date.now()}`;
    const password = 'GitHubStarPrompt1!';
    const user = {
        username,
        password,
        firstName: 'GitHub',
        lastName: 'Prompt',
        email: `${username}@local.local`,
    };
    let growthData;

    before(() => {
        cy.visit('/auth/login');
        cy.headlessCreateUser(user);
    });

    after(() => {
        cy.headlessLogin();
        cy.headlessDeleteUserByUsername(username);
        cy.headlessLogout();
    });

    it('shows the prompt and saves user interactions', () => {
        cy.headlessLogin(user).then((loggedInUser) => {
            growthData = {
                id: 1,
                owner: loggedInUser.serialize(),
                github_prompt_shown: false,
                github_prompt_support_clicked: false,
                github_prompt_enabled: true,
                promotion_notifications_allowed: true,
            };

            cy.intercept('GET', '/api/growth**', (request) => {
                expect(request.query).to.have.property('user_id', String(loggedInUser.id));
                request.reply({
                    statusCode: 200,
                    body: {
                        count: 1,
                        next: null,
                        previous: null,
                        results: [growthData],
                    },
                });
            }).as('getGrowthData');

            cy.intercept('PATCH', '/api/growth/*', (request) => {
                growthData = {
                    ...growthData,
                    ...request.body,
                    github_prompt_enabled: false,
                };
                request.reply({ statusCode: 200, body: growthData });
            }).as('updateGrowthData');

            cy.visit('/tasks');
        });

        cy.wait('@getGrowthData');
        cy.get('.cvat-github-star-modal').should('be.visible').within(() => {
            cy.contains('Like labeling').should('be.visible');
            cy.contains('button', 'Star CVAT on GitHub').should('be.visible');
            cy.contains('button', 'Maybe later').should('be.visible');
        });

        cy.wait('@updateGrowthData').then(({ request, response }) => {
            expect(request.body).to.deep.equal({ github_prompt_shown: true });
            expect(response.statusCode).to.equal(200);
        });

        cy.window().then((window) => {
            cy.stub(window, 'open').as('openGitHub');
        });
        cy.contains('.cvat-github-star-modal button', 'Star CVAT on GitHub').click();

        cy.wait('@updateGrowthData').then(({ request, response }) => {
            expect(request.body).to.deep.equal({ github_prompt_support_clicked: true });
            expect(response.statusCode).to.equal(200);
        });
        cy.get('@openGitHub').should(
            'have.been.calledWith',
            'https://github.com/cvat-ai/cvat',
            '_blank',
            'noopener,noreferrer',
        );
        cy.get('.cvat-github-star-modal').should('not.exist');

        cy.openProfile();
        cy.get('.cvat-profile-page-menu-item-privacy-consent').click();
        cy.get('.cvat-profile-privacy-consent-card').within(() => {
            cy.get('.ant-switch').should('have.attr', 'aria-checked', 'true').click();
            cy.contains('button', 'Save changes').click();
        });

        cy.wait('@updateGrowthData').then(({ request, response }) => {
            expect(request.body).to.deep.equal({ promotion_notifications_allowed: false });
            expect(response.statusCode).to.equal(200);
        });
    });
});
