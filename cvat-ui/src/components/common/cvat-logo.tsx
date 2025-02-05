import React from 'react';
import { useSelector } from 'react-redux';

function CVATLogo(): JSX.Element {
    const SVGLogo = useSelector((state: any) => state.about.server.logo);

    return (
        <div className='cvat-logo-icon'>
            <img
                src={`data:image/svg+xml;utf8,${encodeURIComponent(SVGLogo)}`}
                alt='CVAT Logo'
            />
        </div>
    );
}

export default React.memo(CVATLogo);
