// Copyright (C) 2019-2022 Intel Corporation
// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

interface RawUserData {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    groups: string[];
    last_login: string;
    date_joined: string;
    is_staff: boolean;
    is_superuser: boolean;
    is_active: boolean;
    email_verification_required: boolean;
}

export default class User {
    public readonly id: number;
    public readonly username: string;
    public readonly email: string;
    public readonly firstName: string;
    public readonly lastName: string;
    public readonly groups: string[];
    public readonly lastLogin: string;
    public readonly dateJoined: string;
    public readonly isStaff: boolean;
    public readonly isSuperuser: boolean;
    public readonly isActive: boolean;
    public readonly isVerified: boolean;

    constructor(initialData: RawUserData) {
        const data = {
            id: null,
            username: null,
            email: null,
            first_name: null,
            last_name: null,
            groups: null,
            last_login: null,
            date_joined: null,
            is_staff: null,
            is_superuser: null,
            is_active: null,
            email_verification_required: null,
        };

        for (const property in data) {
            if (Object.prototype.hasOwnProperty.call(data, property) && property in initialData) {
                data[property] = initialData[property];
            }
        }

        Object.defineProperties(
            this,
            Object.freeze({
                id: {
                    /**
                     * @name id
                     * @type {number}
                     * @memberof module:API.cvat.classes.User
                     * @readonly
                     * @instance
                     */
                    get: () => data.id,
                },
                username: {
                    /**
                     * @name username
                     * @type {string}
                     * @memberof module:API.cvat.classes.User
                     * @readonly
                     * @instance
                     */
                    get: () => data.username,
                },
                email: {
                    /**
                     * @name email
                     * @type {string}
                     * @memberof module:API.cvat.classes.User
                     * @readonly
                     * @instance
                     */
                    get: () => data.email,
                },
                firstName: {
                    /**
                     * @name firstName
                     * @type {string}
                     * @memberof module:API.cvat.classes.User
                     * @readonly
                     * @instance
                     */
                    get: () => data.first_name,
                },
                lastName: {
                    /**
                     * @name lastName
                     * @type {string}
                     * @memberof module:API.cvat.classes.User
                     * @readonly
                     * @instance
                     */
                    get: () => data.last_name,
                },
                groups: {
                    /**
                     * @name groups
                     * @type {string[]}
                     * @memberof module:API.cvat.classes.User
                     * @readonly
                     * @instance
                     */
                    get: () => JSON.parse(JSON.stringify(data.groups)),
                },
                lastLogin: {
                    /**
                     * @name lastLogin
                     * @type {string}
                     * @memberof module:API.cvat.classes.User
                     * @readonly
                     * @instance
                     */
                    get: () => data.last_login,
                },
                dateJoined: {
                    /**
                     * @name dateJoined
                     * @type {string}
                     * @memberof module:API.cvat.classes.User
                     * @readonly
                     * @instance
                     */
                    get: () => data.date_joined,
                },
                isStaff: {
                    /**
                     * @name isStaff
                     * @type {boolean}
                     * @memberof module:API.cvat.classes.User
                     * @readonly
                     * @instance
                     */
                    get: () => data.is_staff,
                },
                isSuperuser: {
                    /**
                     * @name isSuperuser
                     * @type {boolean}
                     * @memberof module:API.cvat.classes.User
                     * @readonly
                     * @instance
                     */
                    get: () => data.is_superuser,
                },
                isActive: {
                    /**
                     * @name isActive
                     * @type {boolean}
                     * @memberof module:API.cvat.classes.User
                     * @readonly
                     * @instance
                     */
                    get: () => data.is_active,
                },
                isVerified: {
                    /**
                     * @name isVerified
                     * @type {boolean}
                     * @memberof module:API.cvat.classes.User
                     * @readonly
                     * @instance
                     */
                    get: () => !data.email_verification_required,
                },
            }),
        );
    }

    serialize(): RawUserData {
        return {
            id: this.id,
            username: this.username,
            email: this.email,
            first_name: this.firstName,
            last_name: this.lastName,
            groups: this.groups,
            last_login: this.lastLogin,
            date_joined: this.dateJoined,
            is_staff: this.isStaff,
            is_superuser: this.isSuperuser,
            is_active: this.isActive,
            email_verification_required: this.isVerified,
        };
    }
}
