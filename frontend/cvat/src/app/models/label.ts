import { Attribute } from './attribute';

export interface Label{
  id: number;
  name: string;
  attributes: Attribute[];
}
