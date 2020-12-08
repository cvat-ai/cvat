import React from 'react';
import { CheckboxChangeEvent } from 'antd/lib/checkbox';
import { Checkbox, Divider } from 'antd';
const CheckboxGroup = Checkbox.Group;
import {CheckboxValueType} from 'antd/lib/checkbox/Group';
import { Task, TasksQuery } from 'reducers/interfaces';
import Spin from 'antd/lib/spin';

export interface ContentListProps {
  tasks: Task[];
  fetching: boolean;
  updating: boolean;
  getTasks: (query: TasksQuery) => void;
  currentTasksIndexes: number[];
}

export default function PickedTaskListComponent(props: ContentListProps): JSX.Element {
  const { tasks, fetching, updating, getTasks, currentTasksIndexes } = props;
  if (tasks.length === 0 || updating) { // TODO
    if (!fetching) {
      getTasks({
        page: 1, // TODO: resolve page restrction
        id: null,
        search: null,
        owner: null,
        assignee: null,
        name: null,
        status: null,
        mode: null,
      });
    }
    return <Spin size='large' className='cvat-spinner' />;
  }
  const plainOptions = currentTasksIndexes.map((taskId): string => "#"+taskId.toString());
  const defaultCheckedList = plainOptions.slice(0,1);
  const [checkedList, setCheckedList] = React.useState(defaultCheckedList);
  const [indeterminate, setIndeterminate] = React.useState(true);
  const [checkAll, setCheckAll] = React.useState(false);

  const onChange = (rawList:CheckboxValueType[]) => {
    let list = (rawList as string[]);
    setCheckedList(list);
    setIndeterminate(!!list.length && list.length < plainOptions.length);
    setCheckAll(list.length === plainOptions.length);
  };

  const onCheckAllChange = (e: CheckboxChangeEvent) => {
    setCheckedList(e.target.checked ? plainOptions : []);
    setIndeterminate(false);
    setCheckAll(e.target.checked);
  };

  return (
      <div className='cvat-picked-tasks'>
        <Checkbox indeterminate={indeterminate} onChange={onCheckAllChange} checked={checkAll}>
          Check all
        </Checkbox>
        <Divider>Choose tasks via ID</Divider>
        <CheckboxGroup options={plainOptions} value={checkedList} onChange={onChange} />
      </div>
  );
}