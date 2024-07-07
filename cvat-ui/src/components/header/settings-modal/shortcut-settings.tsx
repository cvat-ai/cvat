import {
    Button,
    Col,
    Flex,
    Row,
    Collapse,
    List,
} from 'antd/lib';
import Search from 'antd/lib/input/Search';
import React, {
    useState, useMemo,
} from 'react';
import { ShortcutScope } from 'utils/enums';
import { KeyMap } from 'utils/mousetrap-react';
import MultipleShortcutsDisplay from './multiple-shortcuts-display';

interface Props {
    keyMap: KeyMap;
    normalizedKeyMap: Record<string, string>;
    onKeySequenceUpdate(keyMapId: string, updatedSequence: string[]): void;
}

function ShortcutsSettingsComponent(props: Props): JSX.Element {
    const { keyMap, onKeySequenceUpdate } = props;
    const [searchValue, setSearchValue] = useState('');

    const onSearchChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
        setSearchValue(event.target.value.toLowerCase());
    };

    const filteredKeyMap = useMemo(() => Object.entries(keyMap).filter(
        ([, item]) => (
            item.name.toLowerCase().includes(searchValue) ||
                item.description.toLowerCase().includes(searchValue)
        ),
    ), [keyMap, searchValue]);

    const items: any = useMemo(() => Object.values(ShortcutScope).map((scope: string) => {
        const viewFilteredItems = filteredKeyMap.filter(
            ([, item]) => item.scope === scope,
        );

        if (viewFilteredItems.length === 0) {
            return null;
        }

        return {
            label: <span className='cvat-shortcuts-settings-label'>{`${scope.split('_').join(' ').toLowerCase()} Shortcuts`}</span>,
            key: scope,
            children: (
                <List
                    dataSource={viewFilteredItems}
                    renderItem={([id, item]) => (
                        <List.Item>
                            <List.Item.Meta
                                title={<p className='cvat-shortcuts-settings-item-title'>{item.name}</p>}
                                description={<span className='cvat-shortcuts-settings-item-description'>{item.description}</span>}
                            />
                            <MultipleShortcutsDisplay
                                id={id}
                                keyMap={keyMap}
                                item={item}
                                onKeySequenceUpdate={onKeySequenceUpdate}
                            />
                        </List.Item>
                    )}
                    style={{ paddingLeft: 5 }}
                />
            ),
        };
    }).filter(Boolean), [filteredKeyMap]);

    return (
        <div className='cvat-shortcuts-settings'>
            <Row className='cvat-shortcuts-setting'>
                <Col span={24}>
                    <Flex gap={4}>
                        <Search
                            size='large'
                            placeholder='Search for a shortcut here...'
                            allowClear
                            onChange={onSearchChange}
                            className='cvat-shortcuts-settings-search'
                        />
                        <Button size='large'>Restore Defaults</Button>
                    </Flex>
                </Col>
            </Row>
            <Row className='cvat-shortcuts-setting'>
                <Col span={24}>
                    <Collapse
                        items={items}
                        bordered={false}
                        defaultActiveKey={Object.values(ShortcutScope).map((scope: string) => scope)}
                    />
                </Col>
            </Row>
        </div>
    );
}

export default React.memo(ShortcutsSettingsComponent);
