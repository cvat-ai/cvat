/*
* Copyright (C) 2018 Intel Corporation
* SPDX-License-Identifier: MIT
*/

(() => {
    /**
        * Class representing a user
    */
    class User {
        constructor(initialData = {}) {
            this.id = null;
            this.username = null;
            this.email = null;
            this.firstName = null;
            this.lastName = null;
            this.groups = null;
            this.lastLogin = null;
            this.dateJoined = null;
            this.isStaff = null;
            this.isSuperuser = null;
            this.isActive = null;

            for (const property in this) {
                if (Object.prototype.hasOwnProperty.call(this, property)
                    && property in initialData) {
                    this[property] = initialData[property];
                }
            }
        }

        get id() {
            return this.id;
        }

        get username() {
            return this.username;
        }

        get email() {
            return this.email;
        }

        get firstName() {
            return this.firstName;
        }

        get lastName() {
            return this.lastName;
        }

        get groups() {
            return JSON.parse(JSON.stringify(this.groups));
        }

        get lastLogin() {
            return this.lastLogin;
        }

        get dateJoined() {
            return this.dateJoined;
        }

        get isStaff() {
            return this.isStaff;
        }

        get isSuperuser() {
            return this.isSuperuser;
        }

        get isActive() {
            return this.isActive;
        }
    }

    module.exports = User;
})();
