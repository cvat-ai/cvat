export interface SimpleJob{
  url: String;
  id: number;
  assignee: number;
  status:  "annotation" | "validation"| "completed";
}
