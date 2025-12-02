import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { save } from '@tauri-apps/plugin-dialog';
import { writeTextFile } from '@tauri-apps/plugin-fs';
import { Modal, Button, Textarea } from './Modal';
import { Download, FileText } from './Icons';

interface ReportExportProps {
  isOpen: boolean;
  onClose: () => void;
  date: Date;
  reportContent: string;
  onRegenerateMemo: (memo: string) => Promise<string>;
}

export const ReportExport: React.FC<ReportExportProps> = ({
  isOpen,
  onClose,
  date,
  reportContent,
  onRegenerateMemo,
}) => {
  const [memo, setMemo] = useState('');
  const [preview, setPreview] = useState(reportContent);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setPreview(reportContent);
    setMemo('');
  }, [reportContent, isOpen]);

  const handleMemoChange = async (newMemo: string) => {
    setMemo(newMemo);
    const updatedReport = await onRegenerateMemo(newMemo);
    setPreview(updatedReport);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const defaultFileName = `日報_${format(date, 'yyyy-MM-dd')}.md`;
      
      const filePath = await save({
        defaultPath: defaultFileName,
        filters: [
          { name: 'Markdown', extensions: ['md'] },
          { name: 'Text', extensions: ['txt'] },
        ],
      });

      if (filePath) {
        await writeTextFile(filePath, preview);
        onClose();
      }
    } catch (error) {
      console.error('Failed to save file:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(preview);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`日報出力 - ${format(date, 'yyyy年M月d日', { locale: ja })}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            閉じる
          </Button>
          <Button variant="secondary" onClick={handleCopy}>
            {copied ? 'コピーしました' : 'クリップボードにコピー'}
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <span className="flex items-center gap-2">
              <Download size={16} />
              {saving ? '保存中...' : 'ファイルに保存'}
            </span>
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4 max-h-[60vh]">
        {/* Memo input */}
        <Textarea
          label="追加メモ（任意）"
          value={memo}
          onChange={(e) => handleMemoChange(e.target.value)}
          placeholder="日報に追加するメモがあれば入力してください..."
          rows={3}
        />

        {/* Preview */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-[var(--color-text-secondary)] flex items-center gap-2">
            <FileText size={16} />
            プレビュー
          </label>
          <div className="p-4 bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)] max-h-64 overflow-y-auto">
            <pre className="text-sm text-[var(--color-text-primary)] whitespace-pre-wrap font-mono">
              {preview}
            </pre>
          </div>
        </div>
      </div>
    </Modal>
  );
};

