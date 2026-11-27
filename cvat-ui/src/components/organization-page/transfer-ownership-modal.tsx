// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback, useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import Modal from 'antd/lib/modal';
import Form from 'antd/lib/form';
import Select from 'antd/lib/select';
import Input from 'antd/lib/input';
import Paragraph from 'antd/lib/typography/Paragraph';
import Text from 'antd/lib/typography/Text';
import notification from 'antd/lib/notification';

import { transferOrganizationOwnershipAsync } from 'actions/organization-actions';
import { CombinedState } from 'reducers';
import { Membership, MembershipRole, Organization } from 'cvat-core-wrapper';
import { useIsMounted, usePlugins } from 'utils/hooks';
import { ThunkDispatch } from 'utils/redux';

interface Props {
    organization: Organization;
    onClose: () => void;
}

// the server caps page_size at this value (REST_FRAMEWORK_MAX_PAGE_SIZE)
const MAX_PAGE_SIZE = 500;

function TransferOwnershipModalExtras({ targetProps }: {
    targetProps: { organization: Organization; newOwnerID?: number };
}): JSX.Element {
    // the component is used as a plugin entrypoint
    const extras = usePlugins(
        (state: CombinedState) => state.plugins.components.organizationPage.transferOwnershipModal.extras,
        targetProps,
    );

    return (
        <>
            {extras.sort((left, right) => left.weight - right.weight).map(({
                component: Component,
            }, index) => (
                <Component key={index} targetProps={targetProps} />
            ))}
        </>
    );
}

function TransferOwnershipModal(props: Readonly<Props>): JSX.Element {
    const { organization, onClose } = props;
    const dispatch = useDispatch<ThunkDispatch>();
    const isMounted = useIsMounted();
    const [maintainers, setMaintainers] = useState<Membership[]>([]);
    const [fetchingMaintainers, setFetchingMaintainers] = useState(true);
    const [newOwnerID, setNewOwnerID] = useState<number>();
    const [confirmation, setConfirmation] = useState('');
    const [transferring, setTransferring] = useState(false);

    useEffect(() => {
        organization.members({
            filter: JSON.stringify({ and: [{ '==': [{ var: 'role' }, MembershipRole.MAINTAINER] }] }),
            page: 1,
            pageSize: MAX_PAGE_SIZE,
        }).then((members) => {
            if (isMounted()) {
                setMaintainers(members.filter((member) => member.isActive));
            }
        }).catch((error: unknown) => {
            notification.error({
                message: 'Could not fetch the organization maintainers',
                description: error instanceof Error ? error.message : String(error),
                className: 'cvat-notification-notice-fetch-organization-maintainers-failed',
            });
        }).finally(() => {
            if (isMounted()) {
                setFetchingMaintainers(false);
            }
        });
    }, [organization]);

    const onTransfer = useCallback(async (): Promise<void> => {
        setTransferring(true);
        // on success the organization is reactivated and the page unmounts this modal,
        // on failure an error notification is shown and the modal stays open
        await dispatch(transferOrganizationOwnershipAsync(organization, newOwnerID!));
        if (isMounted()) {
            setTransferring(false);
        }
    }, [organization, newOwnerID]);

    return (
        <Modal
            className='cvat-organization-transfer-ownership-modal'
            title={`Transfer ownership of "${organization.slug}"`}
            open
            destroyOnClose
            onCancel={onClose}
            onOk={onTransfer}
            okText='Transfer ownership'
            okButtonProps={{
                danger: true,
                loading: transferring,
                disabled: newOwnerID === undefined || confirmation !== organization.slug,
            }}
        >
            <Paragraph>
                The new owner gets full control of the organization, and you become a maintainer.
                The transfer takes effect immediately; only the new owner can transfer it back.
            </Paragraph>
            <Form layout='vertical'>
                <Form.Item
                    label='New owner'
                    extra={(
                        <>
                            Only active maintainers are listed.
                            To choose someone else, first change their role to Maintainer.
                        </>
                    )}
                >
                    <Select
                        className='cvat-organization-transfer-ownership-new-owner'
                        showSearch
                        optionFilterProp='label'
                        placeholder='Select a maintainer'
                        loading={fetchingMaintainers}
                        value={newOwnerID}
                        onChange={setNewOwnerID}
                        options={maintainers.map(({ user }) => ({
                            value: user.id,
                            label: user.username,
                        }))}
                    />
                </Form.Item>
                <TransferOwnershipModalExtras targetProps={{ organization, newOwnerID }} />
                <Form.Item
                    label={(
                        <Text>
                            To confirm, enter the organization short name:
                            {' '}
                            <Text strong>{organization.slug}</Text>
                        </Text>
                    )}
                >
                    <Input
                        className='cvat-organization-transfer-ownership-confirmation'
                        placeholder={organization.slug}
                        value={confirmation}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                            setConfirmation(event.target.value);
                        }}
                    />
                </Form.Item>
            </Form>
        </Modal>
    );
}

export default React.memo(TransferOwnershipModal);
