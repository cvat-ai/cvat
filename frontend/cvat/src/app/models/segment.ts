import { SimpleJob } from './simpleJob';

export interface Segment{
  start_frame: number;
  stop_frame: number;
  jobs: SimpleJob[];

}
