// Copyright (C) 2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
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
    const hintText = many ? '你可以上传一个或多个视频' :
        '你可以上传一个包含图像的压缩包、一个视频或多张图像';

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
                <p className='ant-upload-text'>点击或拖拽文件到此区域</p>
                <p className='ant-upload-hint'>{ hintText }</p>
            </Upload.Dragger>
            {files.length >= 5 && (
                <>
                    <br />
                    <Text className='cvat-text-color'>{`已选择 ${files.length} 个文件`}</Text>
                </>
            )}
        </>
    );
}
