// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import {
    OrganizationMembersFilter,
    SerializedInvitationData, SerializedOrganization, SerializedOrganizationContact, SerializedUser,
} from './server-response-types';
import {
    checkFilter, checkObjectType, fieldsToSnakeCase, isEnum, isInteger, isString,
} from './common';
import config from './config';
import { MembershipRole } from './enums';
import { ArgumentError, DataError } from './exceptions';
import PluginRegistry from './plugins';
import serverProxy from './server-proxy';
import User from './user';

interface SerializedMembershipData {
    id: number;
    user: SerializedUser;
    is_active: boolean;
    joined_date: string;
    role: MembershipRole;
    invitation: SerializedInvitationData | null;
}

function validateName(name: unknown): void {
    checkObjectType('organization name', name, 'string');
}

function validateDescription(description: unknown): void {
    checkObjectType('organization description', description, 'string');
}

function validateContact(contact: unknown): void {
    checkObjectType('contact', contact, null, { cls: Object, name: 'Object' });
    for (const prop of Object.keys(contact)) {
        checkObjectType('organization contact', contact[prop], 'string');
    }
}

export default class Organization {
    public readonly id: number;
    public readonly slug: string;
    public readonly createdDate: string;
    public readonly updatedDate: string;
    public readonly owner: User;
    public readonly contact: SerializedOrganizationContact;
    public readonly name: string;
    public readonly description: string;

    constructor(initialData: SerializedOrganization) {
        const data: SerializedOrganization = {
            id: undefined,
            slug: undefined,
            name: undefined,
            description: undefined,
            created_date: undefined,
            updated_date: undefined,
            owner: undefined,
            contact: undefined,
        };

        for (const prop of Object.keys(data)) {
            if (prop in initialData) {
                data[prop] = initialData[prop];
            }
        }

        if (data.owner) data.owner = new User(data.owner);

        checkObjectType('slug', data.slug, 'string');
        if (typeof data.name !== 'undefined') {
            validateName(data.name);
        }

        if (typeof data.description !== 'undefined') {
            validateDescription(data.description);
        }

        if (typeof data.id !== 'undefined') {
            checkObjectType('id', data.id, 'number');
        }

        if (typeof data.contact !== 'undefined') {
            validateContact(data.contact);
        }

        if (typeof data.owner !== 'undefined' && data.owner !== null) {
            checkObjectType('owner', data.owner, null, { cls: User, name: 'User' });
        }

        Object.defineProperties(this, {
            id: {
                get: () => data.id,
            },
            slug: {
                get: () => data.slug,
            },
            name: {
                get: () => data.name,
            },
            description: {
                get: () => data.description,
            },
            contact: {
                get: () => ({ ...data.contact ?? {} }),
            },
            owner: {
                get: () => data.owner,
            },
            createdDate: {
                get: () => data.created_date,
            },
            updatedDate: {
                get: () => data.updated_date,
            },
        });
    }

    // Method updates organization data if it was created before, or creates a new organization
    public async save(
        fields: Partial<Pick<SerializedOrganization, 'name' | 'description' | 'contact'>> = {},
    ): Promise<Organization> {
        const result = await PluginRegistry.apiWrapper.call(this, Organization.prototype.save, fields);
        return result;
    }

    // Method returns paginatable list of organization members
    public async members(filter: OrganizationMembersFilter = { page: 1, pageSize: 10 }): Promise<Membership[]> {
        const result = await PluginRegistry.apiWrapper.call(
            this,
            Organization.prototype.members,
            {
                ...filter,
                org: this.slug,
            },
        );
        return result;
    }

    // Method removes the organization
    public async remove(): Promise<void> {
        const result = await PluginRegistry.apiWrapper.call(this, Organization.prototype.remove);
        return result;
    }

    // Method invites new members by email
    public async invite(email: string, role: MembershipRole): Promise<void> {
        const result = await PluginRegistry.apiWrapper.call(this, Organization.prototype.invite, email, role);
        return result;
    }

