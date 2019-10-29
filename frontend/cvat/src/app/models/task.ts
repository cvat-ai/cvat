import { Label } from './label';
import { Segment} from './segment';

export interface Task {
  url: string;
  id: number;
  name: string;
  size: number;
  mode: string;
  owner: number;
  assignee: number;
  bug_tracker: string;
  created_date: string;
  updated_date: string;
  overlap: number;
  segment_size: number;
  z_order: boolean;
  status: "annotation" | "validation" | "completed";
  labels: Label[];
  segments: Segment[];
  image_quality: number;
  start_frame: number;
  stop_frame: number;
  frame_filter: string;
}
