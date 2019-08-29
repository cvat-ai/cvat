import React from 'react';
import ReactDOM from 'react-dom';

import TasksFooter from './tasks-footer';


it('renders without crashing', () => {
  const div = document.createElement('div');
  ReactDOM.render(<TasksFooter />, div);
  ReactDOM.unmountComponentAtNode(div);
});
