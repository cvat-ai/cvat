import React, { PureComponent } from 'react';

import { Form, Input, Icon, Checkbox, Radio, Upload } from 'antd';
import { UploadFile, UploadChangeParam } from 'antd/lib/upload/interface';

import { validateLabels, convertStringToNumber } from '../../../utils/tasks-dto';

import './task-create.scss';


const { Dragger } = Upload;

const formItemLayout = {
  labelCol: {
    xs: { span: 24 },
    sm: { span: 8 },
  },
  wrapperCol: {
    xs: { span: 24 },
    sm: { span: 16 },
  },
};

const formItemTailLayout = {
  labelCol: {
    xs: { span: 24 },
  },
  wrapperCol: {
    xs: { span: 24 },
  },
};

class TaskCreateForm extends PureComponent<any, any> {
  constructor(props: any) {
    super(props);

    this.state = {
      confirmDirty: false,
      selectedFileList: [],
    };
  }

  render() {
    const { getFieldDecorator } = this.props.form;

    return (
      <Form>
        <Form.Item { ...formItemLayout } label="Name">
          {getFieldDecorator('name', {
            rules: [
              {
                required: true,
                pattern: new RegExp('[a-zA-Z0-9_]+'),
                message: 'Bad task name!',
              },
            ],
          })(
            <Input
              prefix={ <Icon type="profile" /> }
              type="text"
              name="name"
            />
          )}
        </Form.Item>

        <Form.Item { ...formItemLayout } label="Labels">
          {getFieldDecorator('labels', {
            rules: [
              { required: true, message: 'Please add some labels!' },
              { validator: validateLabels, message: 'Bad labels format!' },
            ],
          })(
            <Input
              prefix={ <Icon type="tag" /> }
              type="text"
              name="labels"
            />
          )}
        </Form.Item>

        <Form.Item { ...formItemLayout } label="Bug tracker">
          {getFieldDecorator('bugTracker', {
            rules: [{ type: 'url', required: true, message: 'Bad bug tracker link!' }],
          })(
            <Input
              prefix={ <Icon type="tool" /> }
              type="text"
              name="bug-tracker"
            />
          )}
        </Form.Item>

        <Form.Item { ...formItemLayout } label="Dataset repository">
          {getFieldDecorator('datasetRepository', {
            rules: [{ type: 'url', required: true, message: 'Bad dataset repository link!' }],
          })(
            <Input
              prefix={ <Icon type="database" /> }
              type="text"
              name="dataset-repository"
            />
          )}
        </Form.Item>

        <Form.Item { ...formItemLayout } label="Use LFS" >
          {getFieldDecorator('useLFS', {
            rules: [],
            initialValue: true,
          })(
            <Checkbox
              defaultChecked
              name="use-lfs"
            />
          )}
        </Form.Item>

        <Form.Item { ...formItemLayout } label="Source">
          {getFieldDecorator('source', {
            rules: [],
            initialValue: 1,
          })(
            <Radio.Group>
              <Radio.Button value={1}>Local</Radio.Button>
              <Radio.Button value={2}>Remote</Radio.Button>
              <Radio.Button value={3}>Share</Radio.Button>
            </Radio.Group>
          )}
        </Form.Item>

        <Form.Item { ...formItemLayout } label="Z-Order">
          {getFieldDecorator('zOrder', {
            rules: [],
            initialValue: false,
          })(
            <Checkbox
              name="z-order"
            />
          )}
        </Form.Item>

        <Form.Item { ...formItemLayout } label="Segment size" hasFeedback>
          {getFieldDecorator('segmentSize', {
            rules: [
              {
                type: 'number',
                min: 100,
                max: 50000,
                message: 'Segment size out of range!',
              },
            ],
            initialValue: 5000,
            getValueFromEvent: convertStringToNumber,
          })(
            <Input
              prefix={ <Icon type="profile" /> }
              type="number"
              name="segment-size"
            />
          )}
        </Form.Item>

        <Form.Item { ...formItemLayout } label="Overlap size" hasFeedback>
          {getFieldDecorator('overlapSize', {
            rules: [
              {
                type: 'number',
                min: 0,
                max: this.props.form.getFieldValue('segmentSize') - 1,
              },
            ],
            initialValue: 0,
            getValueFromEvent: convertStringToNumber,
          })(
            <Input
              prefix={ <Icon type="profile" /> }
              type="number"
              name="overlap-size"
            />
          )}
        </Form.Item>

        <Form.Item { ...formItemLayout } label="Image quality">
          {getFieldDecorator('imageQuality', {
            rules: [],
            initialValue: 50,
            getValueFromEvent: convertStringToNumber,
          })(
            <Input
              prefix={ <Icon type="file-image" /> }
              type="number"
              name="image-quality"
            />
          )}
        </Form.Item>

        <Form.Item { ...formItemLayout } label="Start frame" hasFeedback>
          {getFieldDecorator('startFrame', {
            rules: [
              {
                type: 'number',
                min: 0,
                message: 'Bad start frame!',
              },
            ],
            initialValue: 0,
            getValueFromEvent: convertStringToNumber,
          })(
            <Input
              prefix={ <Icon type="profile" /> }
              type="number"
              name="start-frame"
            />
          )}
        </Form.Item>

        <Form.Item { ...formItemLayout } label="Stop frame" hasFeedback>
          {getFieldDecorator('stopFrame', {
            rules: [
              {
                type: 'number',
                min: this.props.form.getFieldValue('startFrame'),
                message: 'Stop frame must be greater than or equal to start frame!',
              },
            ],
            initialValue: 0,
            getValueFromEvent: convertStringToNumber,
          })(
            <Input
              prefix={ <Icon type="profile" /> }
              type="number"
              name="stop-frame"
            />
          )}
        </Form.Item>

        <Form.Item { ...formItemLayout } label="Frame filter">
          {getFieldDecorator('frameFilter', {
            rules: [],
          })(
            <Input
              prefix={ <Icon type="profile" /> }
              type="text"
              name="frame-filter"
            />
          )}
        </Form.Item>

        <Form.Item { ...formItemTailLayout }>
          {getFieldDecorator('filesUpload', {
            rules: [],
          })(
            <Dragger
              multiple
              fileList={ this.state.selectedFileList }
              customRequest={ this.simulateRequest }
              onChange={ this.onUploaderChange }>
              <p className="ant-upload-drag-icon">
                <Icon type="inbox" />
              </p>
              <p className="ant-upload-text">Click or drag file to this area to upload</p>
            </Dragger>
          )}
        </Form.Item>
      </Form>
    );
  }

  private onUploaderChange = (info: UploadChangeParam) => {
    const nextState: { selectedFileList: UploadFile[] } = {
      selectedFileList: this.state.selectedFileList,
    };

    switch (info.file.status) {
      case 'uploading':
        nextState.selectedFileList.push(info.file);
        break;
      case 'done':
        break;
      default:
        // INFO: error or removed
        nextState.selectedFileList = info.fileList;
    }

    this.setState(() => nextState);
  };

  private simulateRequest = ({ file, onSuccess }: any) => {
    setTimeout(() => {
      onSuccess(file);
    }, 0);
  };
}

export default Form.create()(TaskCreateForm);
