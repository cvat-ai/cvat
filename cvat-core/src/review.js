// Copyright (C) 2020-2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

const store = require('store');

const PluginRegistry = require('./plugins');
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
            reviewed_frames: undefined,
            reviewed_states: undefined,
        };

        for (const property in data) {
            if (Object.prototype.hasOwnProperty.call(data, property) && property in initialData) {
                data[property] = initialData[property];
            }
        }

        if (data.reviewer && !(data.reviewer instanceof User)) data.reviewer = new User(data.reviewer);
        if (data.assignee && !(data.assignee instanceof User)) data.assignee = new User(data.assignee);

        data.reviewed_frames = Array.isArray(data.reviewed_frames) ? new Set(data.reviewed_frames) : new Set();
        data.reviewed_states = Array.isArray(data.reviewed_states) ? new Set(data.reviewed_states) : new Set();
        if (data.issue_set) {
            data.issue_set = data.issue_set.map((issue) => new Issue(issue));
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

    /**
     * Method appends a frame to a set of reviewed frames
     * Reviewed frames are saved only in local storage
     * @method reviewFrame
     * @memberof module:API.cvat.classes.Review
     * @param {number} frame
     * @readonly
     * @instance
     * @async
     * @throws {module:API.cvat.exceptions.ArgumentError}
     * @throws {module:API.cvat.exceptions.PluginError}
     */
    async reviewFrame(frame) {
        const result = await PluginRegistry.apiWrapper.call(this, Review.prototype.reviewFrame, frame);
        return result;
    }

    /**
     * Method appends a frame to a set of reviewed frames
     * Reviewed states are saved only in local storage. They are used to automatic annotations quality assessment
     * @method reviewStates
     * @memberof module:API.cvat.classes.Review
     * @param {string[]} stateIDs
     * @readonly
     * @instance
     * @async
     * @throws {module:API.cvat.exceptions.ArgumentError}
     * @throws {module:API.cvat.exceptions.PluginError}
     */
    async reviewStates(stateIDs) {
        const result = await PluginRegistry.apiWrapper.call(this, Review.prototype.reviewStates, stateIDs);
        return result;
    }

    /**
     * @typedef {Object} IssueData
     * @property {number} frame
     * @property {number[]} position
     * @property {number} owner
     * @property {CommentData[]} comment_set
     * @global
     */
    /**
     * Method adds a new issue to the review
     * @method openIssue
     * @memberof module:API.cvat.classes.Review
     * @param {IssueData} data
     * @returns {module:API.cvat.classes.Issue}
     * @readonly
     * @instance
     * @async
     * @throws {module:API.cvat.exceptions.ArgumentError}
     * @throws {module:API.cvat.exceptions.PluginError}
     */
    async openIssue(data) {
        const result = await PluginRegistry.apiWrapper.call(this, Review.prototype.openIssue, data);
        return result;
    }

    async deleteIssue(issueId) {
        await PluginRegistry.apiWrapper.call(this, Review.prototype.deleteIssue, issueId);
    }

    /**
     * Method submits local review to the server
     * @method submit
     * @memberof module:API.cvat.classes.Review
     * @readonly
     * @instance
     * @async
     * @throws {module:API.cvat.exceptions.DataError}
     * @throws {module:API.cvat.exceptions.PluginError}
     */
    async submit() {
        const result = await PluginRegistry.apiWrapper.call(this, Review.prototype.submit);
        return result;
    }

    serialize() {
        const { issues, reviewedFrames, reviewedStates } = this;
        const data = {
            job: this.job,
            issue_set: issues.map((issue) => issue.serialize()),
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
            data.reviewer = this.reviewer.toJSON();
        }
        if (this.assignee) {
            data.reviewer = this.assignee.toJSON();
        }

        return data;
    }

    toJSON() {
        const data = this.serialize();
        const {
            reviewer,
            assignee,
            reviewed_frames: reviewedFrames,
            reviewed_states: reviewedStates,
            ...updated
        } = data;

        return {
            ...updated,
            issue_set: this.issues.map((issue) => issue.toJSON()),
            reviewer_id: reviewer ? reviewer.id : undefined,
            assignee_id: assignee ? assignee.id : undefined,
        };
    }

    async toLocalStorage() {
        const data = this.serialize();
        store.set(`job-${this.job}-review`, JSON.stringify(data));
    }
}

Review.prototype.reviewFrame.implementation = function (frame) {
    if (!Number.isInteger(frame)) {
        throw new ArgumentError(`The argument "frame" is expected to be an integer. Got ${frame}`);
    }
    this.__internal.reviewed_frames.add(frame);
};

Review.prototype.reviewStates.implementation = function (stateIDs) {
    if (!Array.isArray(stateIDs) || stateIDs.some((stateID) => typeof stateID !== 'string')) {
        throw new ArgumentError(`The argument "stateIDs" is expected to be an array of string. Got ${stateIDs}`);
    }

    stateIDs.forEach((stateID) => this.__internal.reviewed_states.add(stateID));
};

Review.prototype.openIssue.implementation = async function (data) {
    if (typeof data !== 'object' || data === null) {
        throw new ArgumentError(`The argument "data" must be a not null object. Got ${data}`);
    }

    if (typeof data.frame !== 'number') {
        throw new ArgumentError(`Issue frame must be a number. Got ${data.frame}`);
    }

    if (!(data.owner instanceof User)) {
        throw new ArgumentError(`Issue owner must be a User instance. Got ${data.owner}`);
    }

    if (!Array.isArray(data.position) || data.position.some((coord) => typeof coord !== 'number')) {
        throw new ArgumentError(`Issue position must be an array of numbers. Got ${data.position}`);
    }

    if (!Array.isArray(data.comment_set)) {
        throw new ArgumentError(`Issue comment set must be an array. Got ${data.comment_set}`);
    }

    const copied = {
        frame: data.frame,
        position: Issue.hull(data.position),
        owner: data.owner,
        comment_set: [],
    };

    const issue = new Issue(copied);

    for (const comment of data.comment_set) {
        await issue.comment.implementation.call(issue, comment);
    }

    this.__internal.issue_set.push(issue);
    return issue;
};

Review.prototype.submit.implementation = async function () {
    if (typeof this.estimatedQuality === 'undefined') {
        throw new DataError('Estimated quality is expected to be a number. Got "undefined"');
    }

    if (typeof this.status === 'undefined') {
        throw new DataError('Review status is expected to be a string. Got "undefined"');
    }

    if (this.id < 0) {
        const data = this.toJSON();

        const response = await serverProxy.jobs.reviews.create(data);
        store.remove(`job-${this.job}-review`);
        this.__internal.id = response.id;
        this.__internal.issue_set = response.issue_set.map((issue) => new Issue(issue));
        this.__internal.estimated_quality = response.estimated_quality;
        this.__internal.status = response.status;

        if (response.reviewer) this.__internal.reviewer = new User(response.reviewer);
        if (response.assignee) this.__internal.assignee = new User(response.assignee);
    }
};

Review.prototype.deleteIssue.implementation = function (issueId) {
    this.__internal.issue_set = this.__internal.issue_set.filter((issue) => issue.id !== issueId);
};

module.exports = Review;
