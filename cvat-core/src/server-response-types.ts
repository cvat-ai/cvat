// Copyright (C) 2023-2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import {
    ChunkType,
    DimensionType, JobStage, JobState, JobType, ProjectStatus,
    ShapeType, StorageLocation, LabelType,
    ShareFileType, Source, TaskMode, TaskStatus,
    CloudStorageCredentialsType, CloudStorageProviderType, ObjectType,
} from './enums';
import { Camelized } from './type-utils';

export interface SerializedAnnotationImporter {
    name: string;
    ext: string;
    version: string;
    enabled: boolean;
    dimension: DimensionType;
}

export type SerializedAnnotationExporter = SerializedAnnotationImporter;

export interface SerializedAnnotationFormats {
    importers: SerializedAnnotationImporter[];
    exporters: SerializedAnnotationExporter[];
}

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

export interface SerializedUser {
    url: string;
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    email?: string;
    groups?: ('user' | 'business' | 'admin')[];
    is_staff?: boolean;
    is_superuser?: boolean;
    is_active?: boolean;
    last_login?: string;
    date_joined?: string;
    email_verification_required: boolean;
}

interface SerializedStorage {
    id: number;
    location: StorageLocation;
    cloud_storage_id: number | null;
}

export interface SerializedProject {
    assignee: SerializedUser | null;
    id: number;
    bug_tracker: string;
    created_date: string;
    updated_date: string;
    dimension: DimensionType;
    name: string;
    organization: number | null;
    guide_id: number | null;
    owner: SerializedUser;
    source_storage: SerializedStorage | null;
    target_storage: SerializedStorage | null;
    url: string;
    tasks: { count: number; url: string; };
    task_subsets: string[];
    status: ProjectStatus;
}

export type TasksFilter = ProjectsFilter & { ordering?: string; }; // TODO: Need to clarify how "ordering" is used
export type JobsFilter = ProjectsFilter & {
    task_id?: number;
    type?: JobType;
};

export interface SerializedTask {
    assignee: SerializedUser | null;
    bug_tracker: string;
    created_date: string;
    data: number;
    data_chunk_size: number | null;
    data_compressed_chunk_type: ChunkType
    data_original_chunk_type: ChunkType;
    dimension: DimensionType;
    id: number;
    image_quality: number;
    jobs: {
        count: number;
        completed: number;
        url: string;
        validation: number;
    };
    labels: { count: number; url: string; };
    mode: TaskMode | '';
    name: string;
    organization: number | null;
    overlap: number | null;
    owner: SerializedUser;
    project_id: number | null;
    guide_id: number | null;
    segment_size: number;
    size: number;
    source_storage: SerializedStorage | null;
    target_storage: SerializedStorage | null;
    status: TaskStatus;
    subset: string;
    updated_date: string;
    url: string;
}

export interface SerializedJob {
    assignee: SerializedUser | null;
    bug_tracker: string;
    data_chunk_size: number | null;
    data_compressed_chunk_type: ChunkType
    dimension: DimensionType;
    id: number;
    issues: { count: number; url: string };
    labels: { count: number; url: string };
    mode: TaskMode;
    project_id: number | null;
    guide_id: number | null;
    stage: JobStage;
    state: JobState;
    type: JobType;
    frame_count: number;
    start_frame: number;
    stop_frame: number;
    task_id: number;
    updated_date: string;
    created_date: string;
    url: string;
    source_storage: SerializedStorage | null;
    target_storage: SerializedStorage | null;
}

export type AttrInputType = 'select' | 'radio' | 'checkbox' | 'number' | 'text';
export interface SerializedAttribute {
    name: string;
    mutable: boolean;
    input_type: AttrInputType;
    default_value: string;
    values: string[];
    id?: number;
}

export interface SerializedLabel {
    id?: number;
    name: string;
    color?: string;
    type: LabelType;
    svg?: string;
    sublabels?: SerializedLabel[];
    has_parent?: boolean;
    attributes: SerializedAttribute[];
}

export interface SerializedAbout {
    description: string;
    name: string;
    version: string;
}

export interface SerializedRemoteFile {
    name: string;
    type: ShareFileType;
    mime_type: string;
}

export interface SerializedUserAgreement {
    name: string;
    required: boolean;
    textPrefix: string;
    url: string;
    urlDisplayText: string;
    value: boolean;
}

export interface SerializedRegister {
    email: string;
    email_verification_required: boolean;
    first_name: string;
    last_name: string;
    username: string;
}

export interface SerializedGuide {
    id?: number;
    task_id: number | null;
    project_id: number | null;
    owner: SerializedUser;
    created_date: string;
    updated_date: string;
    markdown: string;
}

export interface SerializedAsset {
    uuid?: string;
    guide?: number;
    filename: string;
    created_date: string;
    owner: SerializedUser;
}

export interface SerializedOrganizationContact {
    email?: string;
    location?: string;
    phoneNumber?: string
}

export interface SerializedOrganization {
    id?: number,
    slug?: string,
    name?: string,
    description?: string,
    created_date?: string,
    updated_date?: string,
    owner?: any,
    contact?: SerializedOrganizationContact,
}

export interface APIQualitySettingsFilter extends APICommonFilterParams {
    task_id?: number;
}
export type QualitySettingsFilter = Camelized<APIQualitySettingsFilter>;

