import { invoke } from '@tauri-apps/api/core';
import type { Project, Task, DailyTodo } from '../types';

// Extended DailyTodo with task info
export interface DailyTodoWithTask extends DailyTodo {
  task_title: string | null;
  project_name: string | null;
}

// Project API
export const projectApi = {
  create: (data: { name: string; description?: string; start_date?: string; end_date?: string }) =>
    invoke<Project>('create_project', {
      name: data.name,
      description: data.description || null,
      startDate: data.start_date || null,
      endDate: data.end_date || null,
    }),

  getAll: () => invoke<Project[]>('get_all_projects'),

  get: (id: string) => invoke<Project | null>('get_project', { id }),

  update: (id: string, data: { name: string; description?: string; start_date?: string; end_date?: string }) =>
    invoke<void>('update_project', {
      id,
      name: data.name,
      description: data.description || null,
      startDate: data.start_date || null,
      endDate: data.end_date || null,
    }),

  delete: (id: string) => invoke<void>('delete_project', { id }),
};

// Task API
export const taskApi = {
  create: (data: {
    project_id: string;
    parent_id?: string;
    title: string;
    description?: string;
    status: string;
    priority: number;
    start_date?: string;
    end_date?: string;
  }) =>
    invoke<Task>('create_task', {
      projectId: data.project_id,
      parentId: data.parent_id || null,
      title: data.title,
      description: data.description || null,
      status: data.status,
      priority: data.priority,
      startDate: data.start_date || null,
      endDate: data.end_date || null,
    }),

  getByProject: (projectId: string) => invoke<Task[]>('get_tasks_by_project', { projectId }),

  update: (
    id: string,
    data: {
      title: string;
      description?: string;
      status: string;
      priority: number;
      start_date?: string;
      end_date?: string;
      progress: number;
    }
  ) =>
    invoke<void>('update_task', {
      id,
      title: data.title,
      description: data.description || null,
      status: data.status,
      priority: data.priority,
      startDate: data.start_date || null,
      endDate: data.end_date || null,
      progress: data.progress,
    }),

  updateDates: (id: string, startDate: string | null, endDate: string | null) =>
    invoke<void>('update_task_dates', { id, startDate, endDate }),

  delete: (id: string) => invoke<void>('delete_task', { id }),
};

// Daily TODO API
export const todoApi = {
  create: (data: { task_id?: string; title: string; date: string; memo?: string }) =>
    invoke<DailyTodo>('create_daily_todo', {
      taskId: data.task_id || null,
      title: data.title,
      date: data.date,
      memo: data.memo || null,
    }),

  getByDate: (date: string) => invoke<DailyTodoWithTask[]>('get_todos_by_date', { date }),

  toggle: (id: string) => invoke<boolean>('toggle_todo', { id }),

  updateMemo: (id: string, memo: string | null) => invoke<void>('update_todo_memo', { id, memo }),

  delete: (id: string) => invoke<void>('delete_todo', { id }),

  addFromTask: (taskId: string, date: string) => invoke<DailyTodo>('add_task_to_todo', { taskId, date }),
};

// Report API
export const reportApi = {
  generate: (date: string, memo: string) => invoke<string>('generate_daily_report', { date, memo }),
};

