// Copyright (C) 2022 Sportradar
//
// SPDX-License-Identifier: MIT
import './styles.scss';
import React, {useContext, useEffect, useRef, useState} from 'react';
import {connect, useDispatch} from 'react-redux';
import {CloseCircleOutlined, DeleteOutlined, PlusCircleOutlined} from '@ant-design/icons';
import {Form, Input, Table} from 'antd';

import {ThunkDispatch} from 'utils/redux';
import {CombinedState, Task} from 'reducers/interfaces';
import Button from "antd/lib/button";
import {setMetadataAsync, updateMetadataAsync,} from "../../actions/tasks-actions";
import CVATTooltip from "../common/cvat-tooltip";


interface StateToProps {
    taskId: number | undefined;
    metadata: any | undefined;
    showTablee: boolean;
    saveDisabled: boolean;
    metadataLoading: boolean;
    task: Task | undefined;
}

interface DispatchToProps {
    setMetadata(meta: any[]): void;

    updateMetadata(taskId: number | undefined, data: string): void;
}

function mapStateToProps(state: CombinedState, data: any): StateToProps {
    if (data["task"] === undefined){
        return {
            taskId: undefined,
            metadata: [],
            showTablee: false,
            saveDisabled: true,
            metadataLoading: state.tasks.metadataLoading,
            task: undefined,
        };
    } else {
        return {
            taskId: data.task.instance.id,
            metadata: data.metadata,
            showTablee: false,
            saveDisabled: false,
            metadataLoading: state.tasks.metadataLoading,
            task: data.task,
        };
    }
}

function mapDispatchToProps(dispatch: ThunkDispatch): DispatchToProps {
    return {
        setMetadata(meta: any[]) {
            dispatch(setMetadataAsync(meta));
        },
        updateMetadata: (taskId: number | undefined, data): void => {
            dispatch(updateMetadataAsync(taskId, data));
        },
    } as DispatchToProps;
}
function MetadataTable(props: StateToProps & DispatchToProps): JSX.Element {

    const {
        metadata, setMetadata, taskId, updateMetadata, showTablee, saveDisabled, metadataLoading,
    } = props;
    const EditableContext = React.createContext(null);
    const [showTable, setShowTable] = useState(showTablee);

    const [rows, setRows] = useState(metadata);
    useEffect(() => {
        return function cleanup () {
            setMetadata([]);
        }
    }, []);
    function handleAddRow() {
        setRows((prev: { id: number; }[]) => {
                let next = 0
                let li = 0;
                if (prev.length > 0) {
                    li = li = Math.max.apply(null, rows.map(x => x.id));
                }
                next = li + 1
                prev.push({
                    id: next,
                })
                return [...prev]
            }
        )
    }

    function deleteRow(record: any) {
        setRows((prev: any[]) => {
                const index = prev.indexOf(record);
                if (index > -1) {
                    prev.splice(index, 1);
                    setMetadata(prev);
                }
                if (prev.length == 0)  {
                    // @ts-ignore
                    setShowTable(false)
                }

                return [...prev]
            }
        )
    }

    function handleSave(row) {
        const newData = [...rows];
        const index = newData.findIndex((item) => row.id === item.id);
        const item = newData[index];
        newData.splice(index, 1, {...item, ...row});
        setRows(newData);
        setMetadata(newData)
    }

    const EditableRow = ({ index, ...props }) => {
        const [form] = Form.useForm();
        return (
            <Form form={form} component={false}>
                <EditableContext.Provider value={form}>
                    <tr {...props} />
                </EditableContext.Provider>
            </Form>
        );
    };

    const EditableCell = ({
                              title,
                              editable,
                              children,
                              dataIndex,
                              record,
                              handleSave,
                              ...restProps
                          }) => {
        const [editing, setEditing] = useState(false);
        const inputRef = useRef(null);
        const form = useContext(EditableContext);

        useEffect(() => {
            if (editing) {
                inputRef.current.focus();
            }
        }, [editing]);


        const toggleEdit = () => {
            setEditing(!editing);
            form.setFieldsValue({
                [dataIndex]: record[dataIndex],
            });
        };

        const save = async () => {
            try {
                // @ts-ignore
                const values = await form.validateFields();
                toggleEdit();
                handleSave({...record, ...values});
            } catch (errInfo) {
                console.log('Save failed:', errInfo);
            }
        };

        let childNode = children;

        if (editable) {
            childNode = editing ? (
                <Form.Item
                    style={{
                        margin: 0,
                    }}
                    name={dataIndex}
                    rules={[
                        {
                            required: true,
                            message: `${title} is required.`,
                        },
                    ]}
                >
                    <Input ref={inputRef} onPressEnter={save} onBlur={save}/>
                </Form.Item>
            ) : (
                <div
                    className="editable-cell-value-wrap"
                    style={{
                        paddingRight: 24,
                    }}
                    onClick={toggleEdit}
                >
                    {children}
                </div>
            );
        }

        return <td {...restProps}>{childNode}</td>;
    };
    const components = {
        body: {
            row: EditableRow,
            cell: EditableCell,
        },
    };
    const columns = [
        {
            title: 'Key',
            dataIndex: 'key',
            editable: true,
            width: '45%',
        },
        {
            title: 'Value',
            dataIndex: 'value',
            editable: true,
            width: '45%',
        },
        {
            title: 'Delete',
            width: '10%',
            dataIndex: 'delete',
            render: (_: any, record: any) => {
                return (<CVATTooltip title='Delete row'>
                    <Form.Item>
                        <Button
                            type='link'
                            className='cvat-delete-attribute-button'
                            onClick={(): void => {
                                deleteRow(record);
                            }}
                        >
                            <DeleteOutlined />
                        </Button>
                    </Form.Item>
                </CVATTooltip>)
            }
        },
    ];
    const columnss = columns.map((col) => {
        if (!col.editable) {
            return col;
        }
        return {
            ...col,
            onCell: (record: any) => ({
                record,
                editable: col.editable,
                dataIndex: col.dataIndex,
                title: col.title,
                handleSave: handleSave,
            }),
        };
    });
    const handleSaveButton = () => {
        updateMetadata(taskId, rows)
    }

    return (
        <div style={{"width": "100%"}}>

            <Table footer={() => <div style={{display: "flex",
                justifyContent: "space-between"}}><Button key='create' onClick={() => handleAddRow()}>
                Add
                <PlusCircleOutlined/>
            </Button><Button style={{alignItems: "end"}} disabled={saveDisabled} loading={metadataLoading} onClick={handleSaveButton}>Save</Button></div> }  rowKey="id" style={{"width": "100%"}} pagination={{ pageSize: 5 }} dataSource={rows} columns={columnss} rowClassName={() => 'editable-row'} components={components}/>
        </div>
    );
}

export default connect(mapStateToProps, mapDispatchToProps)(MetadataTable);
