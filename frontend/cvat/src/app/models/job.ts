import { SimpleJob } from './simpleJob';

export interface Job extends SimpleJob {
  start_frame: string;
  stop_frame: string;
  task_id: string;
}
