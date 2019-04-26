/*
* Copyright (C) 2018 Intel Corporation
* SPDX-License-Identifier: MIT
*/

(() => {
    /**
        * Class representing a user
        * @memberof module:API.cvat.classes
    */
    class User {
        constructor(initialData = {}) {
            const data = {
                id: null,
                username: null,
                email: null,
                firstName: null,
                lastName: null,
                groups: null,
                lastLogin: null,
                dateJoined: null,
                isStaff: null,
                isSuperuser: null,
                isActive: null,
            };

            for (const property in this) {
                if (Object.prototype.hasOwnProperty.call(this, property)
                    && property in initialData) {
                    data[property] = initialData[property];
                }
            }

            Object.defineProperties(this, {
                id: {
                    get: () => data.id,
                },
                username: {
                    get: () => data.username,
                },
                email: {
                    get: () => data.email,
                },
                firstName: {
                    get: () => data.firstName,
                },
                lastName: {
                    get: () => data.lastName,
                },
                groups: {
                    get: () => JSON.parse(JSON.stringify(data.groups)),
                },
                lastLogin: {
                    get: () => data.lastLogin,
                },
                dateJoined: {
                    get: () => data.dateJoined,
                },
                isStaff: {
                    get: () => data.isStaff,
                },
                isSuperuser: {
                    get: () => data.isSuperuser,
                },
                isActive: {
                    get: () => data.isActive,
                },
            });
        }
    }

    module.exports = User;
})();
