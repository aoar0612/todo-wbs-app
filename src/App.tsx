import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import type { Project, Task, ViewType, TaskStatus } from './types';
import { projectApi, taskApi, todoApi, reportApi, type DailyTodoWithTask } from './lib/api';
import { Sidebar } from './components/Sidebar';
import { WbsTree } from './components/WbsTree';
import { GanttChart } from './components/GanttChart';
import { DailyTodos } from './components/DailyTodos';
import { ProjectModal } from './components/ProjectModal';
import { TaskModal } from './components/TaskModal';
import { ReportExport } from './components/ReportExport';

function App() {
  // State
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentView, setCurrentView] = useState<ViewType>('today');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dailyTodos, setDailyTodos] = useState<DailyTodoWithTask[]>([]);

  // Modal state
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [parentTaskId, setParentTaskId] = useState<string | null>(null);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportContent, setReportContent] = useState('');

  // Load projects
  const loadProjects = useCallback(async () => {
    try {
      const data = await projectApi.getAll();
      setProjects(data);
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  }, []);

  // Load tasks for selected project
  const loadTasks = useCallback(async () => {
    if (!selectedProjectId) {
      setTasks([]);
      return;
    }
    try {
      const data = await taskApi.getByProject(selectedProjectId);
      setTasks(data);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    }
  }, [selectedProjectId]);

  // Load daily todos
  const loadDailyTodos = useCallback(async () => {
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const data = await todoApi.getByDate(dateStr);
      setDailyTodos(data);
    } catch (error) {
      console.error('Failed to load todos:', error);
    }
  }, [selectedDate]);

  // Effects
  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    loadDailyTodos();
  }, [loadDailyTodos]);

  // Project handlers
  const handleCreateProject = async (data: { name: string; description: string; start_date: string; end_date: string }) => {
    try {
      const project = await projectApi.create(data);
      setProjects((prev) => [project, ...prev]);
      setSelectedProjectId(project.id);
    } catch (error) {
      console.error('Failed to create project:', error);
    }
  };

  const handleDeleteProject = async (id: string) => {
    if (!confirm('このプロジェクトを削除しますか？')) return;
    try {
      await projectApi.delete(id);
      setProjects((prev) => prev.filter((p) => p.id !== id));
      if (selectedProjectId === id) {
        setSelectedProjectId(null);
      }
    } catch (error) {
      console.error('Failed to delete project:', error);
    }
  };

  // Task handlers
  const handleCreateTask = async (data: {
    title: string;
    description: string;
    status: TaskStatus;
    priority: number;
    start_date: string;
    end_date: string;
    progress: number;
  }) => {
    if (!selectedProjectId) return;
    try {
      const task = await taskApi.create({
        project_id: selectedProjectId,
        parent_id: parentTaskId || undefined,
        title: data.title,
        description: data.description || undefined,
        status: data.status,
        priority: data.priority,
        start_date: data.start_date || undefined,
        end_date: data.end_date || undefined,
      });
      setTasks((prev) => [...prev, task]);
    } catch (error) {
      console.error('Failed to create task:', error);
    }
  };

  const handleUpdateTask = async (task: Task) => {
    try {
      await taskApi.update(task.id, {
        title: task.title,
        description: task.description || undefined,
        status: task.status,
        priority: task.priority,
        start_date: task.start_date || undefined,
        end_date: task.end_date || undefined,
        progress: task.progress,
      });
      setTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)));
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  };

  const handleEditTaskSubmit = async (data: {
    title: string;
    description: string;
    status: TaskStatus;
    priority: number;
    start_date: string;
    end_date: string;
    progress: number;
  }) => {
    if (editingTask) {
      const updatedTask: Task = {
        ...editingTask,
        ...data,
      };
      await handleUpdateTask(updatedTask);
    } else {
      await handleCreateTask(data);
    }
    setEditingTask(null);
    setParentTaskId(null);
  };

  const handleDeleteTask = async (id: string) => {
    if (!confirm('このタスクを削除しますか？')) return;
    try {
      await taskApi.delete(id);
      setTasks((prev) => prev.filter((t) => t.id !== id));
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  const handleUpdateTaskDates = async (taskId: string, startDate: string | null, endDate: string | null) => {
    try {
      await taskApi.updateDates(taskId, startDate, endDate);
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId ? { ...t, start_date: startDate, end_date: endDate } : t
        )
      );
    } catch (error) {
      console.error('Failed to update task dates:', error);
    }
  };

  const handleAddTaskToToday = async (task: Task) => {
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      await todoApi.addFromTask(task.id, dateStr);
      await loadDailyTodos();
    } catch (error) {
      console.error('Failed to add task to today:', error);
    }
  };

  // Daily todo handlers
  const handleCreateTodo = async (title: string) => {
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      await todoApi.create({ title, date: dateStr });
      await loadDailyTodos();
    } catch (error) {
      console.error('Failed to create todo:', error);
    }
  };

  const handleToggleTodo = async (id: string) => {
    try {
      await todoApi.toggle(id);
      await loadDailyTodos();
    } catch (error) {
      console.error('Failed to toggle todo:', error);
    }
  };

  const handleDeleteTodo = async (id: string) => {
    try {
      await todoApi.delete(id);
      await loadDailyTodos();
    } catch (error) {
      console.error('Failed to delete todo:', error);
    }
  };

  const handleUpdateTodoMemo = async (id: string, memo: string) => {
    try {
      await todoApi.updateMemo(id, memo || null);
      await loadDailyTodos();
    } catch (error) {
      console.error('Failed to update memo:', error);
    }
  };

  // Report handlers
  const handleOpenReport = async () => {
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const content = await reportApi.generate(dateStr, '');
      setReportContent(content);
      setReportModalOpen(true);
    } catch (error) {
      console.error('Failed to generate report:', error);
    }
  };

  const handleRegenerateMemo = async (memo: string): Promise<string> => {
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const content = await reportApi.generate(dateStr, memo);
      setReportContent(content);
      return content;
    } catch (error) {
      console.error('Failed to regenerate report:', error);
      return reportContent;
    }
  };

  // Get selected project
  const selectedProject = projects.find((p) => p.id === selectedProjectId) || null;

  // Render view
  const renderView = () => {
    switch (currentView) {
      case 'wbs':
        return (
          <WbsTree
            project={selectedProject}
            tasks={tasks}
            onCreateTask={(parentId) => {
              setEditingTask(null);
              setParentTaskId(parentId);
              setTaskModalOpen(true);
            }}
            onUpdateTask={handleUpdateTask}
            onDeleteTask={handleDeleteTask}
            onEditTask={(task) => {
              setEditingTask(task);
              setParentTaskId(task.parent_id);
              setTaskModalOpen(true);
            }}
            onAddToToday={handleAddTaskToToday}
          />
        );
      case 'gantt':
        return (
          <GanttChart
            project={selectedProject}
            tasks={tasks}
            onUpdateTaskDates={handleUpdateTaskDates}
          />
        );
      case 'today':
      default:
        return (
          <DailyTodos
            todos={dailyTodos}
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            onCreateTodo={handleCreateTodo}
            onToggleTodo={handleToggleTodo}
            onDeleteTodo={handleDeleteTodo}
            onUpdateMemo={handleUpdateTodoMemo}
            onExportReport={handleOpenReport}
          />
        );
    }
  };

  return (
    <div className="flex h-screen bg-[var(--color-bg-primary)]">
      {/* Sidebar */}
      <Sidebar
        projects={projects}
        selectedProjectId={selectedProjectId}
        currentView={currentView}
        onSelectProject={setSelectedProjectId}
        onSelectView={setCurrentView}
        onCreateProject={() => {
          setEditingProject(null);
          setProjectModalOpen(true);
        }}
        onDeleteProject={handleDeleteProject}
      />

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {renderView()}
    </main>

      {/* Modals */}
      <ProjectModal
        isOpen={projectModalOpen}
        onClose={() => setProjectModalOpen(false)}
        onSubmit={handleCreateProject}
        project={editingProject}
      />

      <TaskModal
        isOpen={taskModalOpen}
        onClose={() => {
          setTaskModalOpen(false);
          setEditingTask(null);
          setParentTaskId(null);
        }}
        onSubmit={handleEditTaskSubmit}
        task={editingTask}
        parentId={parentTaskId}
      />

      <ReportExport
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        date={selectedDate}
        reportContent={reportContent}
        onRegenerateMemo={handleRegenerateMemo}
      />
    </div>
  );
}

export default App;