export interface SerializedQualitySettingsData {
    id?: number;
    task?: number;
    iou_threshold?: number;
    oks_sigma?: number;
    line_thickness?: number;
    low_overlap_threshold?: number;
    compare_line_orientation?: boolean;
    line_orientation_threshold?: number;
    compare_groups?: boolean;
    group_match_threshold?: number;
    check_covered_annotations?: boolean;
    object_visibility_threshold?: number;
    panoptic_comparison?: boolean;
    compare_attributes?: boolean;
}

export interface APIQualityConflictsFilter extends APICommonFilterParams {
    report_id?: number;
}
export type QualityConflictsFilter = Camelized<APIQualityConflictsFilter>;

export interface SerializedAnnotationConflictData {
    job_id?: number;
    obj_id?: number;
    type?: ObjectType;
    shape_type?: string | null;
    conflict_type?: string;
    severity?: string;
}

export interface SerializedQualityConflictData {
    id?: number;
    frame?: number;
    type?: string;
    annotation_ids?: SerializedAnnotationConflictData[];
    data?: string;
    severity?: string;
    description?: string;
}

export interface APIQualityReportsFilter extends APICommonFilterParams {
    parent_id?: number;
    peoject_id?: number;
    task_id?: number;
    job_id?: number;
    target?: string;
}
export type QualityReportsFilter = Camelized<APIQualityReportsFilter>;

export interface SerializedQualityReportData {
    id?: number;
    parent_id?: number;
    task_id?: number;
    job_id?: number;
    target: string;
    created_date?: string;
    gt_last_updated?: string;
    summary?: {
        frame_count: number;
        frame_share: number;
        conflict_count: number;
        valid_count: number;
        ds_count: number;
        gt_count: number;
        total_count: number;
        error_count: number;
        warning_count: number;
        conflicts_by_type: {
            extra_annotation: number;
            missing_annotation: number;
            mismatching_label: number;
            low_overlap: number;
            mismatching_direction: number;
            mismatching_attributes: number;
            mismatching_groups: number;
            covered_annotation: number;
        }
    };
}

export interface SerializedDataEntry {
    date?: string;
    value?: number | Record<string, number>
}

export interface SerializedTransformBinaryOp {
    left: string;
    operator: string;
    right: string;
}

export interface SerializedTransformationEntry {
    name: string;
    binary?: SerializedTransformBinaryOp;
}

export interface SerializedAnalyticsEntry {
    name?: string;
    title?: string;
    description?: string;
    granularity?: string;
    default_view?: string;
    data_series?: Record<string, SerializedDataEntry[]>;
    transformations?: SerializedTransformationEntry[];
}

export interface APIAnalyticsReportFilter {
    project_id?: number;
    task_id?: number;
    job_id?: number;
    start_date?: string;
    end_date?: string;
}
export type AnalyticsReportFilter = Camelized<APIAnalyticsReportFilter>;

export interface SerializedAnalyticsReport {
    job_id?: number;
    task_id?: number;
    project_id?: number;
    target?: string;
    created_date?: string;
    statistics?: SerializedAnalyticsEntry[];
}

export interface SerializedInvitationData {
    created_date: string;
    key: string;
    owner: SerializedUser;
    expired: boolean;
    organization: number;
    organization_info: SerializedOrganization;
}

export interface SerializedShape {
    id?: number;
    clientID?: number;
    label_id: number;
    group: number;
    frame: number;
    source: Source;
    attributes: { spec_id: number; value: string }[];
    elements: Omit<SerializedShape, 'elements'>[];
    occluded: boolean;
    outside: boolean;
    points?: number[];
    rotation: number;
    z_order: number;
    type: ShapeType;
}

export interface SerializedTrack {
    id?: number;
    clientID?: number;
    label_id: number;
    group: number;
    frame: number;
    source: Source;
    attributes: { spec_id: number; value: string }[];
    shapes: {
        attributes: SerializedTrack['attributes'];
        id?: number;
        points?: number[];
        frame: number;
        occluded: boolean;
        outside: boolean;
        rotation: number;
        type: ShapeType;
        z_order: number;
    }[];
    elements: Omit<SerializedTrack, 'elements'>[];
}

export interface SerializedTag {
    id?: number;
    clientID?: number;
    label_id: number;
    frame: number;
    group: number;
    source: Source;
    attributes: { spec_id: number; value: string }[];
}

export interface SerializedCollection {
    tags: SerializedTag[];
    shapes: SerializedShape[];
    tracks: SerializedTrack[];
    version: number;
}

export interface SerializedCloudStorage {
    id?: number;
    display_name?: string;
    description?: string;
    credentials_type?: CloudStorageCredentialsType;
    provider_type?: CloudStorageProviderType;
    resource?: string;
    account_name?: string;
    key?: string;
    secret_key?: string;
    session_token?: string;
    key_file?: File;
    connection_string?: string;
    specific_attributes?: string;
    owner?: any;
    created_date?: string;
    updated_date?: string;
    manifest_path?: string;
    manifests?: string[];
}

export interface SerializedFramesMetaData {
    chunk_size: number;
    deleted_frames: number[];
    included_frames: number[];
    frame_filter: string;
    frames: {
        width: number;
        height: number;
        name: string;
        related_files: number;
    }[];
    image_quality: number;
    size: number;
    start_frame: number;
    stop_frame: number;
}

export interface SerializedAPISchema {
    openapi: string;
    info: {
        version: string;
        description: string;
        termsOfService: string;
        contact: {
            name: string;
            url: string;
            email: string;
        };
        license: {
            name: string;
            url: string;
        }
    };
    paths: {
        [path: string]: any;
    };
    components: {
        schemas: {
            [component: string]: any;
        }
    }
    externalDocs: {
        description: string;
        url: string;
    };
}
