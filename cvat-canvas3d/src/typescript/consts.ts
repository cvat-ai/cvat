// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

const BASE_GRID_WIDTH = 2;
const MOVEMENT_FACTOR = 200;
const DOLLY_FACTOR = 5;
const MAX_DISTANCE = 100;
const MIN_DISTANCE = 0.3;
const ZOOM_FACTOR = 7;
const ROTATION_HELPER_OFFSET = 0.1;
const CAMERA_REFERENCE = 'camRef';
const CUBOID_EDGE_NAME = 'edges';
const ROTATION_HELPER = 'rotationHelper';
const ROTATION_SPEED = 80;
const FOV_DEFAULT = 1;
const FOV_MAX = 2;
const FOV_MIN = 0;
const FOV_INC = 0.08;

export default {
    BASE_GRID_WIDTH,
    MOVEMENT_FACTOR,
    DOLLY_FACTOR,
    MAX_DISTANCE,
    MIN_DISTANCE,
    ZOOM_FACTOR,
    ROTATION_HELPER_OFFSET,
    CAMERA_REFERENCE,
    CUBOID_EDGE_NAME,
    ROTATION_HELPER,
    ROTATION_SPEED,
    FOV_DEFAULT,
    FOV_MAX,
    FOV_MIN,
    FOV_INC,
};
