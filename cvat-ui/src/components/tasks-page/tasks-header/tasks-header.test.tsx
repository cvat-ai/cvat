import React from 'react';
import ReactDOM from 'react-dom';

import TasksHeader from './tasks-header';


it('renders without crashing', () => {
  const div = document.createElement('div');
  ReactDOM.render(<TasksHeader />, div);
  ReactDOM.unmountComponentAtNode(div);
});