    // Method allows a user to get out from an organization
    // The difference between deleteMembership is that membershipId is unknown in this case
    public async leave(user: User): Promise<void> {
        const result = await PluginRegistry.apiWrapper.call(this, Organization.prototype.leave, user);
        return result;
    }

    // Method allows to change a membership role
    public async updateMembership(membershipId: number, role: MembershipRole): Promise<void> {
        const result = await PluginRegistry.apiWrapper.call(
            this,
            Organization.prototype.updateMembership,
            membershipId,
            role,
        );
        return result;
    }

    // Method allows to kick a user from an organization
    public async deleteMembership(membershipId: number): Promise<void> {
        const result = await PluginRegistry.apiWrapper.call(
            this,
            Organization.prototype.deleteMembership,
            membershipId,
        );
        return result;
    }

    public async resendInvitation(key: string): Promise<void> {
        const result = await PluginRegistry.apiWrapper.call(
            this,
            Organization.prototype.resendInvitation,
            key,
        );
        return result;
    }
}

export class Invitation {
    #createdDate: string;
    #owner: User | null;
    #key: string;
    #expired: boolean;
    #organization: number;
    #organizationInfo: Organization;

    constructor(initialData: SerializedInvitationData) {
        this.#createdDate = initialData.created_date;
        this.#owner = initialData.owner ? new User(initialData.owner) : null;
        this.#key = initialData.key;
        this.#expired = initialData.expired;
        this.#organization = initialData.organization;
        this.#organizationInfo = new Organization(initialData.organization_info);
    }

    get owner(): User | null {
        return this.#owner;
    }

    get createdDate(): string {
        return this.#createdDate;
    }

    get key(): string {
        return this.#key;
    }

    get expired(): boolean {
        return this.#expired;
    }

    get organization(): number | Organization {
        return this.#organization;
    }

    get organizationInfo(): Organization {
        return this.#organizationInfo;
    }
}

export class Membership {
    #id: number;
    #user: User;
    #isActive: boolean;
    #joinedDate: string;
    #role: MembershipRole;
    #invitation: Invitation | null;

    constructor(initialData: SerializedMembershipData) {
        this.#id = initialData.id;
        this.#user = new User(initialData.user);
        this.#isActive = initialData.is_active;
        this.#joinedDate = initialData.joined_date;
        this.#role = initialData.role;
        this.#invitation = initialData.invitation ? new Invitation(initialData.invitation) : null;
    }

    get id(): number {
        return this.#id;
    }

    get user(): User {
        return this.#user;
    }

    get isActive(): boolean {
        return this.#isActive;
    }
    get joinedDate(): string {
        return this.#joinedDate;
    }
    get role(): MembershipRole {
        return this.#role;
    }
    get invitation(): Invitation {
        return this.#invitation;
    }
}

Object.defineProperties(Organization.prototype.save, {
    implementation: {
        writable: false,
        enumerable: false,
        value: async function implementation(
            fields: Parameters<typeof Organization.prototype.save>[0],
        ) {
            if (typeof this.id === 'number') {
                const organizationData = {
                    ...('name' in fields ? { name: fields.name } : {}),
                    ...('description' in fields ? { description: fields.description } : {}),
                    ...('contact' in fields ? { contact: fields.contact } : {}),
                };

                if (Object.hasOwn(organizationData, 'name') && typeof organizationData.name !== 'string') {
                    validateName(organizationData.name);
                }

                if (
                    Object.hasOwn(organizationData, 'description') &&
                    typeof organizationData.description !== 'string'
                ) {
                    validateDescription(organizationData.description);
                }

                if (Object.hasOwn(organizationData, 'contact')) {
                    validateContact(organizationData.contact);
                }

                const result = await serverProxy.organizations.update(this.id, organizationData);
                return new Organization(result);
            }

            const organizationData = {
                slug: this.slug,
                name: this.name || this.slug,
                description: this.description,
                contact: this.contact,
            };

            const result = await serverProxy.organizations.create(organizationData);
            return new Organization(result);
        },
    },
});

