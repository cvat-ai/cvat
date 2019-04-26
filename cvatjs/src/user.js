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
                first_name: null,
                last_name: null,
                groups: null,
                last_login: null,
                date_joined: null,
                is_staff: null,
                is_superuser: null,
                is_active: null,
            };

            for (const property in data) {
                if (Object.prototype.hasOwnProperty.call(data, property)
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
                    get: () => data.first_name,
                },
                lastName: {
                    get: () => data.last_name,
                },
                groups: {
                    get: () => JSON.parse(JSON.stringify(data.groups)),
                },
                lastLogin: {
                    get: () => data.last_login,
                },
                dateJoined: {
                    get: () => data.date_joined,
                },
                isStaff: {
                    get: () => data.is_staff,
                },
                isSuperuser: {
                    get: () => data.is_superuser,
                },
                isActive: {
                    get: () => data.is_active,
                },
            });
        }

        toString() {
            return `${this.username}: ${this.email}`;
        }
    }

    module.exports = User;
})();
