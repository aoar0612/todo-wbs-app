import React, { useState } from 'react';
import { format, addDays, subDays } from 'date-fns';
import { ja } from 'date-fns/locale';
import type { DailyTodoWithTask } from '../lib/api';
import { Plus, Trash, Check, FileText, Calendar } from './Icons';

interface DailyTodosProps {
  todos: DailyTodoWithTask[];
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  onCreateTodo: (title: string) => void;
  onToggleTodo: (id: string) => void;
  onDeleteTodo: (id: string) => void;
  onUpdateMemo: (id: string, memo: string) => void;
  onExportReport: () => void;
}

export const DailyTodos: React.FC<DailyTodosProps> = ({
  todos,
  selectedDate,
  onDateChange,
  onCreateTodo,
  onToggleTodo,
  onDeleteTodo,
  onUpdateMemo,
  onExportReport,
}) => {
  const [newTodoTitle, setNewTodoTitle] = useState('');
  const [editingMemoId, setEditingMemoId] = useState<string | null>(null);
  const [memoText, setMemoText] = useState('');

  const completedTodos = todos.filter((t) => t.completed);
  const incompleteTodos = todos.filter((t) => !t.completed);

  const handleSubmitTodo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodoTitle.trim()) return;
    onCreateTodo(newTodoTitle.trim());
    setNewTodoTitle('');
  };

  const handleStartEditMemo = (todo: DailyTodoWithTask) => {
    setEditingMemoId(todo.id);
    setMemoText(todo.memo || '');
  };

  const handleSaveMemo = () => {
    if (editingMemoId) {
      onUpdateMemo(editingMemoId, memoText);
      setEditingMemoId(null);
      setMemoText('');
    }
  };

  const isToday = format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-4">
          <button
            onClick={() => onDateChange(subDays(selectedDate, 1))}
            className="p-2 rounded-md hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)]"
          >
            ←
          </button>
          <div className="flex items-center gap-2">
            <Calendar size={20} className="text-[var(--color-accent)]" />
            <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">
              {format(selectedDate, 'yyyy年M月d日 (E)', { locale: ja })}
            </h2>
            {isToday && (
              <span className="px-2 py-0.5 text-xs bg-[var(--color-accent)] text-white rounded-full">
                今日
              </span>
            )}
          </div>
          <button
            onClick={() => onDateChange(addDays(selectedDate, 1))}
            className="p-2 rounded-md hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)]"
          >
            →
          </button>
        </div>
        <div className="flex items-center gap-2">
          {!isToday && (
            <button
              onClick={() => onDateChange(new Date())}
              className="px-3 py-1.5 text-sm text-[var(--color-accent)] hover:bg-[var(--color-bg-tertiary)] rounded-md"
            >
              今日へ戻る
            </button>
          )}
          <button
            onClick={onExportReport}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--color-accent)] text-white rounded-md text-sm hover:bg-[var(--color-accent-hover)] transition-colors"
          >
            <FileText size={16} />
            日報出力
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-2xl mx-auto">
          {/* Add new todo */}
          <form onSubmit={handleSubmitTodo} className="mb-6">
            <div className="flex items-center gap-2 p-3 bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)]">
              <Plus size={18} className="text-[var(--color-text-tertiary)]" />
              <input
                type="text"
                value={newTodoTitle}
                onChange={(e) => setNewTodoTitle(e.target.value)}
                placeholder="新しいTODOを追加..."
                className="flex-1 bg-transparent text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] outline-none text-sm"
              />
              <button
                type="submit"
                disabled={!newTodoTitle.trim()}
                className="px-3 py-1 bg-[var(--color-accent)] text-white rounded text-sm disabled:opacity-50"
              >
                追加
              </button>
            </div>
          </form>

          {/* Stats */}
          <div className="flex items-center gap-4 mb-6 text-sm">
            <span className="text-[var(--color-text-secondary)]">
              合計: <strong className="text-[var(--color-text-primary)]">{todos.length}</strong>件
            </span>
            <span className="text-[var(--color-success)]">
              完了: <strong>{completedTodos.length}</strong>件
            </span>
            <span className="text-[var(--color-warning)]">
              未完了: <strong>{incompleteTodos.length}</strong>件
            </span>
          </div>

          {/* Incomplete todos */}
          {incompleteTodos.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-[var(--color-text-tertiary)] uppercase tracking-wider mb-3">
                未完了
              </h3>
              <div className="space-y-2">
                {incompleteTodos.map((todo) => (
                  <TodoItem
                    key={todo.id}
                    todo={todo}
                    onToggle={() => onToggleTodo(todo.id)}
                    onDelete={() => onDeleteTodo(todo.id)}
                    onEditMemo={() => handleStartEditMemo(todo)}
                    editingMemoId={editingMemoId}
                    memoText={memoText}
                    onMemoChange={setMemoText}
                    onSaveMemo={handleSaveMemo}
                    onCancelMemo={() => setEditingMemoId(null)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Completed todos */}
          {completedTodos.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-[var(--color-text-tertiary)] uppercase tracking-wider mb-3">
                完了済み
              </h3>
              <div className="space-y-2 opacity-60">
                {completedTodos.map((todo) => (
                  <TodoItem
                    key={todo.id}
                    todo={todo}
                    onToggle={() => onToggleTodo(todo.id)}
                    onDelete={() => onDeleteTodo(todo.id)}
                    onEditMemo={() => handleStartEditMemo(todo)}
                    editingMemoId={editingMemoId}
                    memoText={memoText}
                    onMemoChange={setMemoText}
                    onSaveMemo={handleSaveMemo}
                    onCancelMemo={() => setEditingMemoId(null)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {todos.length === 0 && (
            <div className="text-center py-12">
              <p className="text-[var(--color-text-tertiary)] mb-4">
                この日のTODOはまだありません
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface TodoItemProps {
  todo: DailyTodoWithTask;
  onToggle: () => void;
  onDelete: () => void;
  onEditMemo: () => void;
  editingMemoId: string | null;
  memoText: string;
  onMemoChange: (text: string) => void;
  onSaveMemo: () => void;
  onCancelMemo: () => void;
}

const TodoItem: React.FC<TodoItemProps> = ({
  todo,
  onToggle,
  onDelete,
  onEditMemo,
  editingMemoId,
  memoText,
  onMemoChange,
  onSaveMemo,
  onCancelMemo,
}) => {
  const isEditing = editingMemoId === todo.id;

  return (
    <div className="group bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-lg p-3 hover:border-[var(--color-accent)]/30 transition-colors">
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <button
          onClick={onToggle}
          className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
            todo.completed
              ? 'bg-[var(--color-success)] border-[var(--color-success)] text-white'
              : 'border-[var(--color-border)] hover:border-[var(--color-accent)]'
          }`}
        >
          {todo.completed && <Check size={12} />}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={`text-sm ${
                todo.completed
                  ? 'text-[var(--color-text-tertiary)] line-through'
                  : 'text-[var(--color-text-primary)]'
              }`}
            >
              {todo.title}
            </span>
            {todo.project_name && (
              <span className="px-2 py-0.5 text-xs bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] rounded">
                {todo.project_name}
              </span>
            )}
          </div>

          {/* Memo */}
          {isEditing ? (
            <div className="mt-2">
              <textarea
                value={memoText}
                onChange={(e) => onMemoChange(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-md text-[var(--color-text-primary)] resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                rows={2}
                placeholder="メモを入力..."
                autoFocus
              />
              <div className="flex items-center gap-2 mt-2">
                <button
                  onClick={onSaveMemo}
                  className="px-3 py-1 text-xs bg-[var(--color-accent)] text-white rounded"
                >
                  保存
                </button>
                <button
                  onClick={onCancelMemo}
                  className="px-3 py-1 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] rounded"
                >
                  キャンセル
                </button>
              </div>
            </div>
          ) : (
            todo.memo && (
              <p className="mt-1 text-xs text-[var(--color-text-secondary)]">{todo.memo}</p>
            )
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onEditMemo}
            className="p-1 rounded text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-tertiary)]"
            title="メモを編集"
          >
            <FileText size={14} />
          </button>
          <button
            onClick={onDelete}
            className="p-1 rounded text-[var(--color-text-tertiary)] hover:bg-[var(--color-danger)] hover:text-white"
            title="削除"
          >
            <Trash size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

