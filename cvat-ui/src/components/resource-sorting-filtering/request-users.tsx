// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { User, getCore } from 'cvat-core-wrapper';

const core = getCore();

const asyncFetchUsers = async (search: string | null): Promise<{
    values: [{ value: string; title: string; }];
    hasMore: boolean;
}> => {
    const users = await core.users.get({
        limit: 10,
        is_active: true,
        ...(search ? { search } : {}),
    });

    return {
        values: users.map((user: User) => ({
            value: user.username, title: user.username,
        })),
        hasMore: false,
    };
};

export default asyncFetchUsers;