Object.defineProperties(Organization.prototype.members, {
    implementation: {
        writable: false,
        enumerable: false,
        value: async function implementation(
            filter: Parameters<typeof Organization.prototype.members>[0],
        ) {
            checkFilter(filter, {
                org: isString,
                page: isInteger,
                pageSize: isInteger,
                search: isString,
                filter: isString,
                sort: isString,
            });

            const params = fieldsToSnakeCase(filter);
            const result = await serverProxy.organizations.members(params);

            const memberships = await Promise.all(result.results.map(async (rawMembership) => {
                const { invitation } = rawMembership;
                let rawInvitation = null;
                if (invitation) {
                    try {
                        const invitationData = await serverProxy.organizations.invitations({ key: invitation });
                        [rawInvitation] = invitationData.results;
                    // eslint-disable-next-line no-empty
                    } catch (e) {}
                }

                return new Membership({
                    ...rawMembership,
                    invitation: rawInvitation,
                });
            }));

            return Object.assign(memberships, { count: result.count });
        },
    },
});

Object.defineProperties(Organization.prototype.remove, {
    implementation: {
        writable: false,
        enumerable: false,
        value: async function implementation() {
            if (typeof this.id === 'number') {
                await serverProxy.organizations.delete(this.id);
                config.organization = {
                    organizationID: null,
                    organizationSlug: null,
                };
            }
        },
    },
});

Object.defineProperties(Organization.prototype.invite, {
    implementation: {
        writable: false,
        enumerable: false,
        value: async function implementation(email: string, role: MembershipRole) {
            checkObjectType('email', email, 'string');
            if (!isEnum.bind(MembershipRole)(role)) {
                throw new ArgumentError(`Role must be one of: ${Object.values(MembershipRole).toString()}`);
            }

            if (typeof this.id === 'number') {
                await serverProxy.organizations.invite(this.id, { email, role });
            }
        },
    },
});

Object.defineProperties(Organization.prototype.updateMembership, {
    implementation: {
        writable: false,
        enumerable: false,
        value: async function implementation(membershipId: number, role: MembershipRole) {
            checkObjectType('membershipId', membershipId, 'number');
            if (!isEnum.bind(MembershipRole)(role)) {
                throw new ArgumentError(`Role must be one of: ${Object.values(MembershipRole).toString()}`);
            }

            if (typeof this.id === 'number') {
                await serverProxy.organizations.updateMembership(membershipId, { role });
            }
        },
    },
});

Object.defineProperties(Organization.prototype.deleteMembership, {
    implementation: {
        writable: false,
        enumerable: false,
        value: async function implementation(membershipId: number) {
            checkObjectType('membershipId', membershipId, 'number');
            if (typeof this.id === 'number') {
                await serverProxy.organizations.deleteMembership(membershipId);
            }
        },
    },
});

Object.defineProperties(Organization.prototype.leave, {
    implementation: {
        writable: false,
        enumerable: false,
        value: async function implementation(user: User) {
            checkObjectType('user', user, null, { cls: User, name: 'User' });
            if (typeof this.id === 'number') {
                const result = await serverProxy.organizations.members({
                    page: 1,
                    pageSize: 10,
                    org: this.slug,
                    filter: JSON.stringify({
                        and: [{
                            '==': [{ var: 'user' }, user.username],
                        }],
                    }),
                });
                const [membership] = result.results;
                if (!membership) {
                    throw new DataError(
                        `Could not find membership for user ${user.username} in organization ${this.slug}`,
                    );
                }
                await serverProxy.organizations.deleteMembership(membership.id);
            }
        },
    },
});

Object.defineProperties(Organization.prototype.resendInvitation, {
    implementation: {
        writable: false,
        enumerable: false,
        value: async function implementation(key: string) {
            checkObjectType('key', key, 'string');
            if (typeof this.id === 'number') {
                await serverProxy.organizations.resendInvitation(key);
            }
        },
    },
});
