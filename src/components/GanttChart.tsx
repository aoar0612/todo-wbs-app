import React, { useMemo, useState, useRef } from 'react';
import { format, eachDayOfInterval, startOfMonth, endOfMonth, addMonths, subMonths, parseISO, isWeekend, isSameMonth, addDays } from 'date-fns';
import { ja } from 'date-fns/locale';
import type { Task, Project } from '../types';
import { ChevronRight, ChevronDown } from './Icons';

interface GanttChartProps {
  project: Project | null;
  tasks: Task[];
  onUpdateTaskDates: (taskId: string, startDate: string | null, endDate: string | null) => void;
}

interface TaskTreeNode extends Task {
  children: TaskTreeNode[];
  level: number;
}

const buildTaskTree = (tasks: Task[]): TaskTreeNode[] => {
  const taskMap = new Map<string, TaskTreeNode>();
  const rootTasks: TaskTreeNode[] = [];

  tasks.forEach((task) => {
    taskMap.set(task.id, { ...task, children: [], level: 0 });
  });

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

  const sortNodes = (nodes: TaskTreeNode[]) => {
    nodes.sort((a, b) => a.order_index - b.order_index);
    nodes.forEach((node) => sortNodes(node.children));
  };
  sortNodes(rootTasks);

  return rootTasks;
};

const ROW_HEIGHT = 36;
const HEADER_HEIGHT = 60;
const TASK_LIST_WIDTH = 280;
const DAY_WIDTH = 40;

const statusColors: Record<string, string> = {
  pending: '#9ca3af',
  in_progress: '#3b82f6',
  completed: '#22c55e',
  cancelled: '#ef4444',
};

