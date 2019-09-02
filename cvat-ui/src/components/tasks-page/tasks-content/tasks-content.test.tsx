import React from 'react';
import ReactDOM from 'react-dom';

import TasksContent from './tasks-content';


it('renders without crashing', () => {
  const div = document.createElement('div');
  ReactDOM.render(<TasksContent />, div);
  ReactDOM.unmountComponentAtNode(div);
});
