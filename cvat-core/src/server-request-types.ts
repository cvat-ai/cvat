// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import {
    SerializedApiToken, SerializedUser, SerializedUserGrowthData,
} from './server-response-types';
import { Camelized, CamelizedV2 } from './type-utils';

export type APIApiTokenModifiableFields = Partial<Pick<SerializedApiToken, 'name' | 'expiry_date' | 'read_only'>>;
export type ApiTokenModifiableFields = CamelizedV2<APIApiTokenModifiableFields>;

export type APIUserModifiableFields = Partial<Pick<SerializedUser, 'username' | 'first_name' | 'last_name'>>;
export type UserModifiableFields = CamelizedV2<APIUserModifiableFields>;

export type APIUserGrowthDataModifiableFields = Partial<Pick<
    SerializedUserGrowthData,
    'github_prompt_shown' | 'github_prompt_support_clicked' | 'promotion_notifications_allowed'
>>;
export type UserGrowthDataModifiableFields = Camelized<APIUserGrowthDataModifiableFields>;
