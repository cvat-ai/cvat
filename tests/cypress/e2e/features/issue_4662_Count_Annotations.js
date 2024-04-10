import { taskName, labelName } from '../../support/const';

context('Count total annotation, issues and labels', () => {
    const issueId = '4662';
    const createRectangleShape2Points = [{
        points: 'By 2 Points',
        type: 'Shape',
        labelName,
        firstX: 250,
        firstY: 350,
        secondX: 350,
        secondY: 450,
    },
    {
        points: 'By 2 Points',
        type: 'Shape',
        labelName,
        firstX: 500,
        firstY: 100,
        secondX: 700,
        secondY: 200,
    },
    {
        points: 'By 2 Points',
        type: 'Shape',
        labelName,
        firstX: 400,
        firstY: 300,
        secondX: 450,
        secondY: 400,
    },
    ];

    before(() => {
        cy.openTaskJob(taskName);
    });

    after(() => {
        cy.goToTaskList();
        cy.deleteTask('New annotation task for Main task');
        cy.logout();
    });

    describe(`Testing issue ${issueId}`, () => {
        it('Count Annotations', () => {
            createRectangleShape2Points.forEach((obj) => {
                cy.createRectangle(obj);
            });
            cy.contains('.cvat-objects-sidebar-states-header', 'Items: 3').should('exist');
        });

        it('Count Labels', () => {
            cy.get('[role="tab"]').eq(1).contains('Labels').click();
            cy.contains('.cvat-objects-sidebar-labels-list-header', 'Items: 1').should('exist');
        });

        it('Save Changes', () => {
            cy.get('body').type('{ctrl}s');
        });

        it('Count Issues', () => {
            cy.goToTaskList();
            cy.get('.cvat-item-open-task-button').eq(0).click();
            cy.get('.cvat-job-item-stage').eq(2).click();
            cy.get('[title="validation"]').click();
            cy.get('.cvat-job-item').eq(2).contains('Job').click();
            cy.get('.cvat-issue-control').click();
            cy.get('.cvat_canvas_shape').eq(0).click();
            cy.get('body').type('issue 1');
            cy.get('[type="submit"]').click();
            cy.get('[role="tab"]').eq(2).contains('Issues').click();
            cy.contains('.cvat-objects-sidebar-issues-list-header', 'Items: 1').should('exist');
        });
    });
});
