import React, { useState, useEffect } from 'react';
import { 
  CheckSquare, 
  Plus, 
  Sparkles, 
  Clock, 
  Edit3, 
  Trash2, 
  ArrowRight, 
  Layers, 
  CheckCircle2, 
  RefreshCw,
  X,
  Save,
  Link2
} from 'lucide-react';
import { api } from '../services/api';
import ConfirmModal from '../components/ConfirmModal';
import AlertBanner from '../components/AlertBanner';

export default function TaskBreakdownPage({ 
  selectedAssignmentId, 
  setSelectedAssignmentId, 
  setCurrentPage, 
  showNotification 
}) {
  const [assignments, setAssignments] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generationSource, setGenerationSource] = useState(null);

  // Modals
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [deletingTask, setDeletingTask] = useState(null);

  // Task form
  const [taskForm, setTaskForm] = useState({
    name: '',
    description: '',
    category: 'Coding',
    priority: 'Medium',
    difficulty: 'Medium',
    estimatedDuration: 1.0,
    actualTimeSpent: 0.0,
    completionStatus: 'Pending',
    dependencies: '',
  });

  const loadAssignmentsAndTasks = async () => {
    setLoading(true);
    try {
      const aData = await api.getAssignments();
      setAssignments(aData);

      let targetId = selectedAssignmentId;
      if (!targetId && aData.length > 0) {
        targetId = aData[0].id;
        setSelectedAssignmentId(targetId);
      }

      if (targetId) {
        const tData = await api.getTasks(targetId);
        setTasks(tData);
      } else {
        setTasks([]);
      }
    } catch (err) {
      showNotification('error', `Failed to load tasks: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssignmentsAndTasks();
  }, [selectedAssignmentId]);

  const handleSelectAssignment = async (e) => {
    const id = parseInt(e.target.value);
    setSelectedAssignmentId(id);
    setLoading(true);
    try {
      const tData = await api.getTasks(id);
      setTasks(tData);
    } catch (err) {
      showNotification('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAutoGenerateTasks = async () => {
    if (!selectedAssignmentId) return;
    setGenerating(true);
    try {
      const res = await api.generateAssignmentTasks(selectedAssignmentId);
      setTasks(res.tasks);
      setGenerationSource(res.source_label);
      showNotification('success', `Generated ${res.tasks.length} structured subtasks via ${res.source_label}!`);
    } catch (err) {
      showNotification('error', `Task generation error: ${err.message}`);
    } finally {
      setGenerating(false);
    }
  };

  const handleToggleTaskStatus = async (task) => {
    const newStatus = task.completion_status === 'Completed' ? 'Pending' : 'Completed';
    try {
      const updated = await api.updateTask(task.id, { 
        completion_status: newStatus,
        actual_time_spent: newStatus === 'Completed' && task.actual_time_spent === 0 ? task.estimated_duration : task.actual_time_spent
      });
      setTasks(tasks.map(t => t.id === task.id ? updated : t));
      showNotification('success', `Task marked as ${newStatus}. Adaptive speed calibration updated.`);
    } catch (err) {
      showNotification('error', err.message);
    }
  };

  const handleSaveActualHours = async (task, hours) => {
    const parsed = parseFloat(hours);
    if (isNaN(parsed) || parsed < 0) return;
    try {
      const updated = await api.updateTask(task.id, { actual_time_spent: parsed });
      setTasks(tasks.map(t => t.id === task.id ? updated : t));
      showNotification('success', `Logged ${parsed}h for '${task.name}'.`);
    } catch (err) {
      showNotification('error', err.message);
    }
  };

  const handleOpenCreateTask = () => {
    setTaskForm({
      name: '',
      description: '',
      category: 'Coding',
      priority: 'Medium',
      difficulty: 'Medium',
      estimatedDuration: 1.0,
      actualTimeSpent: 0.0,
      completionStatus: 'Pending',
      dependencies: '',
    });
    setEditingTask(null);
    setIsTaskModalOpen(true);
  };

  const handleOpenEditTask = (task) => {
    setTaskForm({
      name: task.name,
      description: task.description || '',
      category: task.category,
      priority: task.priority,
      difficulty: task.difficulty,
      estimatedDuration: task.estimated_duration,
      actualTimeSpent: task.actual_time_spent,
      completionStatus: task.completion_status,
      dependencies: task.dependencies || '',
    });
    setEditingTask(task);
    setIsTaskModalOpen(true);
  };

  const handleSaveTaskForm = async (e) => {
    e.preventDefault();
    if (!taskForm.name.trim()) return;

    const payload = {
      assignment_id: selectedAssignmentId,
      name: taskForm.name.trim(),
      description: taskForm.description.trim() || null,
      category: taskForm.category,
      priority: taskForm.priority,
      difficulty: taskForm.difficulty,
      estimated_duration: parseFloat(taskForm.estimatedDuration),
      actual_time_spent: parseFloat(taskForm.actualTimeSpent),
      completion_status: taskForm.completionStatus,
      dependencies: taskForm.dependencies.trim() || null,
      order_index: tasks.length + 1
    };

    try {
      if (editingTask) {
        const updated = await api.updateTask(editingTask.id, payload);
        setTasks(tasks.map(t => t.id === editingTask.id ? updated : t));
        showNotification('success', 'Task updated.');
      } else {
        const created = await api.createTask(payload);
        setTasks([...tasks, created]);
        showNotification('success', 'New task added.');
      }
      setIsTaskModalOpen(false);
    } catch (err) {
      showNotification('error', err.message);
    }
  };

  const handleDeleteTask = async () => {
    if (!deletingTask) return;
    try {
      await api.deleteTask(deletingTask.id);
      setTasks(tasks.filter(t => t.id !== deletingTask.id));
      showNotification('success', 'Task removed.');
      setDeletingTask(null);
    } catch (err) {
      showNotification('error', err.message);
    }
  };

  const currentAssignment = assignments.find(a => a.id === selectedAssignmentId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Assignment Selector & Actions */}
      <div className="card" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '280px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#475569' }}>Assignment:</span>
            {assignments.length === 0 ? (
              <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>No assignments created yet</span>
            ) : (
              <select 
                value={selectedAssignmentId || ''} 
                onChange={handleSelectAssignment}
                className="form-control"
                style={{ flex: 1, maxWidth: '420px', height: '38px', fontSize: '0.85rem' }}
              >
                {assignments.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.title} ({a.subject}) - {a.completion_status}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button 
              onClick={handleAutoGenerateTasks}
              disabled={generating || !selectedAssignmentId}
              className="btn btn-secondary btn-sm"
              title="Decompose assignment into structured sequential tasks"
            >
              {generating ? <RefreshCw size={14} className="spin" /> : <Sparkles size={14} style={{ color: '#8b5cf6' }} />}
              <span>{generating ? 'Generating...' : 'AI Task Breakdown'}</span>
            </button>
            <button 
              onClick={handleOpenCreateTask}
              disabled={!selectedAssignmentId}
              className="btn btn-primary btn-sm"
            >
              <Plus size={15} />
              <span>Add Subtask</span>
            </button>
          </div>
        </div>

        {generationSource && (
          <div style={{ marginTop: '12px', fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle2 size={13} style={{ color: '#10b981' }} />
            <span>Task breakdown generated via: <strong>{generationSource}</strong></span>
          </div>
        )}
      </div>

      {/* Task List */}
      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fafbfc' }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#0f172a' }}>
              Subtasks for {currentAssignment ? currentAssignment.title : 'Assignment'}
            </h3>
            <p style={{ fontSize: '0.78rem', color: '#64748b' }}>
              {tasks.length} tasks • {tasks.filter(t => t.completion_status === 'Completed').length} completed • Total est: {tasks.reduce((a, b) => a + b.estimated_duration, 0).toFixed(1)} hrs
            </p>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
            <RefreshCw size={24} className="spin" style={{ margin: '0 auto 8px auto', color: '#2563eb' }} />
            <p>Loading subtasks...</p>
          </div>
        ) : tasks.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <Layers size={36} style={{ color: '#94a3b8', margin: '0 auto 10px auto' }} />
            <h4 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#0f172a' }}>No tasks created yet for this assignment</h4>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '16px' }}>
              Click 'AI Task Breakdown' to generate academic milestones automatically, or add a custom subtask.
            </p>
            <button onClick={handleAutoGenerateTasks} className="btn btn-primary btn-sm">
              <Sparkles size={14} />
              <span>Generate Breakdown</span>
            </button>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>Done</th>
                  <th>Step & Task Details</th>
                  <th>Category</th>
                  <th>Priority / Diff</th>
                  <th>Est. vs Actual Hours</th>
                  <th>Prereq</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task, idx) => (
                  <tr key={task.id} style={{ background: task.completion_status === 'Completed' ? '#fcfdfd' : 'white' }}>
                    <td>
                      <input 
                        type="checkbox"
                        checked={task.completion_status === 'Completed'}
                        onChange={() => handleToggleTaskStatus(task)}
                        style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#10b981' }}
                      />
                    </td>
                    <td>
                      <div style={{ 
                        fontWeight: '600', 
                        color: task.completion_status === 'Completed' ? '#64748b' : '#0f172a',
                        textDecoration: task.completion_status === 'Completed' ? 'line-through' : 'none'
                      }}>
                        {idx + 1}. {task.name}
                      </div>
                      {task.description && (
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                          {task.description}
                        </div>
                      )}
                    </td>
                    <td>
                      <span className="badge badge-info">{task.category}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <span className={`badge badge-${task.priority.toLowerCase()}`}>{task.priority}</span>
                        <span className={`badge badge-${task.difficulty.toLowerCase()}`}>{task.difficulty}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>{task.estimated_duration}h est</span>
                        <span style={{ color: '#94a3b8' }}>/</span>
                        <input 
                          type="number"
                          step="0.5"
                          min="0"
                          defaultValue={task.actual_time_spent}
                          onBlur={(e) => handleSaveActualHours(task, e.target.value)}
                          style={{
                            width: '56px',
                            padding: '2px 4px',
                            fontSize: '0.8rem',
                            border: '1px solid #cbd5e1',
                            borderRadius: '4px',
                            textAlign: 'center'
                          }}
                          title="Type actual hours spent and click outside to log"
                        />
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>h spent</span>
                      </div>
                    </td>
                    <td>
                      {task.dependencies ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '0.75rem', color: '#64748b' }}>
                          <Link2 size={12} />
                          <span>Step {task.dependencies}</span>
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>None</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <button onClick={() => handleOpenEditTask(task)} className="btn btn-secondary btn-sm" style={{ padding: '4px 8px' }}>
                          <Edit3 size={12} />
                        </button>
                        <button onClick={() => setDeletingTask(task)} className="btn btn-danger btn-sm" style={{ padding: '4px 8px' }}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Task Modal */}
      {isTaskModalOpen && (
        <div className="modal-overlay" onClick={() => setIsTaskModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: '#0f172a' }}>
                {editingTask ? 'Edit Subtask' : 'Add New Subtask'}
              </h3>
              <button onClick={() => setIsTaskModalOpen(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveTaskForm}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Task Name *</label>
                  <input 
                    type="text"
                    required
                    placeholder="e.g. Implement Mutex Locks"
                    value={taskForm.name}
                    onChange={(e) => setTaskForm({ ...taskForm, name: e.target.value })}
                    className="form-control"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Description / Instructions</label>
                  <textarea 
                    rows="2"
                    placeholder="Specific actionable instructions..."
                    value={taskForm.description}
                    onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                    className="form-control"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <select 
                      value={taskForm.category}
                      onChange={(e) => setTaskForm({ ...taskForm, category: e.target.value })}
                      className="form-control"
                    >
                      <option value="Coding">Coding</option>
                      <option value="Research">Research</option>
                      <option value="Report writing">Report writing</option>
                      <option value="Revision">Revision</option>
                      <option value="General">General</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Priority</label>
                    <select 
                      value={taskForm.priority}
                      onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
                      className="form-control"
                    >
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div className="form-group">
                    <label className="form-label">Estimated Hours</label>
                    <input 
                      type="number"
                      step="0.5"
                      min="0.25"
                      required
                      value={taskForm.estimatedDuration}
                      onChange={(e) => setTaskForm({ ...taskForm, estimatedDuration: e.target.value })}
                      className="form-control"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Actual Hours Spent</label>
                    <input 
                      type="number"
                      step="0.5"
                      min="0"
                      value={taskForm.actualTimeSpent}
                      onChange={(e) => setTaskForm({ ...taskForm, actualTimeSpent: e.target.value })}
                      className="form-control"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Prerequisite Dependency (Step Index or Task ID)</label>
                  <input 
                    type="text"
                    placeholder="e.g. 1 (must finish Step 1 before this)"
                    value={taskForm.dependencies}
                    onChange={(e) => setTaskForm({ ...taskForm, dependencies: e.target.value })}
                    className="form-control"
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setIsTaskModalOpen(false)} className="btn btn-secondary btn-sm">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  Save Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Task Modal */}
      <ConfirmModal 
        isOpen={!!deletingTask}
        title="Delete Subtask"
        message={`Delete '${deletingTask?.name}'?`}
        confirmText="Delete"
        onConfirm={handleDeleteTask}
        onCancel={() => setDeletingTask(null)}
        isDanger={true}
      />
    </div>
  );
}
