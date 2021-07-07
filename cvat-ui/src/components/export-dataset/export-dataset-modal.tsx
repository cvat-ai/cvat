// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React, { useState } from 'react';
import Modal from 'antd/lib/modal';
import { useSelector, useDispatch } from 'react-redux';
import { DownloadOutlined, LoadingOutlined } from '@ant-design/icons';
import Text from 'antd/lib/typography/Text';
import Select from 'antd/lib/select';
import Checkbox from 'antd/lib/checkbox';
import Input from 'antd/lib/input';

import { CombinedState } from 'reducers/interfaces';
import { exportActions, exportDatasetAsync } from 'actions/export-actions';
import getCore from 'cvat-core-wrapper';

const core = getCore();

export default function ExportDatasetModal(): JSX.Element {
    let instanceName = '';
    let activities: string[] = [];
    const dispatch = useDispatch();
    const [saveImages, setSaveImages] = useState(false);
    const [selectedFormat, setSelectedFormat] = useState<string>();
    const [customName, setCustomName] = useState<string>();
    const instance = useSelector((state: CombinedState) => state.export.instance);
    const modalVisible = useSelector((state: CombinedState) => state.export.modalVisible);
    const dumpers = useSelector((state: CombinedState) => state.formats.annotationFormats.dumpers);
    const {
        tasks: {
            datasets: taskExportActivities,
            annotation: taskDumpActivities,
        },
        projects: {
            datasets: projectExportActivities,
            annotation: projectDumpActivities,
        },
    } = useSelector((state: CombinedState) => state.export);

    if (instance instanceof core.classes.Project) {
        instanceName = 'project';
        activities = (saveImages ? projectExportActivities : projectDumpActivities)[instance.id];
    } else if (instance instanceof core.classes.Task) {
        instanceName = 'task';
        activities = (saveImages ? taskExportActivities : taskDumpActivities)[instance.id];
    }

    const handleExport = (): void => {
        dispatch(exportDatasetAsync(instance, selectedFormat, customName || '', saveImages));
        dispatch(exportActions.closeExportModal());
    };

    return (
        <Modal
            title={`Export ${instanceName} as a dataset`}
            visible={modalVisible}
            onCancel={() => dispatch(exportActions.closeExportModal())}
            onOk={handleExport}
        >
            <Select
                placeholder='Select dataset format'
                value={selectedFormat}
                onChange={(value) => setSelectedFormat(value)}
            >
                {dumpers
                    .sort((a: any, b: any) => a.name.localeCompare(b.name))
                    .filter((dumper: any): boolean => !(instance instanceof core.classes.Task &&
                        dumper.dimension !== instance.dimension))
                    .map(
                        (dumper: any): JSX.Element => {
                            const pending = (activities || []).includes(dumper.name);
                            const disabled = !dumper.enabled || pending;
                            return (
                                <Select.Option
                                    value={dumper.name}
                                    key={dumper.name}
                                    disabled={disabled}
                                >
                                    <DownloadOutlined />
                                    <Text disabled={disabled}>
                                        {dumper.name}
                                    </Text>
                                    {pending && <LoadingOutlined style={{ marginLeft: 10 }} />}
                                </Select.Option>
                            );
                        },
                    )}
            </Select>
            <Checkbox
                checked={saveImages}
                onChange={(e) => setSaveImages(e.target.checked)}
            >
                Save images
            </Checkbox>
            <Input
                placeholder='Custom name for dataset'
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
            />
        </Modal>
    );
}
