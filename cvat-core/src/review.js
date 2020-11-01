// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

const store = require('store');
const Issue = require('./issue');
const User = require('./user');
const { ArgumentError, DataError } = require('./exceptions');
const { ReviewStatus } = require('./enums');
const { negativeIDGenerator } = require('./common');
const serverProxy = require('./server-proxy');

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
            reviewed_frames: new Set(),
            reviewed_states: new Set(),
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
                 * @throws {module:API.cvat.exceptions.ArgumentError}
                 */
                reviewer: {
                    get: () => data.reviewer,
                    set: (reviewer) => {
                        if (!(reviewer instanceof User)) {
                            throw new ArgumentError(`Reviewer must be an instance of the User class. Got ${reviewer}`);
                        }

                        data.reviewer = reviewer;
                    },
                },
                /**
                 * An instance of a user who was assigned for annotation before the review
                 * @name assignee
                 * @type {module:API.cvat.classes.User}
                 * @memberof module:API.cvat.classes.Review
                 * @readonly
                 * @instance
                 */
                assignee: {
                    get: () => data.assignee,
                },
                /**
                 * A set of frames that have been visited during review
                 * @name reviewedFrames
                 * @type {number[]}
                 * @memberof module:API.cvat.classes.Review
                 * @readonly
                 * @instance
                 */
                reviewedFrames: {
                    get: () => Array.from(data.reviewed_frames),
                },
                /**
                 * A set of reviewed states (server IDs combined with frames)
                 * @name reviewedFrames
                 * @type {string[]}
                 * @memberof module:API.cvat.classes.Review
                 * @readonly
                 * @instance
                 */
                reviewedStates: {
                    get: () => Array.from(data.reviewed_states),
                },
                __internal: {
                    get: () => data,
                },
            }),
        );
    }

    async reviewFrame(frame) {
        this.__internal.reviewed_frames.add(frame);
    }

    async reviewStates(stateIDs) {
        stateIDs.forEach((stateID) => this.__internal.reviewed_states.add(stateID));
    }

    async openIssue(data) {
        this.__internal.issue_set.push(new Issue(data));

        if (typeof this.id === 'undefined') {
            await this.toLocalStorage(this.job);
        }
    }

    // eslint-disable no-empty
    async submit() {
        if (typeof this.estimatedQuality === 'undefined') {
            throw new DataError('Estimated quality is expected to be a number. Got "undefined"');
        }

        if (typeof this.status === 'undefined') {
            throw new DataError('Review status is expected to be a string. Got "undefined"');
        }

        if (this.id < 0) {
            const data = this.toJSON();
            delete data.reviewed_frames; // doesn't need on server
            delete data.reviewed_states; // doesn't need on server

            const result = await serverProxy.jobs.reviews.create(this.job, data);
            store.remove(`job-${this.job}-review`);
            this.__internal.id = result.id;
            this.__internal.issue_set = result.issue_set.map((issue) => new Issue(issue));
            this.__internal.estimated_quality = result.estimated_quality;
            this.__internal.status = result.status;
            if (result.assignee && !(result.assignee in User.objects)) {
                const userData = await serverProxy.users.get(result.assignee);
                new User(userData);
            }

            if (result.assignee && !(result.assignee in User.objects)) {
                const userData = await serverProxy.users.get(result.assignee);
                new User(userData);
            }

            if (result.reviewer && !(result.reviewer in User.objects)) {
                const userData = await serverProxy.users.get(result.reviewer);
                new User(userData);
            }

            this.__internal.reviewer = User.objects[result.reviewer];
            this.__internal.assignee = User.objects[result.assignee];
        }
    }

    toJSON() {
        const { issues, reviewedFrames, reviewedStates } = this;
        const data = {
            job: this.job,
            issue_set: issues,
            reviewed_frames: Array.from(reviewedFrames),
            reviewed_states: Array.from(reviewedStates),
        };

        if (this.id > 0) {
            data.id = this.id;
        }
        if (typeof this.estimatedQuality !== 'undefined') {
            data.estimated_quality = this.estimatedQuality;
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

    async toLocalStorage() {
        store.set(`job-${this.job}-review`, JSON.stringify(this));
    }
}

module.exports = Review;
