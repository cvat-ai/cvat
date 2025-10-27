// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { SerializedApiToken, SerializedUser } from './server-response-types';
import { CamelizedV2 } from './type-utils';

export type APIApiTokenModifiableFields = Partial<Pick<SerializedApiToken, 'name' | 'expiry_date' | 'read_only'>>;
export type ApiTokenModifiableFields = CamelizedV2<APIApiTokenModifiableFields>;

export type APIUserModifiableFields = Partial<Pick<SerializedUser, 'first_name' | 'last_name'>>;
export type UserModifiableFields = CamelizedV2<APIUserModifiableFields>;
