import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  clearAllLocalMemory,
  exportLocalMemory,
  generateOfflineProjectPlan,
  getSnapshot,
  importLocalMemory,
  removeRecord,
  saveNote,
  saveProject,
  saveTask,
  saveAgent,
  type Agent,
  type Activity,
  type Note,
  type Project,
  type Task,
  type AppSettings,
} from '@/lib/localMemory';

export interface LocalMemoryState {
  projects: Project[];
  tasks: Task[];
  notes: Note[];
  agents: Agent[];
  activities: Activity[];
  settings?: AppSettings;
}

const emptyState: LocalMemoryState = {
  projects: [],
  tasks: [],
  notes: [],
  agents: [],
  activities: [],
};

export function useLocalMemory() {
  const [state, setState] = useState<LocalMemoryState>(emptyState);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const snapshot = await getSnapshot();
    setState(snapshot);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const stats = useMemo(() => {
    const totalTasks = state.tasks.length;
    const completed = state.tasks.filter((task) => task.status === 'done').length;
    const overdue = state.tasks.filter((task) => task.dueDate && task.status !== 'done' && task.dueDate < new Date().toISOString().slice(0, 10)).length;
    const progress = totalTasks ? Math.round((completed / totalTasks) * 100) : 0;
    return {
      totalProjects: state.projects.length,
      totalTasks,
      completed,
      pending: totalTasks - completed,
      overdue,
      progress,
      activeAgents: state.agents.filter((agent) => agent.active).length,
      notes: state.notes.length,
    };
  }, [state]);

  return {
    ...state,
    loading,
    stats,
    refresh,
    saveProject: async (...args: Parameters<typeof saveProject>) => { const result = await saveProject(...args); await refresh(); return result; },
    saveTask: async (...args: Parameters<typeof saveTask>) => { const result = await saveTask(...args); await refresh(); return result; },
    saveNote: async (...args: Parameters<typeof saveNote>) => { const result = await saveNote(...args); await refresh(); return result; },
    saveAgent: async (...args: Parameters<typeof saveAgent>) => { const result = await saveAgent(...args); await refresh(); return result; },
    remove: async (...args: Parameters<typeof removeRecord>) => { await removeRecord(...args); await refresh(); },
    clearAll: async () => { await clearAllLocalMemory(); await refresh(); },
    exportBackup: exportLocalMemory,
    importBackup: async (file: File) => { await importLocalMemory(file); await refresh(); },
    generatePlan: async (prompt: string) => { const result = await generateOfflineProjectPlan(prompt); await refresh(); return result; },
  };
}
