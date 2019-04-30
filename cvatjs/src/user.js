/*
* Copyright (C) 2018 Intel Corporation
* SPDX-License-Identifier: MIT
*/

(() => {
    /**
        * Class representing a user
        * @memberof module:API.cvat.classes
        * @hideconstructor
    */
    class User {
        constructor(initialData) {
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
                    /**
                        * @name id
                        * @type {integer}
                        * @memberof module:API.cvat.classes.User
                        * @readonly
                        * @instance
                    */
                    get: () => data.id,
                    writable: false,
                },
                username: {
                    /**
                        * @name username
                        * @type {string}
                        * @memberof module:API.cvatclasses.User
                        * @readonly
                        * @instance
                    */
                    get: () => data.username,
                    writable: false,
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
                    writable: false,
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
                    writable: false,
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
                    writable: false,
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
                    writable: false,
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
                    writable: false,
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
                    writable: false,
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
                    writable: false,
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
                    writable: false,
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
                    writable: false,
                },
            });
        }
    }

    module.exports = User;
})();
