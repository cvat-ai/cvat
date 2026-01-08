// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { RefObject } from 'react';
import Input from 'antd/lib/input';
import Text from 'antd/lib/typography/Text';
import Tooltip from 'antd/lib/tooltip';
import Form, { FormInstance } from 'antd/lib/form';
import { QuestionCircleOutlined } from '@ant-design/icons';

export interface BaseConfiguration {
    name: string;
}

interface Props {
    onChange(values: BaseConfiguration): void;
    many: boolean;
    exampleMultiTaskName?: string;
}

export default class BasicConfigurationForm extends React.PureComponent<Props> {
    private formRef: RefObject<FormInstance>;
    private inputRef: RefObject<Input>;
    private initialName: string;

    public constructor(props: Props) {
        super(props);
        this.formRef = React.createRef<FormInstance>();
        this.inputRef = React.createRef<Input>();

        const { many } = this.props;
        this.initialName = many ? '{{file_name}}' : '';
    }

    componentDidMount(): void {
        const { onChange } = this.props;
        onChange({
            name: this.initialName,
        });
    }

    private handleChangeName(e: React.ChangeEvent<HTMLInputElement>): void {
        const { onChange } = this.props;
        onChange({
            name: e.target.value,
        });
    }

    public submit(): Promise<void> {
        if (this.formRef.current) {
            return this.formRef.current.validateFields();
        }

        return Promise.reject(new Error('Form ref is empty'));
    }

    public resetFields(): void {
        if (this.formRef.current) {
            this.formRef.current.resetFields();
        }
    }

    public focus(): void {
        if (this.inputRef.current) {
            this.inputRef.current.focus();
        }
    }

    public render(): JSX.Element {
        const { many, exampleMultiTaskName } = this.props;

        return (
            <Form ref={this.formRef} layout='vertical'>
                <Form.Item
                    className={many ? 'cvat-task-name-field-has-tooltip' : ''}
                    hasFeedback
                    name='name'
                    label={<span>名称</span>}
                    rules={[
                        {
                            required: true,
                            message: '任务名称不能为空',
                        },
                    ]}
                    initialValue={this.initialName}
                >
                    <Input
                        ref={this.inputRef}
                        onChange={(e) => this.handleChangeName(e)}
                    />
                </Form.Item>
                {many ? (
                    <Text type='secondary'>
                        <Tooltip title={() => (
                            <>
                                您可以在模板中使用：
                                <ul>
                                    <li>
                                        some_text - 任何文本
                                    </li>
                                    <li>
                                        {'{{'}
                                        index
                                        {'}}'}
                                         - 集合中的索引文件
                                    </li>
                                    <li>
                                        {'{{'}
                                        file_name
                                        {'}}'}
                                         - 文件名
                                    </li>
                                </ul>
                                示例： 
                                <i>
                                    {exampleMultiTaskName || 'Task name 1 - video_1.mp4'}
                                </i>
                            </>
                        )}
                        >
                            形成名称时使用模板。
                            {' '}
                            <QuestionCircleOutlined />
                        </Tooltip>
                    </Text>
                ) : null}
            </Form>
        );
    }
}


