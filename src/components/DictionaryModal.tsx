import { useState, useEffect } from 'react';
import './DictionaryModal.css';

interface DictionaryModalProps {
  initialData?: { title: string; description: string; target_language: string; native_language?: string; is_public?: boolean } | null;
  onClose: () => void;
  onSave: (data: { title: string; description: string; target_language: string; native_language: string; is_public: boolean }) => void;
}

const DictionaryModal = ({ initialData, onClose, onSave }: DictionaryModalProps) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetLanguage, setTargetLanguage] = useState('es');
  const [nativeLanguage, setNativeLanguage] = useState('en');
  const [isPublic, setIsPublic] = useState(false);

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title);
      setDescription(initialData.description);
      setTargetLanguage(initialData.target_language);
      setNativeLanguage(initialData.native_language || 'en');
      setIsPublic(initialData.is_public || false);
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ title, description, target_language: targetLanguage, native_language: nativeLanguage, is_public: isPublic });
  };

  return (
    <div className="modal-overlay">
      <div className="card modal-content">
        <div className="modal-header">
          <h2>{initialData ? 'Edit Dictionary' : 'Create New Dictionary'}</h2>
          <button type="button" onClick={onClose} className="close-btn">✖</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label>Title</label>
            <input 
              type="text" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              placeholder="e.g. Spanish Travel Phrases"
              required 
              autoFocus
            />
          </div>

          <div className="form-group">
            <label>Description (Optional)</label>
            <textarea 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
              placeholder="What is this dictionary about?"
              rows={3}
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Target Language (Learning)</label>
              <select 
                value={targetLanguage} 
                onChange={(e) => setTargetLanguage(e.target.value)}
                required
              >
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="cs">Czech</option>
                <option value="uk">Ukrainian</option>
                <option value="ru">Russian</option>
                <option value="en">English</option>
              </select>
            </div>

            <div className="form-group" style={{ flex: 1 }}>
              <label>Native Language (Translating To)</label>
              <select 
                value={nativeLanguage} 
                onChange={(e) => setNativeLanguage(e.target.value)}
                required
              >
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="cs">Czech</option>
                <option value="uk">Ukrainian</option>
                <option value="ru">Russian</option>
              </select>
            </div>
          </div>

          <div className="form-group checkbox-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 500 }}>
              <input 
                type="checkbox" 
                checked={isPublic} 
                onChange={(e) => setIsPublic(e.target.checked)}
                style={{ width: '1.2rem', height: '1.2rem' }}
              />
              Make this dictionary Public (Share to Library)
            </label>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem', paddingLeft: '1.7rem' }}>
              If public, other users will be able to see and clone this dictionary.
            </p>
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Save Dictionary</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DictionaryModal;
