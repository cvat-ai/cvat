// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useEffect, useState } from 'react';
import Modal from 'antd/lib/modal';
import Text from 'antd/lib/typography/Text';
import InputNumber from 'antd/lib/input-number';
import Checkbox from 'antd/lib/checkbox';
import Collapse from 'antd/lib/collapse';
import { Source } from 'cvat-core-wrapper';

import CVATTooltip from 'components/common/cvat-tooltip';

export const SOURCE_OPTIONS: { value: Source; title: string }[] = [
    { value: Source.AUTO, title: 'Auto' },
    { value: Source.SEMI_AUTO, title: 'Semi-auto' },
    { value: Source.MANUAL, title: 'Manual' },
    { value: Source.FILE, title: 'File' },
    { value: Source.CONSENSUS, title: 'Consensus' },
];

export interface RemoveAnnotationsConfirmProps {
    open: boolean;
    stopFrame: number;
    onClose(): void;
    onRemove(
        from: number | undefined,
        to: number | undefined,
        removeOnlyKeyframes: boolean,
        sources: Source[] | undefined,
    ): void;
}

function RemoveAnnotationsConfirm(props: RemoveAnnotationsConfirmProps): JSX.Element {
    const {
        open,
        stopFrame,
        onClose,
        onRemove,
    } = props;
    const [removeFrom, setRemoveFrom] = useState<number | undefined>();
    const [removeUpTo, setRemoveUpTo] = useState<number | undefined>();
    const [removeOnlyKeyframes, setRemoveOnlyKeyframes] = useState(false);
    const [removeSources, setRemoveSources] = useState<Source[]>(SOURCE_OPTIONS.map((option) => option.value));

    useEffect(() => {
        if (open) {
            setRemoveFrom(undefined);
            setRemoveUpTo(undefined);
            setRemoveOnlyKeyframes(false);
            setRemoveSources(SOURCE_OPTIONS.map((option) => option.value));
        }
    }, [open]);

    return (
        <Modal
            destroyOnClose
            open={open}
            title='Remove Annotations'
            className='cvat-modal-confirm-remove-annotation'
            okButtonProps={{
                type: 'primary',
                danger: true,
                disabled: !removeSources.length,
            }}
            okText='Remove'
            onCancel={onClose}
            onOk={() => {
                const allSourcesSelected = removeSources.length === SOURCE_OPTIONS.length;
                onRemove(removeFrom, removeUpTo, removeOnlyKeyframes, allSourcesSelected ? undefined : removeSources);
                onClose();
            }}
        >
            <div>
                <Text>You are about to remove all annotations from every frame. </Text>
                <Text>If you want to remove them from certain frames only, select a range below. </Text>
                <Text>If you want to remove only annotations from a certain source, unselect sources below. </Text>
                <Text>Changes take effect only when you save the job.</Text>
                <br />
                <br />
                <br />
                <Checkbox.Group
                    className='cvat-modal-confirm-remove-annotation-sources'
                    value={removeSources}
                    onChange={(values) => setRemoveSources(values as Source[])}
                    options={SOURCE_OPTIONS.map(({ value, title }) => ({ value, label: title }))}
                />
                <br />
                <br />
                <Collapse
                    bordered={false}
                    items={[{
                        key: 1,
                        label: <Text>Select Range</Text>,
                        children: (
                            <>
                                <Text>From: </Text>
                                <InputNumber
                                    min={0}
                                    max={stopFrame}
                                    onChange={(value) => {
                                        setRemoveFrom(value ?? undefined);
                                    }}
                                />
                                <Text>  To: </Text>
                                <InputNumber
                                    min={0}
                                    max={stopFrame}
                                    onChange={(value) => {
                                        setRemoveUpTo(value ?? undefined);
                                    }}
                                />
                                <CVATTooltip title='Applicable only for annotations in range'>
                                    <br />
                                    <br />
                                    <Checkbox
                                        checked={removeOnlyKeyframes}
                                        onChange={(check) => {
                                            setRemoveOnlyKeyframes(check.target.checked);
                                        }}
                                    >
                                        Delete only keyframes for tracks
                                    </Checkbox>
                                </CVATTooltip>
                            </>
                        ),
                    }]}
                />
            </div>
        </Modal>
    );
}

export default React.memo(RemoveAnnotationsConfirm);
