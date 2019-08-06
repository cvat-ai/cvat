import React, { PureComponent } from 'react';

import { Form, Input, Icon } from 'antd';

import { serializeLabels, validateLabels } from '../../../utils/tasks-dto'

import './task-update.scss';


class TaskUpdateForm extends PureComponent<any, any> {
  render() {
    const { getFieldDecorator } = this.props.form;

    return (
      <Form>
        <Form.Item>
          {getFieldDecorator('oldLabels', {
            rules: [],
            initialValue: serializeLabels(this.props.task),
          })(
            <Input
              disabled
              prefix={ <Icon type="tag" /> }
              type="text"
              name="oldLabels"
              placeholder="Old labels"
            />,
          )}
        </Form.Item>

        <Form.Item>
          {getFieldDecorator('newLabels', {
            rules: [
              { required: true, message: 'Please input new labels!' },
              { validator: validateLabels, message: 'Bad labels format!' },
            ],
          })(
            <Input
              prefix={ <Icon type="tag" /> }
              type="text"
              name="new-labels"
              placeholder="Expand the specification here"
            />,
          )}
        </Form.Item>
      </Form>
    );
  }
}

export default Form.create()(TaskUpdateForm) as any;
