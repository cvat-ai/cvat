// Copyright (C) 2019-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

const UNDEFINED_ATTRIBUTE_VALUE = '__undefined__';
const NO_BREAK_SPACE = '\u00a0';
const CHANGELOG_URL = 'https://github.com/openvinotoolkit/cvat/blob/develop/CHANGELOG.md';
const LICENSE_URL = 'https://github.com/openvinotoolkit/cvat/blob/develop/LICENSE';
const GITTER_URL = 'https://gitter.im/opencv-cvat';
const GITTER_PUBLIC_URL = 'https://gitter.im/opencv-cvat/public';
const FORUM_URL = 'https://software.intel.com/en-us/forums/intel-distribution-of-openvino-toolkit';
const GITHUB_URL = 'https://github.com/openvinotoolkit/cvat';
const GITHUB_IMAGE_URL = 'https://github.com/openvinotoolkit/cvat/raw/develop/site/content/en/images/cvat.jpg';
const GUIDE_URL = 'https://openvinotoolkit.github.io/cvat/docs';
const SHARE_MOUNT_GUIDE_URL =
    'https://openvinotoolkit.github.io/cvat/docs/administration/basics/installation/#share-path';
const NUCLIO_GUIDE =
    'https://openvinotoolkit.github.io/cvat//docs/administration/advanced/installation_automatic_annotation/';
const CANVAS_BACKGROUND_COLORS = ['#ffffff', '#f1f1f1', '#e5e5e5', '#d8d8d8', '#CCCCCC', '#B3B3B3', '#999999'];
const NEW_LABEL_COLOR = '#b3b3b3';
const LATEST_COMMENTS_SHOWN_QUICK_ISSUE = 3;
const QUICK_ISSUE_INCORRECT_POSITION_TEXT = 'Wrong position';
const QUICK_ISSUE_INCORRECT_ATTRIBUTE_TEXT = 'Wrong attribute';
const DEFAULT_PROJECT_SUBSETS = ['Train', 'Test', 'Validation'];
const INTEL_TERMS_OF_USE_URL = 'https://www.intel.com/content/www/us/en/legal/terms-of-use.html';
const INTEL_COOKIES_URL = 'https://www.intel.com/content/www/us/en/privacy/intel-cookie-notice.html';
const INTEL_PRIVACY_URL = 'https://www.intel.com/content/www/us/en/privacy/intel-privacy-notice.html';
const OPENVINO_URL = 'https://docs.openvino.ai/latest/index.html';
const DEFAULT_AWS_S3_REGIONS: string[][] = [
    ['us-east-1', 'US East (N. Virginia)'],
    ['us-east-2', 'US East (Ohio)'],
    ['us-west-1', 'US West (N. California)'],
    ['us-west-2', 'US West (Oregon)'],
    ['ap-south-1', 'Asia Pacific (Mumbai)'],
    ['ap-northeast-1', 'Asia Pacific (Tokyo)'],
    ['ap-northeast-2', 'Asia Pacific (Seoul)'],
    ['ap-northeast-3', 'Asia Pacific (Osaka)'],
    ['ap-southeast-1', 'Asia Pacific (Singapore)'],
    ['ap-southeast-2', 'Asia Pacific (Sydney)'],
    ['ca-central-1', 'Canada (Central)'],
    ['eu-central-1', 'EU (Frankfurt)'],
    ['eu-west-1', 'Europe (Ireland)'],
    ['eu-west-2', 'Europe (London)'],
    ['eu-west-3', 'Europe (Paris)'],
    ['eu-north-1', 'Europe (Stockholm)'],
    ['sa-east-1', 'South America (São Paulo)'],
];

const DEFAULT_GOOGLE_CLOUD_STORAGE_LOCATIONS: string[][] = [
    ['NORTHAMERICA-NORTHEAST1', 'Montréal'],
    ['NORTHAMERICA-NORTHEAST2', 'Toronto'],
    ['US-CENTRAL1', 'Iowa'],
    ['US-EAST1', 'South Carolina'],
    ['US-EAST4', 'Northern Virginia'],
    ['US-WEST1', 'Oregon'],
    ['US-WEST2', 'Los Angeles'],
    ['US-WEST3', 'Salt Lake City'],
    ['US-WEST4', 'Las Vegas'],
    ['SOUTHAMERICA-EAST1', 'São Paulo'],
    ['EUROPE-CENTRAL2', 'Warsaw'],
    ['EUROPE-NORTH1', 'Finland'],
    ['EUROPE-WEST1', 'Belgium'],
    ['EUROPE-WEST2', 'London'],
    ['EUROPE-WEST3', 'Frankfurt'],
    ['EUROPE-WEST4', 'Netherlands'],
    ['EUROPE-WEST6', 'Zürich'],
    ['ASIA-EAST1', 'Taiwan'],
    ['ASIA-EAST2', 'Hong Kong'],
    ['ASIA-NORTHEAST1', 'Tokyo'],
    ['ASIA-NORTHEAST2', 'Osaka'],
    ['ASIA-NORTHEAST3', 'Seoul'],
    ['ASIA-SOUTH1', 'Mumbai'],
    ['ASIA-SOUTH2', 'Delhi'],
    ['ASIA-SOUTHEAST1', 'Singapore'],
    ['ASIA-SOUTHEAST2', 'Jakarta'],
    ['AUSTRALIA-SOUTHEAST1', 'Sydney'],
    ['AUSTRALIA-SOUTHEAST2', 'Melbourne'],
    // Multi-regions
    ['ASIA', 'Data centers in Asia'],
    ['EU', 'Data centers within member states of the European Union'],
    ['US', 'Data centers in the United States'],
    // Dual-regions
    ['ASIA1', 'ASIA-NORTHEAST1 and ASIA-NORTHEAST2'],
    ['EUR4', 'EUROPE-NORTH1 and EUROPE-WEST4'],
    ['NAM4', 'US-CENTRAL1 and US-EAST1'],
];

export default {
    UNDEFINED_ATTRIBUTE_VALUE,
    NO_BREAK_SPACE,
    CHANGELOG_URL,
    LICENSE_URL,
    GITTER_URL,
    GITTER_PUBLIC_URL,
    FORUM_URL,
    GITHUB_URL,
    GITHUB_IMAGE_URL,
    GUIDE_URL,
    SHARE_MOUNT_GUIDE_URL,
    CANVAS_BACKGROUND_COLORS,
    NEW_LABEL_COLOR,
    NUCLIO_GUIDE,
    LATEST_COMMENTS_SHOWN_QUICK_ISSUE,
    QUICK_ISSUE_INCORRECT_POSITION_TEXT,
    QUICK_ISSUE_INCORRECT_ATTRIBUTE_TEXT,
    DEFAULT_PROJECT_SUBSETS,
    INTEL_TERMS_OF_USE_URL,
    INTEL_COOKIES_URL,
    INTEL_PRIVACY_URL,
    OPENVINO_URL,
    DEFAULT_AWS_S3_REGIONS,
    DEFAULT_GOOGLE_CLOUD_STORAGE_LOCATIONS,
};
