export interface IFlattenedJunit {
  name: string;
  classname: string;
  timeSec: number;
  state: 'passed' | 'failed' | 'skipped' | 'unknown';
  message?: string;
}
