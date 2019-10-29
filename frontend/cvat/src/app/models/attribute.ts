export interface Attribute{
  id: number;
  name: string;
  mutable: boolean;
  input_type: "checkbox"| "radio"| "number"| "text"| "select"
  default_value: string;
  values: string;
}
