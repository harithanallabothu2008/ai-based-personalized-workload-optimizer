import React, { useState } from 'react';
import { 
  FileUp, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  Sparkles, 
  Clock, 
  Calendar,
  Save,
  RotateCcw,
  RefreshCw,
  ArrowRight
} from 'lucide-react';
import { api } from '../services/api';
import AlertBanner from '../components/AlertBanner';

export default function UploadDocumentPage({ setCurrentPage, setSelectedAssignmentId, showNotification }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [extracting, setExtracting] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Editable confirmation form state
  const [confirmForm, setConfirmForm] = useState({
    title: '',
    subject: '',
    deadlineDate: '',
    deadlineTime: '23:59',
    hasNoDeadline: false,
    priority: 'Medium',
    difficulty: 'Medium',
    estimatedDuration: 4.0,
    instructions: '',
    deliverables: '',
  });

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      validateAndSetFile(file);
    }
  };

  const validateAndSetFile = (file) => {
    const validExtensions = ['.pdf', '.docx'];
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!validExtensions.includes(ext)) {
      setError(`Invalid file format '${ext}'. Please upload a .pdf or .docx document.`);
      setSelectedFile(null);
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setError('File exceeds maximum 15MB limit.');
      setSelectedFile(null);
      return;
    }
    setError(null);
    setSelectedFile(file);
    setExtractedData(null);
  };

  const handleUploadAndExtract = async () => {
    if (!selectedFile) return;
    setExtracting(true);
    setError(null);
    try {
      const data = await api.uploadDocument(selectedFile);
      setExtractedData(data);

      let dDate = '';
      let dTime = '23:59';
      if (data.deadline) {
        const d = new Date(data.deadline);
        dDate = d.toISOString().split('T')[0];
      }

      setConfirmForm({
        title: data.title || '',
        subject: data.subject || '',
        deadlineDate: dDate,
        deadlineTime: dTime,
        hasNoDeadline: !data.has_detected_deadline,
        priority: data.suggested_priority || 'Medium',
        difficulty: data.suggested_difficulty || 'Medium',
        estimatedDuration: data.suggested_estimated_hours || 4.0,
        instructions: data.instructions || '',
        deliverables: (data.deliverables || []).join('\n'),
      });

      showNotification('success', `Extracted document text via ${data.extraction_source}! Review and confirm details below.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setExtracting(false);
    }
  };

  const handleConfirmAndSave = async (e) => {
    e.preventDefault();
    if (!confirmForm.title.trim() || !confirmForm.subject.trim()) {
      setError('Title and Subject are required fields.');
      return;
    }

    let deadlineIso = null;
    if (!confirmForm.hasNoDeadline && confirmForm.deadlineDate) {
      deadlineIso = new Date(`${confirmForm.deadlineDate}T${confirmForm.deadlineTime || '23:59'}:00`).toISOString();
    }

    const payload = {
      title: confirmForm.title.trim(),
      subject: confirmForm.subject.trim(),
      description: confirmForm.deliverables ? `Deliverables:\n${confirmForm.deliverables}` : null,
      instructions: confirmForm.instructions.trim() || null,
      deadline: deadlineIso,
      has_no_deadline: confirmForm.hasNoDeadline,
      priority: confirmForm.priority,
      difficulty: confirmForm.difficulty,
      estimated_duration: parseFloat(confirmForm.estimatedDuration),
      completion_status: 'Pending',
      document_filename: extractedData?.document_filename || selectedFile?.name || null,
      document_path: extractedData?.document_path || null
    };

    setSaving(true);
    try {
      const created = await api.createAssignment(payload);
      showNotification('success', `Assignment '${created.title}' successfully verified and saved to SQLite!`);
      setSelectedAssignmentId(created.id);
      // Offer next step: decompose tasks
      setCurrentPage('tasks');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '960px', margin: '0 auto' }}>
      {error && <AlertBanner type="error" message={error} onClose={() => setError(null)} />}

      {/* Upload Zone Card */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FileUp size={20} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#0f172a' }}>Document Upload & Information Extraction</h3>
            <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
              Upload assignment sheets, syllabi, or lab manuals (PDF or DOCX). Text will be parsed using PyMuPDF or python-docx.
            </p>
          </div>
        </div>

        {/* Drag Drop Box */}
        <div 
          style={{
            border: '2px dashed #cbd5e1',
            borderRadius: '12px',
            padding: '36px 20px',
            textAlign: 'center',
            background: selectedFile ? '#f0fdf4' : '#f8fafc',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            marginTop: '16px'
          }}
          onClick={() => document.getElementById('doc-file-input').click()}
        >
          <input 
            type="file"
            id="doc-file-input"
            accept=".pdf,.docx"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />

          <FileText size={40} style={{ color: selectedFile ? '#16a34a' : '#94a3b8', margin: '0 auto 12px auto' }} />

          {selectedFile ? (
            <div>
              <p style={{ fontSize: '0.95rem', fontWeight: '700', color: '#15803d' }}>
                {selectedFile.name}
              </p>
              <p style={{ fontSize: '0.78rem', color: '#4b5563' }}>
                {(selectedFile.size / 1024).toFixed(1)} KB • Ready to extract
              </p>
            </div>
          ) : (
            <div>
              <p style={{ fontSize: '0.95rem', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                Click to browse or drop an assignment file here
              </p>
              <p style={{ fontSize: '0.78rem', color: '#64748b' }}>
                Supports standard PDF and DOCX documents (up to 15MB)
              </p>
            </div>
          )}
        </div>

        {selectedFile && !extractedData && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
            <button 
              onClick={handleUploadAndExtract}
              disabled={extracting}
              className="btn btn-primary btn-sm"
            >
              {extracting ? <RefreshCw size={15} className="spin" /> : <Sparkles size={15} />}
              <span>{extracting ? 'Extracting text with PyMuPDF/python-docx...' : 'Extract Assignment Info'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Extracted Details & Editable Confirmation Form */}
      {extractedData && (
        <div className="card" style={{ border: '2px solid #3b82f6' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="badge badge-info">
                Parsed by {extractedData.extraction_source}
              </span>
              <span className="badge badge-success">
                Extraction Complete
              </span>
            </div>
            <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
              Review extracted fields before confirming save to SQLite database.
            </p>
          </div>

          {/* Raw Snippet preview */}
          <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
              Extracted Document Excerpt
            </p>
            <p style={{ fontSize: '0.8rem', color: '#334155', fontFamily: 'var(--font-mono)', whiteSpace: 'pre-line' }}>
              {extractedData.raw_snippet}
            </p>
          </div>

          <form onSubmit={handleConfirmAndSave}>
            <div className="form-group">
              <label className="form-label">Identified Assignment Title *</label>
              <input 
                type="text"
                required
                value={confirmForm.title}
                onChange={(e) => setConfirmForm({ ...confirmForm, title: e.target.value })}
                className="form-control"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Identified Course / Subject *</label>
                <input 
                  type="text"
                  required
                  value={confirmForm.subject}
                  onChange={(e) => setConfirmForm({ ...confirmForm, subject: e.target.value })}
                  className="form-control"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Estimated Hours</label>
                <input 
                  type="number"
                  step="0.5"
                  min="0.5"
                  value={confirmForm.estimatedDuration}
                  onChange={(e) => setConfirmForm({ ...confirmForm, estimatedDuration: e.target.value })}
                  className="form-control"
                />
              </div>
            </div>

            {/* Deadline selection */}
            <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <label className="form-label" style={{ margin: 0 }}>
                  Submission Deadline {extractedData.has_detected_deadline ? '(Detected in file)' : '(None detected in text)'}
                </label>
                <label style={{ fontSize: '0.8rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                  <input 
                    type="checkbox"
                    checked={confirmForm.hasNoDeadline}
                    onChange={(e) => setConfirmForm({ ...confirmForm, hasNoDeadline: e.target.checked })}
                  />
                  <span>No deadline</span>
                </label>
              </div>

              {!confirmForm.hasNoDeadline && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <input 
                    type="date"
                    required={!confirmForm.hasNoDeadline}
                    value={confirmForm.deadlineDate}
                    onChange={(e) => setConfirmForm({ ...confirmForm, deadlineDate: e.target.value })}
                    className="form-control"
                  />
                  <input 
                    type="time"
                    value={confirmForm.deadlineTime}
                    onChange={(e) => setConfirmForm({ ...confirmForm, deadlineTime: e.target.value })}
                    className="form-control"
                  />
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Priority</label>
                <select 
                  value={confirmForm.priority}
                  onChange={(e) => setConfirmForm({ ...confirmForm, priority: e.target.value })}
                  className="form-control"
                >
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Difficulty</label>
                <select 
                  value={confirmForm.difficulty}
                  onChange={(e) => setConfirmForm({ ...confirmForm, difficulty: e.target.value })}
                  className="form-control"
                >
                  <option value="Hard">Hard</option>
                  <option value="Medium">Medium</option>
                  <option value="Easy">Easy</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Instructions Extracted</label>
              <textarea 
                rows="3"
                value={confirmForm.instructions}
                onChange={(e) => setConfirmForm({ ...confirmForm, instructions: e.target.value })}
                className="form-control"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Identified Deliverables</label>
              <textarea 
                rows="3"
                placeholder="List of deliverables extracted from bullet points..."
                value={confirmForm.deliverables}
                onChange={(e) => setConfirmForm({ ...confirmForm, deliverables: e.target.value })}
                className="form-control"
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
              <button 
                type="button" 
                onClick={() => setExtractedData(null)}
                className="btn btn-secondary btn-sm"
              >
                <RotateCcw size={14} />
                <span>Discard & Re-upload</span>
              </button>
              <button 
                type="submit" 
                disabled={saving}
                className="btn btn-primary btn-sm"
              >
                {saving ? <RefreshCw size={14} className="spin" /> : <Save size={14} />}
                <span>{saving ? 'Saving...' : 'Confirm & Save Assignment'}</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
