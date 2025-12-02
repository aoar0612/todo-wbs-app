import React, { useState, useMemo } from 'react';
import type { Task, TaskStatus, Project } from '../types';
import { ChevronRight, ChevronDown, Plus, Trash, Edit, GripVertical } from './Icons';

interface WbsTreeProps {
  project: Project | null;
  tasks: Task[];
  onCreateTask: (parentId: string | null) => void;
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  onEditTask: (task: Task) => void;
  onAddToToday: (task: Task) => void;
}

interface TaskTreeNode extends Task {
  children: TaskTreeNode[];
  level: number;
}

const buildTaskTree = (tasks: Task[]): TaskTreeNode[] => {
  const taskMap = new Map<string, TaskTreeNode>();
  const rootTasks: TaskTreeNode[] = [];

  // Create nodes
  tasks.forEach((task) => {
    taskMap.set(task.id, { ...task, children: [], level: 0 });
  });

  // Build tree
  tasks.forEach((task) => {
    const node = taskMap.get(task.id)!;
    if (task.parent_id && taskMap.has(task.parent_id)) {
      const parent = taskMap.get(task.parent_id)!;
      node.level = parent.level + 1;
      parent.children.push(node);
    } else {
      rootTasks.push(node);
    }
  });

  // Sort by order_index
  const sortNodes = (nodes: TaskTreeNode[]) => {
    nodes.sort((a, b) => a.order_index - b.order_index);
    nodes.forEach((node) => sortNodes(node.children));
  };
  sortNodes(rootTasks);

  return rootTasks;
};

const statusColors: Record<TaskStatus, string> = {
  pending: 'bg-gray-400',
  in_progress: 'bg-blue-500',
  completed: 'bg-green-500',
  cancelled: 'bg-red-400',
};

const statusLabels: Record<TaskStatus, string> = {
  pending: '未着手',
  in_progress: '進行中',
  completed: '完了',
  cancelled: 'キャンセル',
};

interface TaskRowProps {
  task: TaskTreeNode;
  expandedIds: Set<string>;
  onToggleExpand: (id: string) => void;
  onCreateTask: (parentId: string | null) => void;
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  onEditTask: (task: Task) => void;
  onAddToToday: (task: Task) => void;
}

const TaskRow: React.FC<TaskRowProps> = ({
  task,
  expandedIds,
  onToggleExpand,
  onCreateTask,
  onUpdateTask,
  onDeleteTask,
  onEditTask,
  onAddToToday,
}) => {
  const hasChildren = task.children.length > 0;
  const isExpanded = expandedIds.has(task.id);

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onUpdateTask({
      ...task,
      status: e.target.value as TaskStatus,
    });
  };

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdateTask({
      ...task,
      progress: parseInt(e.target.value, 10),
    });
  };

  return (
    <>
      <div
        className="group flex items-center gap-2 py-2 px-3 border-b border-[var(--color-border)] hover:bg-[var(--color-bg-secondary)] transition-colors"
        style={{ paddingLeft: `${task.level * 24 + 12}px` }}
      >
        {/* Drag handle */}
        <GripVertical size={14} className="text-[var(--color-text-tertiary)] cursor-grab opacity-0 group-hover:opacity-100" />

        {/* Expand/collapse */}
        <button
          onClick={() => hasChildren && onToggleExpand(task.id)}
          className={`w-5 h-5 flex items-center justify-center rounded hover:bg-[var(--color-bg-tertiary)] ${
            hasChildren ? 'text-[var(--color-text-secondary)]' : 'text-transparent'
          }`}
        >
          {hasChildren && (isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />)}
        </button>

        {/* Status indicator */}
        <div className={`w-2 h-2 rounded-full ${statusColors[task.status as TaskStatus]}`} />

        {/* Task title */}
        <span className="flex-1 text-sm text-[var(--color-text-primary)] truncate">{task.title}</span>

        {/* Status select */}
        <select
          value={task.status}
          onChange={handleStatusChange}
          className="text-xs px-2 py-1 rounded bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] text-[var(--color-text-secondary)]"
        >
          {Object.entries(statusLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        {/* Progress */}
        <div className="flex items-center gap-2 w-32">
          <input
            type="range"
            min="0"
            max="100"
            value={task.progress}
            onChange={handleProgressChange}
            className="flex-1 h-1 accent-[var(--color-accent)]"
          />
          <span className="text-xs text-[var(--color-text-tertiary)] w-8">{task.progress}%</span>
        </div>

        {/* Dates */}
        <span className="text-xs text-[var(--color-text-tertiary)] w-24">
          {task.start_date || '-'} ~ {task.end_date || '-'}
        </span>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onAddToToday(task)}
            className="p-1 rounded text-[var(--color-text-tertiary)] hover:bg-[var(--color-accent)] hover:text-white"
            title="今日のTODOに追加"
          >
            <Plus size={14} />
          </button>
          <button
            onClick={() => onCreateTask(task.id)}
            className="p-1 rounded text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-tertiary)]"
            title="子タスクを追加"
          >
            <Plus size={14} />
          </button>
          <button
            onClick={() => onEditTask(task)}
            className="p-1 rounded text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-tertiary)]"
            title="編集"
          >
            <Edit size={14} />
          </button>
          <button
            onClick={() => onDeleteTask(task.id)}
            className="p-1 rounded text-[var(--color-text-tertiary)] hover:bg-[var(--color-danger)] hover:text-white"
            title="削除"
          >
            <Trash size={14} />
          </button>
        </div>
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <>
          {task.children.map((child) => (
            <TaskRow
              key={child.id}
              task={child}
              expandedIds={expandedIds}
              onToggleExpand={onToggleExpand}
              onCreateTask={onCreateTask}
              onUpdateTask={onUpdateTask}
              onDeleteTask={onDeleteTask}
              onEditTask={onEditTask}
              onAddToToday={onAddToToday}
            />
          ))}
        </>
      )}
    </>
  );
};

