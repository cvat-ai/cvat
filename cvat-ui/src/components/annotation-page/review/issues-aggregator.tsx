// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React from 'react';

import CreateIssueDialog from './create-issue-dialog';
// import HiddenIssueLabel from './hidden-issue-label';
// import IssueDialog from './issue-dialog';

export default function IssueAggregatorComponent(): JSX.Element {
    return (
        <>
            <CreateIssueDialog />
            {/* <HiddenIssueLabel />
            <IssueDialog /> */}
        </>
    );
}
