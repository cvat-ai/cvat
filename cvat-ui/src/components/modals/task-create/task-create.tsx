import React, { PureComponent } from 'react';

import { Form, Input, Icon, Checkbox, Radio, Upload, Badge, Tree, TreeSelect, InputNumber } from 'antd';
import { UploadFile, UploadChangeParam } from 'antd/lib/upload/interface';

import configureStore from '../../../store';
import { getShareFilesAsync } from '../../../actions/server.actions';

import { validateLabels, FileSource, fileModel } from '../../../utils/tasks-dto';

import './task-create.scss';


const { TreeNode } = Tree;
const { SHOW_PARENT } = TreeSelect;
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
  store: any;

  constructor(props: any) {
    super(props);

    this.store = configureStore();

    this.state = {
      confirmDirty: false,
      selectedFileList: [],
      filesCounter: 0,
      treeData: [],
    };
  }

  componentDidMount() {
    this.getSharedFiles('').then(
      (data: any) => {
        this.setState({ treeData: fileModel('', this.store.getState().server.files) });
      },
    );
  }

  private renderTreeNodes = (data: any) => {
    return data.map((item: any) => {
      if (!item.isLeaf) {
        return (
          <TreeNode title={ item.name } key={ item.id } value={ item.id } dataRef={ item }>
            { item.children ? this.renderTreeNodes(item.children) : '' }
          </TreeNode>
        );
      }

      return <TreeNode isLeaf title={ item.name } key={ item.id } value={ item.id } dataRef={ item } />;
    });
  }

  private renderUploader = () => {
    const { getFieldDecorator } = this.props.form;

    switch (this.props.form.getFieldValue('source')) {
      case FileSource.Local:
        return (
          <Form.Item
            { ...formItemTailLayout }
            extra='Only one video, archive, pdf or many image, directory can be used simultaneously'>
            <Badge
              count={ this.state.filesCounter }
              overflowCount={999}>
              <div onClick={ this.resetUploader }>
                {getFieldDecorator('localUpload', {
                  rules: [{ required: true, message: 'Please, add some files!' }],
                })(
                  <Dragger
                    multiple
                    showUploadList={ false }
                    fileList={ this.state.selectedFileList }
                    customRequest={ this.simulateRequest }
                    onChange={ this.onUploaderChange }>
                    <p className="ant-upload-drag-icon">
                      <Icon type="inbox" />
                    </p>
                    <p className="ant-upload-text">Click or drag file to this area to upload</p>
                  </Dragger>
                )}
              </div>
            </Badge>
          </Form.Item>
        );
      case FileSource.Remote:
        return (
          <Form.Item { ...formItemLayout } label="URLs">
          {getFieldDecorator('remoteURL', {
            rules: [],
          })(
            <Input.TextArea
              name="remote-url"
            />
          )}
        </Form.Item>
        );
      case FileSource.Share:
        return (
          <Form.Item { ...formItemLayout } label="Shared files"
            extra='Only one video, archive, pdf or many image, directory can be used simultaneously'>
            {getFieldDecorator('sharedFiles', {
              rules: [{ required: true, message: 'Please, add some files!' }],
            })(
              <TreeSelect
                multiple
                treeCheckable={ true }
                showCheckedStrategy={ SHOW_PARENT }
                loadData={ this.onLoadData }>
                { this.renderTreeNodes(this.state.treeData) }
              </TreeSelect>
            )}
          </Form.Item>
        );
      default:
        break;
    }
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
            rules: [{ type: 'url', message: 'Bad bug tracker link!' }],
          })(
            <Input
              prefix={ <Icon type="tool" /> }
              type="text"
              name="bug-tracker"
            />
          )}
        </Form.Item>

        <Form.Item { ...formItemLayout } label="Source">
          {getFieldDecorator('source', {
            rules: [],
            initialValue: 1,
          })(
            <Radio.Group onChange={ this.resetUploader }>
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
            rules: [],
          })(
            <InputNumber
              min={100}
              max={50000}
              name="segment-size"
            />
          )}
        </Form.Item>

        <Form.Item { ...formItemLayout } label="Overlap size" hasFeedback>
          {getFieldDecorator('overlapSize', {
            rules: [],
            initialValue: 0,
          })(
            <InputNumber
              min={0}
              max={ this.props.form.getFieldValue('segmentSize') ? this.props.form.getFieldValue('segmentSize') - 1 : 0 }
              name="overlap-size"
            />
          )}
        </Form.Item>

        <Form.Item { ...formItemLayout } label="Image quality">
          {getFieldDecorator('imageQuality', {
            rules: [{ required: true }],
            initialValue: 50,
          })(
            <InputNumber
              min={1}
              max={95}
              name="image-quality"
            />
          )}
        </Form.Item>

        <Form.Item { ...formItemLayout } label="Start frame" hasFeedback>
          {getFieldDecorator('startFrame', {
            rules: [],
            initialValue: 0,
          })(
            <InputNumber
              min={0}
              name="start-frame"
            />
          )}
        </Form.Item>

        <Form.Item { ...formItemLayout } label="Stop frame" hasFeedback>
          {getFieldDecorator('stopFrame', {
            rules: [],
          })(
            <InputNumber
              min={ this.props.form.getFieldValue('startFrame') }
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

        { this.renderUploader() }
      </Form>
    );
  }

  private onLoadData = (treeNode: any) => {
    return new Promise<void>(resolve => {
      if (treeNode.props.children) {
        resolve();

        return;
      }

      this.getSharedFiles(treeNode.props.dataRef.id).then(
        (data: any) => {
          treeNode.props.dataRef.children = fileModel(treeNode, this.store.getState().server.files);

          this.setState({
            treeData: [...this.state.treeData],
          });

          resolve();
        },
      );
    });
  }

  private getSharedFiles = (directory: string) => {
    return this.store.dispatch(getShareFilesAsync(directory));
  }

  private onUploaderChange = (info: UploadChangeParam) => {
    const nextState: { selectedFileList: UploadFile[], filesCounter: number } = {
      selectedFileList: this.state.selectedFileList,
      filesCounter: this.state.filesCounter,
    };

    switch (info.file.status) {
      case 'uploading':
        nextState.selectedFileList.push(info.file);
        nextState.filesCounter += 1;
        break;
      case 'done':
        break;
      default:
        // INFO: error or removed
        nextState.selectedFileList = info.fileList;
    }

    this.setState(() => nextState);
  }

  private resetUploader = () => {
    this.setState({ selectedFileList: [], filesCounter: 0 });
  }

  private simulateRequest = ({ file, onSuccess }: any) => {
    setTimeout(() => {
      onSuccess(file);
    }, 0);
  }
}

export default Form.create()(TaskCreateForm);
