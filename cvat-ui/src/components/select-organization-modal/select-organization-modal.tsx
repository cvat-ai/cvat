// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Modal from 'antd/lib/modal';

import { useSelector, useDispatch, shallowEqual } from 'react-redux';
import { CombinedState } from 'reducers';

import { Organization } from 'cvat-core-wrapper';
import { organizationActions } from 'actions/organization-actions';
import OrganizationSelector from 'components/selectors/organization-selector';

function SelectOrganizationModal(): JSX.Element {
    const dispatch = useDispatch();
    const {
        visible,
        onSelectCallback,
    } = useSelector((state: CombinedState) => ({
        visible: state.organizations.selectModal.visible,
        onSelectCallback: state.organizations.selectModal.onSelectCallback,
    }), shallowEqual);

    return (
        <Modal
            title='Select an organization'
            open={visible}
            footer={null}
            onCancel={() => dispatch(organizationActions.closeSelectOrganizationModal())}
        >
            <OrganizationSelector
                setNewOrganization={(org: Organization | null) => {
                    if (onSelectCallback) {
                        onSelectCallback(org);
                    }
                    dispatch(organizationActions.closeSelectOrganizationModal());
                }}
            />
        </Modal>
    );
}

export default React.memo(SelectOrganizationModal);
