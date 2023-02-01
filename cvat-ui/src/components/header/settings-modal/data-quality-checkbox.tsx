import React, { useEffect } from 'react';
import { getCore } from 'cvat-core-wrapper';
import Checkbox, { CheckboxProps } from 'antd/lib/checkbox';

function ChunkDataQualityCheckbox(props: CheckboxProps): JSX.Element {
    const { checked } = props;
    useEffect(() => {
        getCore().config.chunkDataQuality = checked ? 'original' : 'compressed';
        console.log(`getCore().config.chunkDataQuality: ${getCore().config.chunkDataQuality}`);
    }, [props]);

    return (
        <Checkbox {...props} />
    );
}

export default React.memo(ChunkDataQualityCheckbox);