export const WbsTree: React.FC<WbsTreeProps> = ({
  project,
  tasks,
  onCreateTask,
  onUpdateTask,
  onDeleteTask,
  onEditTask,
  onAddToToday,
}) => {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const taskTree = useMemo(() => buildTaskTree(tasks), [tasks]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedIds(new Set(tasks.map((t) => t.id)));
  };

  const collapseAll = () => {
    setExpandedIds(new Set());
  };

  if (!project) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-[var(--color-text-tertiary)]">プロジェクトを選択してください</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)]">
        <div>
          <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">{project.name}</h2>
          {project.description && (
            <p className="text-sm text-[var(--color-text-secondary)] mt-1">{project.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={expandAll}
            className="px-3 py-1 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] rounded"
          >
            すべて展開
          </button>
          <button
            onClick={collapseAll}
            className="px-3 py-1 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] rounded"
          >
            すべて折りたたむ
          </button>
          <button
            onClick={() => onCreateTask(null)}
            className="flex items-center gap-1 px-3 py-1.5 bg-[var(--color-accent)] text-white rounded-md text-sm hover:bg-[var(--color-accent-hover)] transition-colors"
          >
            <Plus size={16} />
            タスク追加
          </button>
        </div>
      </div>

      {/* Table header */}
      <div className="flex items-center gap-2 py-2 px-3 bg-[var(--color-bg-secondary)] border-b border-[var(--color-border)] text-xs font-medium text-[var(--color-text-tertiary)] uppercase">
        <span className="w-5" />
        <span className="w-5" />
        <span className="w-2" />
        <span className="flex-1">タスク名</span>
        <span className="w-20">ステータス</span>
        <span className="w-32">進捗</span>
        <span className="w-24">期間</span>
        <span className="w-24" />
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-y-auto">
        {taskTree.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <p className="text-[var(--color-text-tertiary)] mb-4">タスクがありません</p>
            <button
              onClick={() => onCreateTask(null)}
              className="flex items-center gap-1 px-4 py-2 bg-[var(--color-accent)] text-white rounded-md text-sm hover:bg-[var(--color-accent-hover)] transition-colors"
            >
              <Plus size={16} />
              最初のタスクを作成
            </button>
          </div>
        ) : (
          taskTree.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              expandedIds={expandedIds}
              onToggleExpand={toggleExpand}
              onCreateTask={onCreateTask}
              onUpdateTask={onUpdateTask}
              onDeleteTask={onDeleteTask}
              onEditTask={onEditTask}
              onAddToToday={onAddToToday}
            />
          ))
        )}
      </div>
    </div>
  );
};

