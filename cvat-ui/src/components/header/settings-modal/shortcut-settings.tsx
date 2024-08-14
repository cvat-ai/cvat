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
    useCallback,
} from 'react';
import { ShortcutScope } from 'utils/enums';
import { KeyMap } from 'utils/mousetrap-react';
import { Empty, Modal } from 'antd';
import { shortcutsActions } from 'actions/shortcuts-actions';
import { useDispatch, useSelector } from 'react-redux';
import { CombinedState } from 'reducers';
import MultipleShortcutsDisplay from './multiple-shortcuts-display';

interface Props {
    keyMap: KeyMap;
    normalizedKeyMap: Record<string, string>;
    onKeySequenceUpdate(keyMapId: string, updatedSequence: string[]): void;
}

function ShortcutsSettingsComponent(props: Props): JSX.Element {
    const { keyMap, onKeySequenceUpdate } = props;
    const [searchValue, setSearchValue] = useState('');
    const shortcuts = useSelector((state: CombinedState) => state.shortcuts);
    const [activeKeys, setActiveKeys] = useState<string[]>([]);
    const dispatch = useDispatch();

    const onSearchChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
        setSearchValue(event.target.value.toLowerCase());
    };

    const onRestoreDefaults = useCallback(() => {
        Modal.confirm({
            title: 'Are you sure you want to restore defaults?',
            okText: 'Yes',
            cancelText: 'No',
            onOk: () => {
                const currentSettings = localStorage.getItem('clientSettings');
                dispatch(shortcutsActions.setShortcuts({
                    ...shortcuts,
                    keyMap: { ...shortcuts.defaultState },
                }));
                if (currentSettings) {
                    const parsedSettings = JSON.parse(currentSettings);
                    delete parsedSettings.shortcuts;
                    localStorage.setItem('clientSettings', JSON.stringify(parsedSettings));
                }
            },
            onCancel: () => {},
        });
    }, [shortcuts.defaultState]);

    const filteredKeyMap = useMemo(() => Object.entries(keyMap).filter(
        ([, item]) => (
            item.name.toLowerCase().includes(searchValue) ||
            item.description.toLowerCase().includes(searchValue)
        ),
    ), [keyMap, searchValue]);

    const items: any = useMemo(() => {
        const scopeItems = Object.values(ShortcutScope).map((scope: string) => {
            const viewFilteredItems = filteredKeyMap.filter(
                ([, item]) => item.scope === scope,
            );
            if (viewFilteredItems.length === 0) {
                return null;
            }
            return {
                label: <span className='cvat-shortcuts-settings-label'>{`${scope.split('_').join(' ').toLowerCase()}`}</span>,
                key: scope,
                showArrow: !searchValue,
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
        }).filter(Boolean);

        if (scopeItems.length === 0) {
            return null;
        }

        return scopeItems;
    }, [filteredKeyMap]);

    const handleCollapseChange = (keys: string[] | string): void => {
        if (!searchValue) {
            setActiveKeys(Array.isArray(keys) ? keys : [keys]);
        }
    };

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
                        <Button size='large' onClick={onRestoreDefaults}>Restore Defaults</Button>
                    </Flex>
                </Col>
            </Row>
            <Row className='cvat-shortcuts-setting'>
                <Col span={24}>
                    {items ? (
                        <Collapse
                            items={items}
                            bordered={false}
                            activeKey={searchValue ? Object.values(ShortcutScope) : activeKeys}
                            onChange={handleCollapseChange}
                            className='cvat-shortcuts-settings-collapse'
                        />
                    ) : (
                        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
                    )}
                </Col>
            </Row>
        </div>
    );
}

export default React.memo(ShortcutsSettingsComponent);
