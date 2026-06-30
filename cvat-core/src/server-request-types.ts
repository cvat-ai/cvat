// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { SerializedApiToken, SerializedUser } from './server-response-types';
import { QualityRequirementAnnotationType } from './quality/server-response-types';
import { JobType } from './enums';
import { Camelized, CamelizedV2 } from './type-utils';

export interface APICommonFilterParams {
    page?: number;
    page_size?: number | 'all';
    filter?: string;
    sort?: string;
    org_id?: number;
    org?: string;
    search?: string;
}

export interface ProjectsFilter extends APICommonFilterParams {
    id?: number;
}

export type TasksFilter = ProjectsFilter & { ordering?: string; }; // TODO: Need to clarify how "ordering" is used
export type JobsFilter = ProjectsFilter & {
    task_id?: number;
    type?: JobType;
};

export interface APIApiTokensFilter extends APICommonFilterParams {
    id?: number;
    owner?: number;
    created_date?: string;
    updated_date?: string;
    expiry_date?: string;
    last_used_date?: string;
    read_only?: boolean;
    name?: string;
}
export type ApiTokensFilter = CamelizedV2<APIApiTokensFilter>;

export interface APIQualitySettingsFilter extends APICommonFilterParams {
    task_id?: number;
    project_id?: number;
    parent_type?: string;
}
export type QualitySettingsFilter = Camelized<APIQualitySettingsFilter>;

export interface APIQualityRequirementsFilter extends APICommonFilterParams {
    id?: number;
    settings_id?: number;
    task_id?: number;
    project_id?: number;
    annotation_type?: QualityRequirementAnnotationType;
    enabled?: boolean;
    created_date?: string;
    updated_date?: string;
}
export type QualityRequirementsFilter = CamelizedV2<APIQualityRequirementsFilter>;

export interface APIConsensusSettingsFilter extends APICommonFilterParams {
    task_id?: number;
}
export type ConsensusSettingsFilter = Camelized<APIConsensusSettingsFilter>;

export interface APIQualityConflictsFilter extends APICommonFilterParams {
    report_id?: number;
}
export type QualityConflictsFilter = Camelized<APIQualityConflictsFilter>;

export interface APIQualityReportsFilter extends APICommonFilterParams {
    parent_id?: number;
    peoject_id?: number;
    project_id?: number;
    task_id?: number;
    job_id?: number;
    target?: string;
}
export type QualityReportsFilter = Camelized<APIQualityReportsFilter>;

export interface APIAnalyticsEventsFilter {
    from?: string;
    to?: string;
    filename?: string;
    org_id?: number;
    user_id?: number;
    project_id?: number;
    task_id?: number;
    job_id?: number;
}
export type AnalyticsEventsFilter = CamelizedV2<APIAnalyticsEventsFilter>;

export type APIOrganizationMembersFilter = APICommonFilterParams;
export type OrganizationMembersFilter = Camelized<APIOrganizationMembersFilter>;

export type APIApiTokenModifiableFields = Partial<Pick<SerializedApiToken, 'name' | 'expiry_date' | 'read_only'>>;
export type ApiTokenModifiableFields = CamelizedV2<APIApiTokenModifiableFields>;

export type APIUserModifiableFields = Partial<Pick<SerializedUser, 'username' | 'first_name' | 'last_name'>>;
export type UserModifiableFields = CamelizedV2<APIUserModifiableFields>;
