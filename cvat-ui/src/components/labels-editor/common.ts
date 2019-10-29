export interface Attribute {
    id: number;
    name: string;
    type: string;
    mutable: boolean;
    values: string[];
}

export interface Label {
    name: string;
    id: number;
    attributes: Attribute[];
}

let id = 0;

export default function idGenerator(): number {
    return --id;
}
