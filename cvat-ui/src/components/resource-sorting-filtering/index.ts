// Copyright (C) 2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import SortingComponent from './sorting';
import ResourceFilterHOC from './filtering';

const defaultVisibility = {
    predefined: false,
    recent: false,
    builder: false,
    sorting: false,
};

export {
    SortingComponent,
    ResourceFilterHOC,
    defaultVisibility,
};
