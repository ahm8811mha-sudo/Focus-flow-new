import ProjectPMPStages from './ProjectPMPStages';
import type { ProjectAgent, ProjectStage } from './types';
import type { PMPStage } from './pmp';

type Props = {
  stages: ProjectStage[];
  busyItem?: string;
  updateStage: (stageId: string, patch: Partial<PMPStage>) => void;
  runWorkItem: (kind: 'stage', item: ProjectStage) => void;
  addStage: (owner: ProjectAgent) => void;
};

export default function ProjectStageBridge({ stages, busyItem, updateStage, runWorkItem, addStage }: Props) {
  return (
    <ProjectPMPStages
      stages={stages}
      busyItem={busyItem}
      onUpdateStage={updateStage}
      onRunStage={(stage) => runWorkItem('stage', stage)}
      onAddStage={addStage}
    />
  );
}
