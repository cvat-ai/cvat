// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { checkObjectType, isEnum } from './common';
import config from './config';
import { MembershipRole } from './enums';
import { ArgumentError, ServerError } from './exceptions';
import PluginRegistry from './plugins';
import serverProxy from './server-proxy';
import User from './user';

interface RawOrganizationData {
    id?: number,
    slug?: string,
    name?: string,
    description?: string,
    created_date?: string,
    updated_date?: string,
    owner?: any,
    contact?: OrganizationContact,
}

interface OrganizationContact {
    email?: string;
    location?: string;
    phoneNumber?: string
}

interface Membership {
    user: User;
    is_active: boolean;
    joined_date: string;
    role: MembershipRole;
    invitation: {
        created_date: string;
        owner: User;
    } | null;
}

export default class Organization {
    public readonly id: number;
    public readonly slug: string;
    public readonly createdDate: string;
    public readonly updatedDate: string;
    public readonly owner: User;
    public contact: OrganizationContact;
    public name: string;
    public description: string;

    constructor(initialData: RawOrganizationData) {
        const data: RawOrganizationData = {
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
            checkObjectType('name', data.name, 'string');
        }

        if (typeof data.description !== 'undefined') {
            checkObjectType('description', data.description, 'string');
        }

        if (typeof data.id !== 'undefined') {
            checkObjectType('id', data.id, 'number');
        }

        if (typeof data.contact !== 'undefined') {
            checkObjectType('contact', data.contact, 'object');
            for (const prop in data.contact) {
                if (typeof data.contact[prop] !== 'string') {
                    throw new ArgumentError(
                        `Contact fields must be strings,tried to set ${typeof data.contact[prop]}`,
                    );
                }
            }
        }

        if (typeof data.owner !== 'undefined' && data.owner !== null) {
            checkObjectType('owner', data.owner, null, User);
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
                set: (name) => {
                    if (typeof name !== 'string') {
                        throw new ArgumentError(`Name property must be a string, tried to set ${typeof name}`);
                    }
                    data.name = name;
                },
            },
            description: {
                get: () => data.description,
                set: (description) => {
                    if (typeof description !== 'string') {
                        throw new ArgumentError(
                            `Description property must be a string, tried to set ${typeof description}`,
                        );
                    }
                    data.description = description;
                },
            },
            contact: {
                get: () => ({ ...data.contact }),
                set: (contact) => {
                    if (typeof contact !== 'object') {
                        throw new ArgumentError(`Contact property must be an object, tried to set ${typeof contact}`);
                    }
                    for (const prop in contact) {
                        if (typeof contact[prop] !== 'string') {
                            throw new ArgumentError(
                                `Contact fields must be strings, tried to set ${typeof contact[prop]}`,
                            );
                        }
                    }
                    data.contact = { ...contact };
                },
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
    public async save(): Promise<Organization> {
        const result = await PluginRegistry.apiWrapper.call(this, Organization.prototype.save);
        return result;
    }

    // Method returns paginatable list of organization members
    public async members(page = 1, page_size = 10): Promise<Membership[]> {
        const result = await PluginRegistry.apiWrapper.call(
            this,
            Organization.prototype.members,
            this.slug,
            page,
            page_size,
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
}

Object.defineProperties(Organization.prototype.save, {
    implementation: {
        writable: false,
        enumerable: false,
        value: async function implementation() {
            if (typeof this.id === 'number') {
                const organizationData = {
                    name: this.name || this.slug,
                    description: this.description,
                    contact: this.contact,
                };

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
        value: async function implementation(orgSlug: string, page: number, pageSize: number) {
            checkObjectType('orgSlug', orgSlug, 'string');
            checkObjectType('page', page, 'number');
            checkObjectType('pageSize', pageSize, 'number');

            const result = await serverProxy.organizations.members(orgSlug, page, pageSize);
            await Promise.all(
                result.results.map((membership) => {
                    const { invitation } = membership;
                    membership.user = new User(membership.user);
                    if (invitation) {
                        return serverProxy.organizations
                            .invitation(invitation)
                            .then((invitationData) => {
                                membership.invitation = invitationData;
                            })
                            .catch(() => {
                                membership.invitation = null;
                            });
                    }

                    return Promise.resolve();
                }),
            );

            result.results.count = result.count;
            return result.results;
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
                config.organizationID = null;
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
            checkObjectType('user', user, null, User);
            if (typeof this.id === 'number') {
                const result = await serverProxy.organizations.members(this.slug, 1, 10, {
                    filter: JSON.stringify({
                        and: [{
                            '==': [{ var: 'user' }, user.id],
                        }],
                    }),
                });
                const [membership] = result.results;
                if (!membership) {
                    throw new ServerError(
                        `Could not find membership for user ${user.username} in organization ${this.slug}`,
                    );
                }
                await serverProxy.organizations.deleteMembership(membership.id);
            }
        },
    },
});
