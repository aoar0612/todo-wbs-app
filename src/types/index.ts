// Project type
export interface Project {
  id: string;
  name: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
}

// Task status
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

// Task type (WBS item)
export interface Task {
  id: string;
  project_id: string;
  parent_id: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: number;
  start_date: string | null;
  end_date: string | null;
  progress: number;
  order_index: number;
  created_at: string;
  children?: Task[];
}

// Daily TODO type
export interface DailyTodo {
  id: string;
  task_id: string | null;
  title: string;
  date: string;
  completed: boolean;
  memo: string | null;
  created_at: string;
  task?: Task;
  project?: Project;
}

// View type
export type ViewType = 'wbs' | 'gantt' | 'today' | 'calendar';

// Gantt chart time scale
export type TimeScale = 'day' | 'week' | 'month';

// Task with hierarchy info for tree view
export interface TaskTreeNode extends Task {
  children: TaskTreeNode[];
  level: number;
  expanded: boolean;
}

// Form data for creating/editing projects
export interface ProjectFormData {
  name: string;
  description: string;
  start_date: string;
  end_date: string;
}

// Form data for creating/editing tasks
export interface TaskFormData {
  title: string;
  description: string;
  status: TaskStatus;
  priority: number;
  start_date: string;
  end_date: string;
  parent_id: string | null;
}

// Daily report data
export interface DailyReport {
  date: string;
  completedTodos: DailyTodo[];
  incompleteTodos: DailyTodo[];
  memo: string;
}

