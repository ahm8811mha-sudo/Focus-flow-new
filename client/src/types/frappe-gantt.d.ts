declare module 'frappe-gantt' {
  interface GanttTask {
    id: string;
    name: string;
    start: string;
    end: string;
    progress: number;
    dependencies?: string;
    custom_class?: string;
  }

  interface GanttOptions {
    on_click?: (task: GanttTask) => void;
    on_date_change?: (task: GanttTask, start: Date, end: Date) => void;
    on_progress_change?: (task: GanttTask, progress: number) => void;
    on_view_change?: (mode: string) => void;
    view_modes?: string[];
    column_width?: number;
    step?: number;
    bar_corner_radius?: number;
    arrow_curve?: number;
    padding?: number;
    view_mode?: string;
    date_format?: string;
    custom_popup_html?: any;
  }

  class Gantt {
    constructor(element: HTMLElement, tasks: GanttTask[], options?: GanttOptions);
    refresh(): void;
    change_view_mode(mode: string): void;
  }

  export default Gantt;
}

declare module 'frappe-gantt/dist/frappe-gantt.css' {
  const content: any;
  export default content;
}
