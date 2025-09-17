// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { SerializedApiTokenData, SerializedUser } from './server-response-types';
import { CamelizedV2 } from './type-utils';

export type APIApiTokenSaveFields = Partial<Pick<SerializedApiTokenData, 'name' | 'expiry_date' | 'read_only'>>;
export type ApiTokenSaveFields = CamelizedV2<APIApiTokenSaveFields>;

export type APIUserSaveFields = Partial<Pick<SerializedUser, 'first_name' | 'last_name'>>;
export type UserSaveFields = CamelizedV2<APIUserSaveFields>;
