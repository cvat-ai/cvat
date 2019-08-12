import React, { PureComponent } from 'react';

import { Form, Input, Icon, Checkbox, Radio, Upload, Badge, Tree } from 'antd';
import { UploadFile, UploadChangeParam } from 'antd/lib/upload/interface';

import configureStore from '../../../store';
import { getShareFilesAsync } from '../../../actions/server.actions';

import { validateLabels, convertStringToNumber, FileSource, fileModel } from '../../../utils/tasks-dto';

import './task-create.scss';


const { TreeNode, DirectoryTree } = Tree;
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
        this.setState({ treeData: fileModel('', this.store.getState().shareFiles.files) });
      },
    );
  }

  private renderTreeNodes = (data: any) => {
    return data.map((item: any) => {
      if (!item.isLeaf) {
        return (
          <TreeNode title={ item.name } key={ item.id } dataRef={ item }>
            { item.children ? this.renderTreeNodes(item.children) : '' }
          </TreeNode>
        );
      }

      return <TreeNode isLeaf title={ item.name } key={ item.id } dataRef={ item } />;
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
          <Form.Item { ...formItemLayout } label="Shared files">
            {getFieldDecorator('sharedFiles', {
              rules: [],
            })(
              <DirectoryTree
                multiple
                expandAction="doubleClick"
                loadData={ this.onLoadData }
                onSelect={ this.onTreeNodeSelect }
                onExpand={ this.onTreeNodeExpand }>
                { this.renderTreeNodes(this.state.treeData) }
              </DirectoryTree>
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

        <Form.Item { ...formItemLayout } label="Dataset repository">
          {getFieldDecorator('datasetRepository', {
            rules: [{ type: 'url', message: 'Bad dataset repository link!' }],
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
            rules: [
              {
                type: 'number',
                min: 100,
                max: 50000,
                message: 'Segment size out of range!',
              },
            ],
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
          treeNode.props.dataRef.children = fileModel(treeNode, this.store.getState().shareFiles.files);

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

  private onTreeNodeSelect = (keys: any, event: any) => {
    console.log('Trigger Select', keys, event);
  }

  private onTreeNodeExpand = () => {
    console.log('Trigger Expand');
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
  };

  private resetUploader = () => {
    this.setState({ selectedFileList: [], filesCounter: 0 });
  };

  private simulateRequest = ({ file, onSuccess }: any) => {
    setTimeout(() => {
      onSuccess(file);
    }, 0);
  };
}

export default Form.create()(TaskCreateForm);
