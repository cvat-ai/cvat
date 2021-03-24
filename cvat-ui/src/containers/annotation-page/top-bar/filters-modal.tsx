// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { connect } from 'react-redux';
import { CombinedState } from 'reducers/interfaces';
import FiltersModalComponent from 'components/annotation-page/top-bar/filters-modal';

interface StateToProps {
    visible: boolean;
}

const mapStateToProps = (state: CombinedState): StateToProps => {
    const {
        annotation: { filtersPanelVisible: visible },
    } = state;
    return { visible };
};

function FiltersModalContainer(props: StateToProps): JSX.Element {
    const { visible } = props;
    return <FiltersModalComponent visible={visible} />;
}

export default connect(mapStateToProps, null)(FiltersModalContainer);
