// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

const store = require('store');
const Issue = require('./issue');
const User = require('./user');
const { ArgumentError } = require('./exceptions');
const { ReviewStatus } = require('./enums');
const { negativeIDGenerator } = require('./common');

/**
 * Class representing a single review
 * @memberof module:API.cvat.classes
 * @hideconstructor
 */
class Review {
    constructor(initialData) {
        const data = {
            id: undefined,
            job: undefined,
            issue_set: [],
            estimated_quality: undefined,
            status: undefined,
            reviewer: undefined,
            assignee: undefined,
        };

        for (const property in data) {
            if (Object.prototype.hasOwnProperty.call(data, property) && property in initialData) {
                data[property] = initialData[property];
            }
        }

        if (data.issue_set) {
            data.issue_set = data.issue_set.map((issue) => new Issue(issue));
        }
        if (data.reviewer !== null) {
            data.reviewer = User.objects[data.reviewer];
        }
        if (data.assignee !== null) {
            data.assignee = User.objects[data.assignee];
        }
        if (typeof data.id === 'undefined') {
            data.id = negativeIDGenerator();
        }

        Object.defineProperties(
            this,
            Object.freeze({
                /**
                 * @name id
                 * @type {integer}
                 * @memberof module:API.cvat.classes.Review
                 * @readonly
                 * @instance
                 */
                id: {
                    get: () => data.id,
                },
                /**
                 * An identifier of a job the review is attached to
                 * @name job
                 * @type {integer}
                 * @memberof module:API.cvat.classes.Review
                 * @readonly
                 * @instance
                 */
                job: {
                    get: () => data.job,
                },
                /**
                 * List of attached issues
                 * @name issues
                 * @type {number[]}
                 * @memberof module:API.cvat.classes.Review
                 * @instance
                 * @readonly
                 */
                issues: {
                    get: () => data.issue_set.filter((issue) => !issue.removed),
                },
                /**
                 * Estimated quality of the review
                 * @name estimatedQuality
                 * @type {number}
                 * @memberof module:API.cvat.classes.Review
                 * @instance
                 * @readonly
                 * @throws {module:API.cvat.exceptions.ArgumentError}
                 */
                estimatedQuality: {
                    get: () => data.estimated_quality,
                    set: (value) => {
                        if (typeof value !== 'number' || value < 0 || value > 5) {
                            throw new ArgumentError(`Value must be a number in range [0, 5]. Got ${value}`);
                        }
                        data.estimated_quality = value;
                    },
                },
                /**
                 * @name status
                 * @type {module:API.cvat.enums.ReviewStatus}
                 * @memberof module:API.cvat.classes.Review
                 * @instance
                 * @readonly
                 * @throws {module:API.cvat.exceptions.ArgumentError}
                 */
                status: {
                    get: () => data.status,
                    set: (status) => {
                        const type = ReviewStatus;
                        let valueInEnum = false;
                        for (const value in type) {
                            if (type[value] === status) {
                                valueInEnum = true;
                                break;
                            }
                        }

                        if (!valueInEnum) {
                            throw new ArgumentError(
                                'Value must be a value from the enumeration cvat.enums.ReviewStatus',
                            );
                        }

                        data.status = status;
                    },
                },
                /**
                 * An instance of a user who has done the review
                 * @name reviewer
                 * @type {module:API.cvat.classes.User}
                 * @memberof module:API.cvat.classes.Review
                 * @readonly
                 * @instance
                 */
                reviewer: {
                    get: () => data.reviewer,
                },
                /**
                 * An instance of a user who was assigned for annotation before the review
                 * @name assignee
                 * @type {module:API.cvat.classes.User}
                 * @memberof module:API.cvat.classes.Issue
                 * @readonly
                 * @instance
                 */
                assignee: {
                    get: () => data.assignee,
                },
                __internal: {
                    get: () => data,
                },
            }),
        );
    }

    async openIssue(jobID, data) {
        this.__internal.issue_set.push(new Issue(data));

        if (typeof this.id === 'undefined') {
            await this.toLocalStorage(jobID);
        }
    }

    // eslint-disable no-empty
    async submit() {
        // if (typeof (this.id) !== 'undefined') {
        //     return;
        // }
        // submit all issues from a local storage to server
        // remove from local storage
        // serializer & save the review on the server if don't have ID
        // else ignore
    }

    toJSON() {
        const { issues } = this;
        const data = {
            job: this.job,
            issue_set: issues,
        };

        if (this.id > 0) {
            data.id = this.id;
        }
        if (typeof this.estimated_quality !== 'undefined') {
            data.estimated_quality = this.estimated_quality;
        }
        if (typeof this.status !== 'undefined') {
            data.status = this.status;
        }
        if (this.reviewer) {
            data.reviewer = this.reviewer.id;
        }
        if (this.assignee) {
            data.assignee = this.assignee.id;
        }

        return data;
    }

    async toLocalStorage(jobID) {
        if (!Number.isInteger(jobID)) {
            throw new ArgumentError(`JobID is expected to be an integer. ${jobID} got`);
        }

        store.set(`job-${jobID}-review`, JSON.stringify(this));
    }
}

module.exports = Review;
