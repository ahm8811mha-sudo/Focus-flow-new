// Types for the Lateen Notes application

export interface User {
  id: number;
  openId: string;
  name: string | null;
  email: string | null;
  loginMethod: string | null;
  role: 'user' | 'admin';
  createdAt: Date;
  updatedAt: Date;
  lastSignedIn: Date;
}

export interface List {
  id: string;
  userId: number;
  name: string;
  icon: string;
  color: string;
  isSystem: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Project {
  id: string;
  userId: number;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  status: 'active' | 'archived';
  createdAt: Date;
  updatedAt: Date;
}

export interface Task {
  id: string;
  userId: number;
  listId: string | null;
  projectId: string | null;
  title: string;
  description: string | null;
  priority: 'عالية' | 'متوسطة' | 'منخفضة' | null;
  isDone: boolean;
  dueDate: Date | null;
  recurrence: 'none' | 'daily' | 'weekly' | 'monthly' | null;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
}

export interface SubTask {
  id: string;
  taskId: string;
  title: string;
  isDone: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Note {
  id: string;
  userId: number;
  title: string;
  content: string;
  isPinned: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Attachment {
  id: string;
  taskId: string | null;
  noteId: string | null;
  filename: string;
  url: string;
  mimeType: string;
  size: number;
  createdAt: Date;
}

export interface ActivityLog {
  id: string;
  userId: number;
  action: string;
  entityType: string;
  entityId: string;
  changes: string | null;
  createdAt: Date;
}

export interface Statistics {
  id: string;
  userId: number;
  totalTasks: number;
  completedTasks: number;
  totalProjects: number;
  totalNotes: number;
  date: Date;
  createdAt: Date;
}

export interface ProjectStep {
  id: string;
  projectId: string;
  name: string;
  description: string | null;
  duration: number | null;
  startDate: string | null;
  plannedEndDate: string | null;
  actualStartDate: string | null;
  actualEndDate: string | null;
  status: 'pending' | 'in-progress' | 'completed' | 'on-hold' | 'cancelled' | 'delayed';
  isCompleted: boolean;
  progress: number;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}


export interface ProjectRequirement {
  id: string;
  projectId: string;
  requirementName: string;
  description: string | null;
  type: 'resource' | 'budget' | 'personnel' | 'other';
  quantity: number | null;
  unit: string | null;
  estimatedCost: number | null;
  actualCost: number | null;
  status: 'pending' | 'allocated' | 'in_progress' | 'completed';
  priority: 'عالية' | 'متوسطة' | 'منخفضة' | null;
  isCompleted: boolean;
  completedAt: Date | null;
  completedBy: number | null;
  notes: string | null;
  sharedWith: number[] | null;
  sharePermissions: Record<number, 'view' | 'edit' | 'comment'> | null;
  createdAt: Date;
  updatedAt: Date;
}
