import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Edit3, 
  Trash2, 
  CheckSquare, 
  Clock, 
  AlertCircle,
  FileText,
  Calendar,
  X,
  RefreshCw
} from 'lucide-react';
import { api } from '../services/api';
import ConfirmModal from '../components/ConfirmModal';
import AlertBanner from '../components/AlertBanner';

export default function AssignmentsPage({ setCurrentPage, setSelectedAssignmentId, showNotification }) {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSubject, setFilterSubject] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [deletingAssignment, setDeletingAssignment] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    subject: '',
    description: '',
    instructions: '',
    deadlineDate: '',
    deadlineTime: '23:59',
    hasNoDeadline: false,
    priority: 'Medium',
    difficulty: 'Medium',
    estimatedDuration: 4.0,
    completionStatus: 'Pending',
  });
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchAssignments = async () => {
    setLoading(true);
    try {
      const data = await api.getAssignments();
      setAssignments(data);
    } catch (err) {
      showNotification('error', `Failed to load assignments: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  const resetForm = () => {
    setFormData({
      title: '',
      subject: '',
      description: '',
      instructions: '',
      deadlineDate: '',
      deadlineTime: '23:59',
      hasNoDeadline: false,
      priority: 'Medium',
      difficulty: 'Medium',
      estimatedDuration: 4.0,
      completionStatus: 'Pending',
    });
    setFormError(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (assignment) => {
    let dDate = '';
    let dTime = '23:59';
    if (assignment.deadline) {
      const d = new Date(assignment.deadline);
      dDate = d.toISOString().split('T')[0];
      const hours = String(d.getHours()).padStart(2, '0');
      const mins = String(d.getMinutes()).padStart(2, '0');
      dTime = `${hours}:${mins}`;
    }

    setFormData({
      title: assignment.title,
      subject: assignment.subject,
      description: assignment.description || '',
      instructions: assignment.instructions || '',
      deadlineDate: dDate,
      deadlineTime: dTime,
      hasNoDeadline: assignment.has_no_deadline || false,
      priority: assignment.priority,
      difficulty: assignment.difficulty,
      estimatedDuration: assignment.estimated_duration,
      completionStatus: assignment.completion_status,
    });
    setEditingAssignment(assignment);
    setFormError(null);
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    setFormError(null);

    // Validation
    if (!formData.title.trim()) {
      setFormError('Assignment title is required.');
      return;
    }
    if (!formData.subject.trim()) {
      setFormError('Subject is required.');
      return;
    }
    if (!formData.hasNoDeadline && !formData.deadlineDate) {
      setFormError('Please select a deadline date or confirm that no deadline is set.');
      return;
    }
    if (formData.estimatedDuration <= 0) {
      setFormError('Estimated duration must be greater than 0.');
      return;
    }

    let deadlineIso = null;
    if (!formData.hasNoDeadline && formData.deadlineDate) {
      deadlineIso = new Date(`${formData.deadlineDate}T${formData.deadlineTime || '23:59'}:00`).toISOString();
    }

    const payload = {
      title: formData.title.trim(),
      subject: formData.subject.trim(),
      description: formData.description.trim() || null,
      instructions: formData.instructions.trim() || null,
      deadline: deadlineIso,
      has_no_deadline: formData.hasNoDeadline,
      priority: formData.priority,
      difficulty: formData.difficulty,
      estimated_duration: parseFloat(formData.estimatedDuration),
      completion_status: formData.completionStatus,
    };

    setSubmitting(true);
    try {
      if (editingAssignment) {
        await api.updateAssignment(editingAssignment.id, payload);
        showNotification('success', `Assignment '${payload.title}' updated successfully.`);
        setEditingAssignment(null);
      } else {
        await api.createAssignment(payload);
        showNotification('success', `Assignment '${payload.title}' created and saved in SQLite.`);
        setIsCreateOpen(false);
      }
      resetForm();
      fetchAssignments();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingAssignment) return;
    try {
      await api.deleteAssignment(deletingAssignment.id);
      showNotification('success', `Assignment deleted.`);
      setDeletingAssignment(null);
      fetchAssignments();
    } catch (err) {
      showNotification('error', `Failed to delete: ${err.message}`);
    }
  };

  const subjects = ['ALL', ...new Set(assignments.map(a => a.subject))];

  const filteredAssignments = assignments.filter((a) => {
    const matchesSearch = a.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          a.subject.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSubject = filterSubject === 'ALL' || a.subject === filterSubject;
    const matchesStatus = filterStatus === 'ALL' || a.completion_status === filterStatus;
    return matchesSearch && matchesSubject && matchesStatus;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Controls Bar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '14px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px', flex: 1 }}>
          {/* Search Box */}
          <div style={{ position: 'relative', width: '280px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input 
              type="text"
              placeholder="Search assignments or subject..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-control"
              style={{ paddingLeft: '36px', height: '38px', fontSize: '0.85rem' }}
            />
          </div>

          {/* Subject Filter */}
          <select 
            value={filterSubject}
            onChange={(e) => setFilterSubject(e.target.value)}
            className="form-control"
            style={{ width: '160px', height: '38px', fontSize: '0.85rem' }}
          >
            {subjects.map(s => <option key={s} value={s}>{s === 'ALL' ? 'All Subjects' : s}</option>)}
          </select>

          {/* Status Filter */}
          <select 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="form-control"
            style={{ width: '160px', height: '38px', fontSize: '0.85rem' }}
          >
            <option value="ALL">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
            <option value="Overdue">Overdue</option>
          </select>
        </div>

        {/* Action Button */}
        <button onClick={handleOpenCreate} className="btn btn-primary btn-sm">
          <Plus size={16} />
          <span>New Assignment</span>
        </button>
      </div>

      {/* Assignments Table Card */}
      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>
            <RefreshCw size={24} className="spin" style={{ margin: '0 auto 8px auto', color: '#2563eb' }} />
            <p>Loading assignments from SQLite...</p>
          </div>
        ) : filteredAssignments.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <FileText size={36} style={{ color: '#94a3b8', margin: '0 auto 10px auto' }} />
            <h4 style={{ fontSize: '1rem', fontWeight: '700', color: '#0f172a' }}>No assignments found</h4>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '16px' }}>
              {searchQuery || filterSubject !== 'ALL' || filterStatus !== 'ALL'
                ? 'Try adjusting your filters or search term.'
                : 'Get started by creating your first academic assignment or uploading a syllabus.'}
            </p>
            <button onClick={handleOpenCreate} className="btn btn-primary btn-sm">
              <Plus size={15} />
              <span>Create Assignment</span>
            </button>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Assignment / Subject</th>
                  <th>Deadline</th>
                  <th>Priority</th>
                  <th>Difficulty</th>
                  <th>Estimated Hours</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAssignments.map((a) => {
                  let deadlineDisplay = 'No Deadline';
                  if (a.deadline) {
                    const d = new Date(a.deadline);
                    deadlineDisplay = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                  }

                  return (
                    <tr key={a.id}>
                      <td>
                        <div style={{ fontWeight: '600', color: '#0f172a' }}>{a.title}</div>
                        <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{a.subject}</div>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.85rem', color: a.completion_status === 'Overdue' ? '#dc2626' : '#334155' }}>
                          {deadlineDisplay}
                        </span>
                      </td>
                      <td>
                        <span className={`badge badge-${a.priority.toLowerCase()}`}>
                          {a.priority}
                        </span>
                      </td>
                      <td>
                        <span className={`badge badge-${a.difficulty.toLowerCase()}`}>
                          {a.difficulty}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontWeight: '600' }}>{a.estimated_duration} hrs</span>
                      </td>
                      <td>
                        <span className={`badge badge-${a.completion_status.toLowerCase().replace(' ', '-')}`}>
                          {a.completion_status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <button
                            onClick={() => {
                              setSelectedAssignmentId(a.id);
                              setCurrentPage('tasks');
                            }}
                            className="btn btn-secondary btn-sm"
                            title="View and decompose tasks"
                            style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                          >
                            <CheckSquare size={13} />
                            <span>Tasks</span>
                          </button>
                          <button
                            onClick={() => handleOpenEdit(a)}
                            className="btn btn-secondary btn-sm"
                            title="Edit assignment details"
                            style={{ padding: '4px 8px' }}
                          >
                            <Edit3 size={13} />
                          </button>
                          <button
                            onClick={() => setDeletingAssignment(a)}
                            className="btn btn-danger btn-sm"
                            title="Delete assignment"
                            style={{ padding: '4px 8px' }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Assignment Modal */}
      {(isCreateOpen || editingAssignment) && (
        <div className="modal-overlay" onClick={() => { setIsCreateOpen(false); setEditingAssignment(null); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#0f172a' }}>
                {editingAssignment ? 'Edit Assignment' : 'New Academic Assignment'}
              </h3>
              <button 
                onClick={() => { setIsCreateOpen(false); setEditingAssignment(null); }}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitForm}>
              <div className="modal-body">
                {formError && <AlertBanner type="error" message={formError} onClose={() => setFormError(null)} />}

                <div className="form-group">
                  <label className="form-label">Assignment Title *</label>
                  <input 
                    type="text"
                    required
                    placeholder="e.g., OS Lab 4: Memory Paging Simulation"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="form-control"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div className="form-group">
                    <label className="form-label">Course / Subject *</label>
                    <input 
                      type="text"
                      required
                      placeholder="e.g., Operating Systems"
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      className="form-control"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select 
                      value={formData.completionStatus}
                      onChange={(e) => setFormData({ ...formData, completionStatus: e.target.value })}
                      className="form-control"
                    >
                      <option value="Pending">Pending</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>
                </div>

                {/* Deadline section with explicit no-deadline checkbox */}
                <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <label className="form-label" style={{ margin: 0 }}>Submission Deadline</label>
                    <label style={{ fontSize: '0.8rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                      <input 
                        type="checkbox"
                        checked={formData.hasNoDeadline}
                        onChange={(e) => setFormData({ ...formData, hasNoDeadline: e.target.checked })}
                      />
                      <span>No explicit deadline</span>
                    </label>
                  </div>

                  {!formData.hasNoDeadline && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <input 
                        type="date"
                        required={!formData.hasNoDeadline}
                        value={formData.deadlineDate}
                        onChange={(e) => setFormData({ ...formData, deadlineDate: e.target.value })}
                        className="form-control"
                      />
                      <input 
                        type="time"
                        value={formData.deadlineTime}
                        onChange={(e) => setFormData({ ...formData, deadlineTime: e.target.value })}
                        className="form-control"
                      />
                    </div>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Priority</label>
                    <select 
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
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
                      value={formData.difficulty}
                      onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                      className="form-control"
                    >
                      <option value="Hard">Hard</option>
                      <option value="Medium">Medium</option>
                      <option value="Easy">Easy</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Est. Hours</label>
                    <input 
                      type="number"
                      step="0.5"
                      min="0.5"
                      max="100"
                      required
                      value={formData.estimatedDuration}
                      onChange={(e) => setFormData({ ...formData, estimatedDuration: e.target.value })}
                      className="form-control"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Description / Topics Covered</label>
                  <textarea 
                    rows="2"
                    placeholder="Short summary of topics or objectives..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="form-control"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Submission Instructions / Deliverables</label>
                  <textarea 
                    rows="2"
                    placeholder="e.g. Submit GitHub repository link and PDF report."
                    value={formData.instructions}
                    onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                    className="form-control"
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button 
                  type="button" 
                  onClick={() => { setIsCreateOpen(false); setEditingAssignment(null); }}
                  className="btn btn-secondary btn-sm"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={submitting}
                  className="btn btn-primary btn-sm"
                >
                  {submitting ? 'Saving to SQLite...' : (editingAssignment ? 'Update Assignment' : 'Save Assignment')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal 
        isOpen={!!deletingAssignment}
        title="Delete Assignment"
        message={`Are you sure you want to permanently delete '${deletingAssignment?.title}'? All associated subtasks and scheduled study sessions will be removed.`}
        confirmText="Delete Assignment"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingAssignment(null)}
        isDanger={true}
      />
    </div>
  );
}
