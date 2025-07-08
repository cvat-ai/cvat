import React from 'react';
import Button from 'antd/lib/button';

interface ResourceSelectionInfoProps {
    selectedCount: number;
    onSelectAll?: () => void;
}

export function ResourceSelectionInfo({ selectedCount, onSelectAll }: ResourceSelectionInfoProps): JSX.Element | null {
    if (selectedCount <= 1 && !onSelectAll) return null;
    return (
        <span className='cvat-resource-selection-info'>
            {onSelectAll && (
                <Button
                    className='cvat-resource-select-all-button'
                    onClick={onSelectAll}
                    size='small'
                    type='link'
                >
                    Select all
                </Button>
            )}
            {selectedCount > 1 && (
                <span className='cvat-resource-selection-count'>
                    {`Selected: ${selectedCount}`}
                </span>
            )}

        </span>
    );
}
