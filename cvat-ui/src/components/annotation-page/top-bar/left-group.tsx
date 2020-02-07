import React from 'react';

import {
    Col,
    Icon,
    Modal,
    Button,
    Timeline,
    Dropdown,
} from 'antd';

import AnnotationMenuContainer from 'containers/annotation-page/top-bar/annotation-menu';

import {
    MainMenuIcon,
    SaveIcon,
    UndoIcon,
    RedoIcon,
} from '../../../icons';

interface Props {
    saving: boolean;
    savingStatuses: string[];
    onSaveAnnotation(): void;
}

function LeftGroup(props: Props): JSX.Element {
    const {
        saving,
        savingStatuses,
        onSaveAnnotation,
    } = props;

    return (
        <Col className='cvat-annotation-header-left-group'>
            <Dropdown overlay={<AnnotationMenuContainer />}>
                <Button type='link' className='cvat-annotation-header-button'>
                    <Icon component={MainMenuIcon} />
                    Menu
                </Button>
            </Dropdown>
            <Button
                onClick={saving ? undefined : onSaveAnnotation}
                type='link'
                className={saving
                    ? 'cvat-annotation-disabled-header-button'
                    : 'cvat-annotation-header-button'
                }
            >
                <Icon component={SaveIcon} />
                { saving ? 'Saving...' : 'Save' }
                <Modal
                    title='Saving changes on the server'
                    visible={saving}
                    footer={[]}
                    closable={false}
                >
                    <Timeline pending={savingStatuses[savingStatuses.length - 1] || 'Pending..'}>
                        {
                            savingStatuses.slice(0, -1)
                                .map((
                                    status: string,
                                    id: number,
                                // eslint-disable-next-line react/no-array-index-key
                                ) => <Timeline.Item key={id}>{status}</Timeline.Item>)
                        }
                    </Timeline>
                </Modal>
            </Button>
            <Button disabled type='link' className='cvat-annotation-header-button'>
                <Icon component={UndoIcon} />
                Undo
            </Button>
            <Button disabled type='link' className='cvat-annotation-header-button'>
                <Icon component={RedoIcon} />
                Redo
            </Button>
        </Col>
    );
}

export default React.memo(LeftGroup);
