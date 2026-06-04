type Props = {
  name: string;
  objective: string;
  progress: number;
};

export default function ProjectHeader({ name, objective, progress }: Props) {
  return (
    <div className="project-hero">
      <div>
        <span className="eyebrow">PROJECT FILE</span>
        <h2>{name}</h2>
        <p>{objective}</p>
      </div>
      <div className="score">
        <b>{progress}%</b>
        <small>نسبة التقدم</small>
      </div>
    </div>
  );
}
