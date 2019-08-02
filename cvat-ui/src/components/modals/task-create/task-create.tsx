import React, { PureComponent } from 'react';

import { Form, Input, Icon, Checkbox, Radio, Upload } from 'antd';

import './task-create.scss';


const { Dragger } = Upload;

class TaskCreateForm extends PureComponent<any, any> {
  constructor(props: any) {
    super(props);

    this.state = {
      selectedFile: null,
      selectedFileList: [],
    };
  }

  render() {
    const { getFieldDecorator } = this.props.form;

    return (
      <Form layout="inline">
        <Form.Item label="Name">
          {getFieldDecorator('name', {
            rules: [{ required: true, message: 'Please input task name!' }],
          })(
            <Input
              prefix={ <Icon type="profile" /> }
              type="text"
              name="name"
            />
          )}
        </Form.Item>

        <Form.Item label="Labels">
          {getFieldDecorator('labels', {
            rules: [{ required: true, message: 'Please add some labels!' }],
          })(
            <Input
              prefix={ <Icon type="tag" /> }
              type="text"
              name="labels"
            />
          )}
        </Form.Item>

        <Form.Item label="Bug tracker">
          {getFieldDecorator('bugTracker', {
            rules: [],
          })(
            <Input
              prefix={ <Icon type="bug" /> }
              type="text"
              name="bug-tracker"
            />
          )}
        </Form.Item>

        <Form.Item label="Dataset repository">
          {getFieldDecorator('datasetRepository', {
            rules: [],
          })(
            <Input
              prefix={ <Icon type="database" /> }
              type="text"
              name="dataset-repository"
            />
          )}
        </Form.Item>

        <Form.Item label="Use LFS">
          {getFieldDecorator('useLFS', {
            rules: [],
          })(
            <Checkbox
              defaultChecked
              name="use-lfs"
            />
          )}
        </Form.Item>

        <Form.Item label="Source">
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

        <Form.Item label="Z-Order">
          {getFieldDecorator('zOrder', {
            rules: [],
          })(
            <Checkbox
              name="z-order"
            />
          )}
        </Form.Item>

        <Form.Item label="Overlap size">
          {getFieldDecorator('overlapSize', {
            rules: [],
          })(
            <Input
              prefix={ <Icon type="profile" /> }
              type="number"
              name="overlap-size"
            />
          )}
        </Form.Item>

        <Form.Item label="Segment size">
          {getFieldDecorator('segmentSize', {
            rules: [],
          })(
            <Input
              prefix={ <Icon type="profile" /> }
              type="number"
              name="segment-size"
            />
          )}
        </Form.Item>

        <Form.Item label="Image quality">
          {getFieldDecorator('imageQuality', {
            rules: [],
          })(
            <Input
              prefix={ <Icon type="file-image" /> }
              type="number"
              name="image-quality"
            />
          )}
        </Form.Item>

        <Form.Item label="Start frame">
          {getFieldDecorator('startFrame', {
            rules: [],
          })(
            <Input
              prefix={ <Icon type="profile" /> }
              type="number"
              name="start-frame"
            />
          )}
        </Form.Item>

        <Form.Item label="Stop frame">
          {getFieldDecorator('stopFrame', {
            rules: [],
          })(
            <Input
              prefix={ <Icon type="profile" /> }
              type="number"
              name="stop-frame"
            />
          )}
        </Form.Item>

        <Form.Item label="Frame filter">
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

        <Form.Item>
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

  private onUploaderChange = (info: any) => {
    const nextState: { selectedFile: any, selectedFileList: any } = {
      selectedFile: null,
      selectedFileList: null,
    };
    switch (info.file.status) {
      case 'uploading':
        nextState.selectedFileList = [info.file];
        break;
      case 'done':
        nextState.selectedFile = info.file;
        nextState.selectedFileList = [info.file];
        break;
      default:
        // INFO: error or removed
        nextState.selectedFile = null;
        nextState.selectedFileList = [];
    }
    this.setState(() => nextState);
  };

  private simulateRequest = ({ file, onSuccess }: any) => {
    setTimeout(() => {
      onSuccess('ok');
    }, 0);
  };

}

export default Form.create()(TaskCreateForm);
