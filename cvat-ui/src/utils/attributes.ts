// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

type LabelAttr = { id?: number; name: string };
type Label = { id: number; attributes: LabelAttr[] };
type ObjAttrVal = { id?: number; name: string; value?: any };

/**
 * Orders attribute values according to the label's attribute definition order
 * @param label - The label containing the attribute definitions in the correct order
 * @param values - The attribute values to be ordered
 * @returns Ordered array of attribute values matching the label's attribute order
 */
export function orderAttributesByLabel(label: Label, values: ObjAttrVal[]): ObjAttrVal[] {
    // 1) id 우선 매핑
    const byId = new Map<number, ObjAttrVal>();
    for (const v of values) {
        if (typeof v.id === 'number') {
            byId.set(v.id!, v);
        }
    }

    // 2) name fallback 매핑
    const byName = new Map<string, ObjAttrVal>();
    for (const v of values) {
        if (v.name) {
            byName.set(v.name, v);
        }
    }

    // 3) 라벨 정의 순서대로 재정렬
    const ordered: ObjAttrVal[] = [];
    for (const a of label.attributes) {
        if (typeof a.id === 'number' && byId.has(a.id)) {
            ordered.push(byId.get(a.id)!);
        } else if (a.name && byName.has(a.name)) {
            ordered.push(byName.get(a.name)!);
        }
    }
    
    return ordered;
}

/**
 * Alternative function that uses saved job attributes for ordering
 * @param jobAttributes - Job attributes mapping from state
 * @param labelId - Label ID to get the correct attribute order
 * @param values - The attribute values to be ordered
 * @returns Ordered array of attribute values
 */
export function orderAttributesByJobConfig(
    jobAttributes: Record<number, any[]>, 
    labelId: number, 
    values: ObjAttrVal[]
): ObjAttrVal[] {
    const savedAttributes = jobAttributes[labelId];
    
    if (savedAttributes && Array.isArray(savedAttributes)) {
        // Use the saved attribute order from jobAttributes
        const byId = new Map<number, ObjAttrVal>();
        const byName = new Map<string, ObjAttrVal>();
        
        for (const v of values) {
            if (typeof v.id === 'number') {
                byId.set(v.id, v);
            }
            if (v.name) {
                byName.set(v.name, v);
            }
        }
        
        const ordered: ObjAttrVal[] = [];
        for (const savedAttr of savedAttributes) {
            if (typeof savedAttr.id === 'number' && byId.has(savedAttr.id)) {
                ordered.push(byId.get(savedAttr.id)!);
            } else if (savedAttr.name && byName.has(savedAttr.name)) {
                ordered.push(byName.get(savedAttr.name)!);
            }
        }
        
        return ordered;
    }
    
    // Fallback to original order
    return values;
}

/**
 * Interface for selective display settings
 */
export interface SelectiveDisplaySettings {
    enableSelectiveDisplay: boolean;
    selectiveLabels: number[];
    selectiveAttributes: Record<number, number[]>;
}

/**
 * Checks if a label should be displayed based on selective display settings
 */
export function shouldShowLabel(labelId: number, settings: SelectiveDisplaySettings): boolean {
    if (!settings.enableSelectiveDisplay) {
        return true; // Show all labels if selective display is disabled
    }
    
    return settings.selectiveLabels.includes(labelId);
}

/**
 * Filters attributes based on selective display settings for a specific label
 */
export function filterAttributesForDisplay(
    attributes: any[], 
    labelId: number, 
    settings: SelectiveDisplaySettings
): any[] {
    if (!settings.enableSelectiveDisplay) {
        return attributes; // Return all attributes if selective display is disabled
    }
    
    const allowedAttributeIds = settings.selectiveAttributes[labelId];
    if (!allowedAttributeIds || allowedAttributeIds.length === 0) {
        return []; // No attributes allowed for this label
    }
    
    return attributes.filter(attr => allowedAttributeIds.includes(attr.id));
}

/**
 * Filters attribute values object based on selective display settings
 */
export function filterAttributeValuesForDisplay(
    attributeValues: Record<string, any>,
    labelId: number,
    settings: SelectiveDisplaySettings
): Record<string, any> {
    if (!settings.enableSelectiveDisplay) {
        return attributeValues; // Return all attributes if selective display is disabled
    }
    
    const allowedAttributeIds = settings.selectiveAttributes[labelId];
    if (!allowedAttributeIds || allowedAttributeIds.length === 0) {
        return {}; // No attributes allowed for this label
    }
    
    const filtered: Record<string, any> = {};
    for (const [attrId, value] of Object.entries(attributeValues)) {
        if (allowedAttributeIds.includes(Number(attrId))) {
            filtered[attrId] = value;
        }
    }
    
    return filtered;
}