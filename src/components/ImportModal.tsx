import { useState, useRef } from 'react';
import { parseFileContent } from '../utils/importParser';
import type { ParsedWord } from '../utils/importParser';
import './ImportModal.css';

interface ImportModalProps {
  onClose: () => void;
  onImport: (words: ParsedWord[]) => Promise<void>;
}

const ImportModal = ({ onClose, onImport }: ImportModalProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [parsedWords, setParsedWords] = useState<ParsedWord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    setError(null);
    setParsedWords([]);

    if (!selectedFile) return;

    setFile(selectedFile);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const result = parseFileContent(text, selectedFile.name);
        if (result.length === 0) {
          setError('No valid words found in this file. Please check the format.');
        } else {
          setParsedWords(result);
        }
      } catch (err: any) {
        setError(err.message);
      }
    };
    reader.onerror = () => setError('Failed to read file');
    reader.readAsText(selectedFile);
  };

  const handleImport = async () => {
    if (parsedWords.length === 0) return;
    setIsImporting(true);
    await onImport(parsedWords);
    setIsImporting(false);
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="card modal-content import-modal">
        <div className="modal-header">
          <h2>Bulk Import Words</h2>
          <button onClick={onClose} className="close-btn" disabled={isImporting}>✖</button>
        </div>

        <div className="import-body">
          <p className="import-instructions">
            Upload a <strong>.csv</strong> or <strong>.txt</strong> file to instantly add multiple words.
            <br/>For TXT files, use a tab, hyphen (-), or equals (=) to separate the Term and Definition.
          </p>

          <div 
            className="file-drop-area" 
            onClick={() => fileInputRef.current?.click()}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept=".csv,.txt" 
              hidden 
            />
            {file ? (
              <div className="file-selected">📄 {file.name}</div>
            ) : (
              <div className="file-placeholder">Click to select a file</div>
            )}
          </div>

          {error && <div className="import-error">{error}</div>}

          {parsedWords.length > 0 && (
            <div className="import-preview">
              <h3>Preview ({parsedWords.length} words found)</h3>
              <div className="preview-list">
                {parsedWords.slice(0, 5).map((w, i) => (
                  <div key={i} className="preview-item">
                    <strong>{w.term}</strong> &rarr; {w.definition}
                  </div>
                ))}
                {parsedWords.length > 5 && (
                  <div className="preview-item text-secondary">
                    ...and {parsedWords.length - 5} more.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" onClick={onClose} className="btn-secondary" disabled={isImporting}>Cancel</button>
          <button 
            onClick={handleImport} 
            className="btn-primary" 
            disabled={parsedWords.length === 0 || isImporting}
          >
            {isImporting ? 'Importing...' : `Import ${parsedWords.length} Words`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImportModal;
