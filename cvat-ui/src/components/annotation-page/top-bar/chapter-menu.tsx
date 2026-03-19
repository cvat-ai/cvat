// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Icon from '@ant-design/icons';
import Popover from 'antd/lib/popover';
import List from 'antd/lib/list';
import CvatTooltip from 'components/common/cvat-tooltip';
import { Chapter } from 'cvat-core/src/frames';
import { ChapterMenuIcon } from 'icons';

interface Props {
    chapters: Chapter[];
    onSelectChapter: (id: number) => void;
    onHoveredChapter?: (id: number | null) => void;
}

function ChapterMenu(props: Readonly<Props>): JSX.Element {
    const {
        chapters,
        onSelectChapter,
        onHoveredChapter,
    } = props;

    const content = (
        <div className='cvat-player-chapter-menu-wrapper'>
            <List
                className='cvat-player-chapter-menu-list'
                size='small'
                dataSource={chapters}
                renderItem={(chapter: Chapter) => {
                    const itemClass = 'cvat-player-chapter-menu-list-item';

                    return (
                        <List.Item
                            className={itemClass}
                            key={chapter.id}
                            onClick={() => onSelectChapter(chapter.id)}
                            onMouseEnter={() => onHoveredChapter?.(chapter.id)}
                            onMouseLeave={() => onHoveredChapter?.(null)}
                        >
                            <div>
                                <strong>
                                    <span style={{ color: '#aaa' }}>
                                        {chapter.id}
                                        {': '}
                                    </span>
                                    {chapter.metadata.title}
                                </strong>
                                <div>
                                    Frames
                                    {' '}
                                    {chapter.start}
                                    -
                                    {chapter.stop}
                                </div>
                            </div>
                        </List.Item>

                    );
                }}
            />
        </div>
    );

    return (
        <Popover
            trigger='click'
            content={content}
            title='Chapters'
            placement='bottom'
            className='cvat-player-chapter-menu'
        >

            <CvatTooltip title='Select chapter'>
                <Icon
                    className='cvat-player-chapters-menu-button'
                    component={ChapterMenuIcon}
                />
            </CvatTooltip>

        </Popover>
    );
}

export default React.memo(ChapterMenu);
