// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { Row, Col } from 'antd/lib/grid';
import Icon from 'antd/lib/icon';
import Alert from 'antd/lib/alert';
import Button from 'antd/lib/button';
import Tooltip from 'antd/lib/tooltip';
import message from 'antd/lib/message';
import notification from 'antd/lib/notification';
import Text from 'antd/lib/typography/Text';

import consts from 'consts';
import ConnectedFileManager, {
    FileManagerContainer,
} from 'containers/file-manager/file-manager';
import { ModelFiles } from 'reducers/interfaces';

import CreateModelForm, {
    CreateModelForm as WrappedCreateModelForm,
} from './create-model-form';

interface Props {
    createModel(name: string, files: ModelFiles, global: boolean): void;
    isAdmin: boolean;
    modelCreatingStatus: string;
}

export default class CreateModelContent extends React.PureComponent<Props> {
    private modelForm: WrappedCreateModelForm;
    private fileManagerContainer: FileManagerContainer;

    public constructor(props: Props) {
        super(props);
        this.modelForm = null as any as WrappedCreateModelForm;
        this.fileManagerContainer = null as any as FileManagerContainer;
    }

    public componentDidUpdate(prevProps: Props): void {
        const { modelCreatingStatus } = this.props;

        if (prevProps.modelCreatingStatus !== 'CREATED'
            && modelCreatingStatus === 'CREATED') {
            message.success('The model has been uploaded');
            this.modelForm.resetFields();
            this.fileManagerContainer.reset();
        }
    }

    private handleSubmitClick = (): void => {
        const { createModel } = this.props;
        this.modelForm.submit()
            .then((data) => {
                const {
                    local,
                    share,
                } = this.fileManagerContainer.getFiles();

                const files = local.length ? local : share;
                const grouppedFiles: ModelFiles = {
                    xml: '',
                    bin: '',
                    py: '',
                    json: '',
                };

                (files as any).reduce((acc: ModelFiles, value: File | string): ModelFiles => {
                    const name = typeof value === 'string' ? value : value.name;
                    const [extension] = name.split('.').reverse();
                    if (extension in acc) {
                        acc[extension] = value;
                    }

                    return acc;
                }, grouppedFiles);

                if (Object.keys(grouppedFiles)
                    .map((key: string) => grouppedFiles[key])
                    .filter((val) => !!val).length !== 4) {
                    notification.error({
                        message: 'Could not upload a model',
                        description: 'Please, specify correct files',
                    });
                } else {
                    createModel(data.name, grouppedFiles, data.global);
                }
            }).catch(() => {
                notification.error({
                    message: 'Could not upload a model',
                    description: 'Please, check input fields',
                });
            });
    };

    public render(): JSX.Element {
        const {
            modelCreatingStatus,
        } = this.props;
        const loading = !!modelCreatingStatus
            && modelCreatingStatus !== 'CREATED';
        const status = modelCreatingStatus
            && modelCreatingStatus !== 'CREATED' ? modelCreatingStatus : '';

        const { AUTO_ANNOTATION_GUIDE_URL } = consts;
        return (
            <Row type='flex' justify='start' align='middle' className='cvat-create-model-content'>
                <Col span={24}>
                    <Tooltip title='Click to open guide'>
                        <Icon
                            onClick={(): void => {
                                // false positive
                                // eslint-disable-next-line
                                window.open(AUTO_ANNOTATION_GUIDE_URL, '_blank');
                            }}
                            type='question-circle'
                        />
                    </Tooltip>
                </Col>
                <Col span={24}>
                    <CreateModelForm
                        wrappedComponentRef={
                            (ref: WrappedCreateModelForm): void => {
                                this.modelForm = ref;
                            }
                        }
                    />
                </Col>
                <Col span={24}>
                    <Text type='danger'>* </Text>
                    <Text className='cvat-text-color'>Select files:</Text>
                </Col>
                <Col span={24}>
                    <ConnectedFileManager
                        ref={
                            (container: FileManagerContainer): void => {
                                this.fileManagerContainer = container;
                            }
                        }
                        withRemote={false}
                    />
                </Col>
                <Col span={18}>
                    {status && <Alert message={`${status}`} />}
                </Col>
                <Col span={6}>
                    <Button
                        type='primary'
                        disabled={loading}
                        loading={loading}
                        onClick={this.handleSubmitClick}
                    >
                        Submit
                    </Button>
                </Col>
            </Row>
        );
    }
}
