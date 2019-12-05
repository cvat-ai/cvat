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

export default function LoaderItemComponent(props: LoaderItemComponentProps): JSX.Element {
    const {
        loader,
        loadActivity,
    } = props;

    const loadingWithThisLoader = loadActivity
        && loadActivity === loader.name
        ? loadActivity : null;

    const pending = !!loadingWithThisLoader;

    return (
        <Menu.Item className='cvat-actions-menu-load-submenu-item' key={loader.name}>
            <Upload
                accept={`.${loader.format}`}
                multiple={false}
                showUploadList={false}
                beforeUpload={(file: RcFile): boolean => {
                    props.onLoadAnnotation(
                        props.taskInstance,
                        loader,
                        file as File,
                    );

                    return false;
                }}
            >
                <Button block type='link' disabled={!!loadActivity}>
                    <Icon type='upload' />
                    <Text>{loader.name}</Text>
                    {pending && <Icon type='loading' />}
                </Button>
            </Upload>
        </Menu.Item>
    );
}
