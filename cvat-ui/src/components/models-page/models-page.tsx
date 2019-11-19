import React from 'react';

import TopBarComponent from './top-bar';
import EmptyModelsListComponent from './empty-list';

export default function ModelsPageComponent() {
    return (
        <div className='cvat-models-page'>
            <TopBarComponent/>
            <EmptyModelsListComponent/>
        </div>
    );
}