// Copyright (C) 2022 Intel Corporation
//
// SPDX-License-Identifier: MIT
import React from 'react';

import Text from 'antd/lib/typography/Text';
import Upload, { RcFile } from 'antd/lib/upload';
import { InboxOutlined } from '@ant-design/icons';

interface Props {
    files: File[];
    many: boolean;
    onUpload: (_: RcFile, uploadedFiles: RcFile[]) => boolean;
}

export default function LocalFiles(props: Props): JSX.Element {
    const { files, onUpload, many } = props;
    const hintText = many ? 'Support for a bulk videos' : 'Support for a bulk images or a single video';

    return (
        <>
            <Upload.Dragger
                multiple
                listType='text'
                fileList={files as any[]}
                showUploadList={
                    files.length < 5 && {
                        showRemoveIcon: false,
                    }
                }
                beforeUpload={onUpload}
            >
                <p className='ant-upload-drag-icon'>
                    <InboxOutlined />
                </p>
                <p className='ant-upload-text'>Click or drag files to this area</p>
                <p className='ant-upload-hint'>{ hintText }</p>
            </Upload.Dragger>
            {files.length >= 5 && (
                <>
                    <br />
                    <Text className='cvat-text-color'>{`${files.length} files selected`}</Text>
                </>
            )}
        </>
    );
}
