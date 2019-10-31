import React from 'react';

import {
    Menu,
    Button,
    Icon,
    Upload,
} from 'antd';

import { RcFile } from 'antd/lib/upload';
import Text from 'antd/lib/typography/Text';

interface LoaderItemComponentProps {
    taskInstance: any;
    loader: any;
    loadActivity: string | null;
    onLoadAnnotation: (taskInstance: any, loader: any, file: File) => void;
}

export default function LoaderItemComponent(props: LoaderItemComponentProps) {
    const { loader } = props;

    const loadingWithThisLoader = props.loadActivity
        && props.loadActivity === loader.name
        ? props.loadActivity : null;

    const pending = !!loadingWithThisLoader;

    return (
        <Menu.Item className='cvat-task-item-load-submenu-item' key={loader.name}>
            <Upload
                accept={`.${loader.format}`}
                multiple={false}
                showUploadList={ false }
                beforeUpload={(file: RcFile) => {
                    props.onLoadAnnotation(
                        props.taskInstance,
                        loader,
                        file as File,
                    );

                    return false;
                }}>
                <Button block={true} type='link' disabled={!!props.loadActivity}>
                    <Icon type='upload'/>
                    <Text>{loader.name}</Text>
                    {pending ? <Icon type='loading'/> : null}
                </Button>
            </Upload>
        </Menu.Item>
    );
}