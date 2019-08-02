import React, { PureComponent } from 'react';

import { Form, Input, Icon } from 'antd';

import { serializeLabels, deserializeLabels } from '../../../utils/labels'

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
              { validator: this.validateLabels, message: 'Bad labels format!' },
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

  private validateLabels = (rule: any, value: string, callback: Function) => {
    if (value) {
      try {
        deserializeLabels(value);
      } catch (error) {
        callback(error.message);
      }
    }

    callback();
  }
}

export default Form.create()(TaskUpdateForm) as any;
