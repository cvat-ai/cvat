import React from 'react';
import ReactDOM from 'react-dom';

import TasksPage from './tasks-page';


it('renders without crashing', () => {
  const div = document.createElement('div');
  ReactDOM.render(<TasksPage />, div);
  ReactDOM.unmountComponentAtNode(div);
});
