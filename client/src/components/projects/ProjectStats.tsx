type Props = {
  stages: number;
  tasks: number;
  linkedTasks: number;
  agentResults: number;
};

export default function ProjectStats({ stages, tasks, linkedTasks, agentResults }: Props) {
  return (
    <div className="stats-grid">
      <a href="#project-stages"><b>{stages}</b><span>مراحل</span></a>
      <a href="#project-tasks"><b>{tasks}</b><span>مهام المشروع</span></a>
      <a href="#system-tasks"><b>{linkedTasks}</b><span>مهام نظام مرتبطة</span></a>
      <a href="#structured-results"><b>{agentResults}</b><span>نتائج وكلاء</span></a>
    </div>
  );
}
