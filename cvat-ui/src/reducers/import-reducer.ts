// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import { ImportActions, ImportActionTypes } from 'actions/import-actions';
import getCore from 'cvat-core-wrapper';
import deepCopy from 'utils/deep-copy';

import { ImportState } from './interfaces';

const core = getCore();

const defaultState: ImportState = {
    projects: {},
    instance: null,
    modalVisible: false,
};

export default (state: ImportState = defaultState, action: ImportActions): ImportState => {
    switch
}