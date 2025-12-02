import React, { useState } from 'react';
import type { Project, ViewType } from '../types';
import { Folder, ListTodo, BarChart, Calendar, Plus, ChevronDown, ChevronRight, Trash } from './Icons';

interface SidebarProps {
  projects: Project[];
  selectedProjectId: string | null;
  currentView: ViewType;
  onSelectProject: (id: string | null) => void;
  onSelectView: (view: ViewType) => void;
  onCreateProject: () => void;
  onDeleteProject: (id: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  projects,
  selectedProjectId,
  currentView,
  onSelectProject,
  onSelectView,
  onCreateProject,
  onDeleteProject,
}) => {
  const [projectsExpanded, setProjectsExpanded] = useState(true);

  const navItems: { view: ViewType; label: string; icon: React.ReactNode }[] = [
    { view: 'today', label: '今日のTODO', icon: <ListTodo size={18} /> },
    { view: 'wbs', label: 'WBS', icon: <Folder size={18} /> },
    { view: 'gantt', label: 'ガントチャート', icon: <BarChart size={18} /> },
    { view: 'calendar', label: 'カレンダー', icon: <Calendar size={18} /> },
  ];

  return (
    <aside className="w-60 h-full bg-[var(--color-bg-secondary)] border-r border-[var(--color-border)] flex flex-col">
      {/* App title */}
      <div className="p-4 border-b border-[var(--color-border)]">
        <h1 className="text-lg font-semibold text-[var(--color-text-primary)]">TODO-WBS</h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-2">
        {/* View navigation */}
        <div className="mb-4">
          {navItems.map((item) => (
            <button
              key={item.view}
              onClick={() => onSelectView(item.view)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                currentView === item.view
                  ? 'bg-[var(--color-accent)] text-white'
                  : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)]'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>

        {/* Projects section */}
        <div className="border-t border-[var(--color-border)] pt-2">
          <button
            onClick={() => setProjectsExpanded(!projectsExpanded)}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-[var(--color-text-tertiary)] uppercase tracking-wider hover:text-[var(--color-text-secondary)]"
          >
            <span className="flex items-center gap-1">
              {projectsExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              プロジェクト
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCreateProject();
              }}
              className="p-1 rounded hover:bg-[var(--color-bg-tertiary)]"
            >
              <Plus size={14} />
            </button>
          </button>

          {projectsExpanded && (
            <div className="mt-1">
              {projects.length === 0 ? (
                <p className="px-3 py-2 text-xs text-[var(--color-text-tertiary)]">
                  プロジェクトがありません
                </p>
              ) : (
                projects.map((project) => (
                  <div
                    key={project.id}
                    className={`group flex items-center justify-between px-3 py-2 rounded-md text-sm cursor-pointer transition-colors ${
                      selectedProjectId === project.id
                        ? 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)]'
                        : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)]'
                    }`}
                    onClick={() => onSelectProject(project.id)}
                  >
                    <span className="flex items-center gap-2 truncate">
                      <Folder size={16} />
                      <span className="truncate">{project.name}</span>
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteProject(project.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-[var(--color-danger)] hover:text-white transition-opacity"
                    >
                      <Trash size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </nav>
    </aside>
  );
};

