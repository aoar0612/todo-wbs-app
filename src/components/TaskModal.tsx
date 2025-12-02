import React, { useState, useEffect } from 'react';
import { Modal, Input, Textarea, Button, Select } from './Modal';
import type { Task, TaskStatus } from '../types';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    description: string;
    status: TaskStatus;
    priority: number;
    start_date: string;
    end_date: string;
    progress: number;
  }) => void;
  task?: Task | null;
  parentId?: string | null;
}

const statusOptions = [
  { value: 'pending', label: '未着手' },
  { value: 'in_progress', label: '進行中' },
  { value: 'completed', label: '完了' },
  { value: 'cancelled', label: 'キャンセル' },
];

const priorityOptions = [
  { value: '0', label: '低' },
  { value: '1', label: '中' },
  { value: '2', label: '高' },
];

export const TaskModal: React.FC<TaskModalProps> = ({ isOpen, onClose, onSubmit, task, parentId }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>('pending');
  const [priority, setPriority] = useState(0);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setStatus(task.status);
      setPriority(task.priority);
      setStartDate(task.start_date || '');
      setEndDate(task.end_date || '');
      setProgress(task.progress);
    } else {
      setTitle('');
      setDescription('');
      setStatus('pending');
      setPriority(0);
      setStartDate('');
      setEndDate('');
      setProgress(0);
    }
  }, [task, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit({
      title: title.trim(),
      description: description.trim(),
      status,
      priority,
      start_date: startDate,
      end_date: endDate,
      progress,
    });
    onClose();
  };

  const isCreating = !task;
  const modalTitle = isCreating
    ? parentId
      ? 'サブタスク追加'
      : '新規タスク'
    : 'タスク編集';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={modalTitle}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            キャンセル
          </Button>
          <Button onClick={handleSubmit} disabled={!title.trim()}>
            {isCreating ? '作成' : '更新'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="タスク名"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="タスク名を入力"
          autoFocus
        />
        <Textarea
          label="説明"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="タスクの説明（任意）"
          rows={3}
        />
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="ステータス"
            value={status}
            onChange={(e) => setStatus(e.target.value as TaskStatus)}
            options={statusOptions}
          />
          <Select
            label="優先度"
            value={priority.toString()}
            onChange={(e) => setPriority(parseInt(e.target.value, 10))}
            options={priorityOptions}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="開始日"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <Input
            label="終了日"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
        {!isCreating && (
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--color-text-secondary)]">
              進捗: {progress}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={progress}
              onChange={(e) => setProgress(parseInt(e.target.value, 10))}
              className="w-full h-2 accent-[var(--color-accent)]"
            />
          </div>
        )}
      </form>
    </Modal>
  );
};

