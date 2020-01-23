import React from 'react';

import {
    Col,
    Icon,
    Modal,
    Timeline,
} from 'antd';

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

const LeftGroup = React.memo((props: Props): JSX.Element => {
    const {
        saving,
        savingStatuses,
        onSaveAnnotation,
    } = props;

    return (
        <Col className='cvat-annotation-header-left-group'>
            <div className='cvat-annotation-header-button'>
                <Icon component={MainMenuIcon} />
                <span>Menu</span>
            </div>
            <div
                className={saving
                    ? 'cvat-annotation-disabled-header-button'
                    : 'cvat-annotation-header-button'
                }
            >
                <Icon component={SaveIcon} onClick={onSaveAnnotation} />
                <span>
                    { saving ? 'Saving...' : 'Save' }
                </span>
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
            </div>
            <div className='cvat-annotation-header-button'>
                <Icon component={UndoIcon} />
                <span>Undo</span>
            </div>
            <div className='cvat-annotation-header-button'>
                <Icon component={RedoIcon} />
                <span>Redo</span>
            </div>
        </Col>
    );
});

export default LeftGroup;