export const GanttChart: React.FC<GanttChartProps> = ({ project, tasks, onUpdateTaskDates }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [dragging, setDragging] = useState<{ taskId: string; type: 'move' | 'resize-start' | 'resize-end'; startX: number; originalStart: string; originalEnd: string } | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  const taskTree = useMemo(() => buildTaskTree(tasks), [tasks]);

  // Initialize expanded state
  useMemo(() => {
    setExpandedIds(new Set(tasks.map(t => t.id)));
  }, [tasks]);

  const visibleTasks = useMemo(() => {
    const result: TaskTreeNode[] = [];
    const traverse = (nodes: TaskTreeNode[]) => {
      nodes.forEach((node) => {
        result.push(node);
        if (expandedIds.has(node.id) && node.children.length > 0) {
          traverse(node.children);
        }
      });
    };
    traverse(taskTree);
    return result;
  }, [taskTree, expandedIds]);

  // Calculate date range
  const dateRange = useMemo(() => {
    const start = startOfMonth(subMonths(currentDate, 1));
    const end = endOfMonth(addMonths(currentDate, 2));
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

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

  const getTaskPosition = (task: Task) => {
    if (!task.start_date || !task.end_date) return null;
    const startIdx = dateRange.findIndex(
      (d) => format(d, 'yyyy-MM-dd') === task.start_date
    );
    const endIdx = dateRange.findIndex(
      (d) => format(d, 'yyyy-MM-dd') === task.end_date
    );
    if (startIdx === -1 || endIdx === -1) return null;
    return {
      left: startIdx * DAY_WIDTH,
      width: (endIdx - startIdx + 1) * DAY_WIDTH,
    };
  };

  const handleMouseDown = (e: React.MouseEvent, taskId: string, type: 'move' | 'resize-start' | 'resize-end') => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task || !task.start_date || !task.end_date) return;
    e.preventDefault();
    setDragging({
      taskId,
      type,
      startX: e.clientX,
      originalStart: task.start_date,
      originalEnd: task.end_date,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;
    const diff = Math.round((e.clientX - dragging.startX) / DAY_WIDTH);
    if (diff === 0) return;

    const task = tasks.find((t) => t.id === dragging.taskId);
    if (!task) return;

    const originalStart = parseISO(dragging.originalStart);
    const originalEnd = parseISO(dragging.originalEnd);

    let newStart: Date;
    let newEnd: Date;

    if (dragging.type === 'move') {
      newStart = addDays(originalStart, diff);
      newEnd = addDays(originalEnd, diff);
    } else if (dragging.type === 'resize-start') {
      newStart = addDays(originalStart, diff);
      newEnd = originalEnd;
      if (newStart > newEnd) return;
    } else {
      newStart = originalStart;
      newEnd = addDays(originalEnd, diff);
      if (newEnd < newStart) return;
    }

    onUpdateTaskDates(dragging.taskId, format(newStart, 'yyyy-MM-dd'), format(newEnd, 'yyyy-MM-dd'));
  };

  const handleMouseUp = () => {
    setDragging(null);
  };

  if (!project) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-[var(--color-text-tertiary)]">プロジェクトを選択してください</p>
      </div>
    );
  }

  const chartWidth = dateRange.length * DAY_WIDTH;
  const chartHeight = visibleTasks.length * ROW_HEIGHT;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)]">
        <div>
          <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">{project.name}</h2>
          <p className="text-sm text-[var(--color-text-secondary)]">ガントチャート</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentDate(subMonths(currentDate, 1))}
            className="px-3 py-1 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] rounded"
          >
            ← 前月
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-3 py-1 text-sm bg-[var(--color-accent)] text-white rounded"
          >
            今日
          </button>
          <button
            onClick={() => setCurrentDate(addMonths(currentDate, 1))}
            className="px-3 py-1 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] rounded"
          >
            翌月 →
          </button>
        </div>
      </div>

      {/* Chart */}
      <div
        ref={chartRef}
        className="flex-1 flex overflow-auto"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Task list */}
        <div className="flex-shrink-0 bg-[var(--color-bg-primary)] border-r border-[var(--color-border)]" style={{ width: TASK_LIST_WIDTH }}>
          {/* Task list header */}
          <div
            className="flex items-center px-3 bg-[var(--color-bg-secondary)] border-b border-[var(--color-border)] text-xs font-medium text-[var(--color-text-tertiary)]"
            style={{ height: HEADER_HEIGHT }}
          >
            タスク名
          </div>
          {/* Task rows */}
          {visibleTasks.map((task) => (
            <div
              key={task.id}
              className="flex items-center gap-2 px-3 border-b border-[var(--color-border)] hover:bg-[var(--color-bg-secondary)]"
              style={{ height: ROW_HEIGHT, paddingLeft: `${task.level * 16 + 12}px` }}
            >
              <button
                onClick={() => task.children.length > 0 && toggleExpand(task.id)}
                className={`w-4 h-4 flex items-center justify-center ${task.children.length > 0 ? 'text-[var(--color-text-secondary)]' : 'text-transparent'}`}
              >
                {task.children.length > 0 && (expandedIds.has(task.id) ? <ChevronDown size={12} /> : <ChevronRight size={12} />)}
              </button>
              <div
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: statusColors[task.status] }}
              />
              <span className="text-sm text-[var(--color-text-primary)] truncate">{task.title}</span>
            </div>
          ))}
        </div>

        {/* Timeline */}
        <div className="flex-1 overflow-x-auto">
          <div style={{ width: chartWidth, minWidth: '100%' }}>
            {/* Timeline header */}
            <div
              className="flex flex-col bg-[var(--color-bg-secondary)] border-b border-[var(--color-border)]"
              style={{ height: HEADER_HEIGHT }}
            >
              {/* Months */}
              <div className="flex h-1/2">
                {dateRange.reduce((acc, date, i) => {
                  if (i === 0 || !isSameMonth(date, dateRange[i - 1])) {
                    const monthDays = dateRange.filter((d) => isSameMonth(d, date)).length;
                    acc.push(
                      <div
                        key={format(date, 'yyyy-MM')}
                        className="flex items-center justify-center text-xs font-medium text-[var(--color-text-secondary)] border-r border-[var(--color-border)]"
                        style={{ width: monthDays * DAY_WIDTH }}
                      >
                        {format(date, 'yyyy年M月', { locale: ja })}
                      </div>
                    );
                  }
                  return acc;
                }, [] as React.ReactNode[])}
              </div>
              {/* Days */}
              <div className="flex h-1/2">
                {dateRange.map((date) => (
                  <div
                    key={format(date, 'yyyy-MM-dd')}
                    className={`flex items-center justify-center text-xs border-r border-[var(--color-border)] ${
                      isWeekend(date)
                        ? 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-tertiary)]'
                        : 'text-[var(--color-text-secondary)]'
                    } ${format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') ? 'bg-[var(--color-accent)] text-white' : ''}`}
                    style={{ width: DAY_WIDTH }}
                  >
                    {format(date, 'd')}
                  </div>
                ))}
              </div>
            </div>

            {/* Task bars */}
            <div style={{ position: 'relative', height: chartHeight }}>
              {/* Grid lines */}
              {dateRange.map((date, i) => (
                <div
                  key={format(date, 'yyyy-MM-dd')}
                  className={`absolute top-0 bottom-0 border-r border-[var(--color-border)] ${isWeekend(date) ? 'bg-[var(--color-bg-secondary)]/50' : ''}`}
                  style={{ left: i * DAY_WIDTH, width: DAY_WIDTH }}
                />
              ))}
              {/* Today line */}
              {(() => {
                const todayIdx = dateRange.findIndex((d) => format(d, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd'));
                if (todayIdx === -1) return null;
                return (
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-[var(--color-accent)] z-10"
                    style={{ left: todayIdx * DAY_WIDTH + DAY_WIDTH / 2 }}
                  />
                );
              })()}
              {/* Row lines */}
              {visibleTasks.map((_, i) => (
                <div
                  key={i}
                  className="absolute left-0 right-0 border-b border-[var(--color-border)]"
                  style={{ top: (i + 1) * ROW_HEIGHT }}
                />
              ))}
              {/* Task bars */}
              {visibleTasks.map((task, i) => {
                const pos = getTaskPosition(task);
                if (!pos) return null;
                return (
                  <div
                    key={task.id}
                    className="absolute group"
                    style={{
                      top: i * ROW_HEIGHT + 8,
                      left: pos.left,
                      width: pos.width,
                      height: ROW_HEIGHT - 16,
                    }}
                  >
                    {/* Resize handle - start */}
                    <div
                      className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 hover:bg-white/30"
                      onMouseDown={(e) => handleMouseDown(e, task.id, 'resize-start')}
                    />
                    {/* Bar */}
                    <div
                      className="h-full rounded cursor-move"
                      style={{
                        backgroundColor: statusColors[task.status],
                        opacity: 0.9,
                      }}
                      onMouseDown={(e) => handleMouseDown(e, task.id, 'move')}
                    >
                      <div
                        className="h-full rounded-l"
                        style={{
                          width: `${task.progress}%`,
                          backgroundColor: 'rgba(0,0,0,0.2)',
                        }}
                      />
                    </div>
                    {/* Resize handle - end */}
                    <div
                      className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 hover:bg-white/30"
                      onMouseDown={(e) => handleMouseDown(e, task.id, 'resize-end')}
                    />
                    {/* Label */}
                    {pos.width > 60 && (
                      <span className="absolute inset-0 flex items-center px-2 text-xs text-white truncate pointer-events-none">
                        {task.title}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

