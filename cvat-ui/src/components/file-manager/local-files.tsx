// Copyright (C) 2022 Intel Corporation
//
// SPDX-License-Identifier: MIT
import React, { useMemo } from 'react';

import Text from 'antd/lib/typography/Text';
import Alert from 'antd/lib/alert';
import Upload, { RcFile } from 'antd/lib/upload';
import { InboxOutlined } from '@ant-design/icons';

interface Props {
    files: File[];
    onUpload: (_: RcFile, uploadedFiles: RcFile[]) => boolean;
}

const getFileMediaType = (file: File): string => file.type.split('/')[0];

export default function LocalFiles(props: Props): JSX.Element {
    const { files: defaultFiles, onUpload } = props;

    const typeFirstFile: string = useMemo(() => (defaultFiles?.[0] && getFileMediaType(defaultFiles[0])) || 'image', [defaultFiles]);
    const isAllFileSomeType = useMemo(() => defaultFiles
        .every((file) => getFileMediaType(file) === typeFirstFile), [defaultFiles]);

    const files = useMemo(() => defaultFiles.map((file) => {
        const typeFile = file.type.split('/')[0];
        (file as RcFile & { status: any }).status = typeFirstFile === typeFile ? undefined : 'error';
        (file as RcFile & { response: any }).response = typeFirstFile === typeFile ? undefined : 'File type doesn`t match with other files';
        return file;
    }), [defaultFiles]);

    return (
        <>
            <Upload.Dragger
                multiple
                listType='text'
                fileList={files as any[]}
                showUploadList={
                    files.length < 5 && {
                        showRemoveIcon: !isAllFileSomeType,
                    }
                }
                beforeUpload={onUpload}
            >
                <p className='ant-upload-drag-icon'>
                    <InboxOutlined />
                </p>
                <p className='ant-upload-text'>Click or drag files to this area</p>
                <p className='ant-upload-hint'>Support for a bulk images or a single video</p>
            </Upload.Dragger>
            {files.length >= 5 && (
                <>
                    <br />
                    <Text className='cvat-text-color'>{`${files.length} files selected`}</Text>
                </>
            )}
            {!isAllFileSomeType ? (
                <Alert
                    className='cvat-file-manager-local-alert'
                    type='error'
                    message={'We can\'t process it. Files of the same media type must be uploaded'}
                    showIcon
                />
            ) : null}
        </>
    );
}
