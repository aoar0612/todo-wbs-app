import React, { useState, useEffect } from 'react';
import { Modal, Input, Textarea, Button } from './Modal';
import type { Project } from '../types';

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; description: string; start_date: string; end_date: string }) => void;
  project?: Project | null;
}

export const ProjectModal: React.FC<ProjectModalProps> = ({ isOpen, onClose, onSubmit, project }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    if (project) {
      setName(project.name);
      setDescription(project.description || '');
      setStartDate(project.start_date || '');
      setEndDate(project.end_date || '');
    } else {
      setName('');
      setDescription('');
      setStartDate('');
      setEndDate('');
    }
  }, [project, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({
      name: name.trim(),
      description: description.trim(),
      start_date: startDate,
      end_date: endDate,
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={project ? 'プロジェクト編集' : '新規プロジェクト'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            キャンセル
          </Button>
          <Button onClick={handleSubmit} disabled={!name.trim()}>
            {project ? '更新' : '作成'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="プロジェクト名"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="プロジェクト名を入力"
          autoFocus
        />
        <Textarea
          label="説明"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="プロジェクトの説明（任意）"
          rows={3}
        />
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
      </form>
    </Modal>
  );
};

