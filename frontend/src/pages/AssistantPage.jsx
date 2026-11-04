import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Send, 
  BookOpen, 
  CheckCircle2, 
  HelpCircle, 
  Info, 
  RefreshCw,
  Lightbulb,
  Code2
} from 'lucide-react';
import { api } from '../services/api';
import AlertBanner from '../components/AlertBanner';

export default function AssistantPage({ showNotification }) {
  const [assignments, setAssignments] = useState([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState('');
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState(null);
  const [aiStatus, setAiStatus] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const init = async () => {
      try {
        const [aData, status] = await Promise.all([
          api.getAssignments(),
          api.getAssistantStatus()
        ]);
        setAssignments(aData);
        setAiStatus(status);
      } catch (err) {
        // Fallback silently if offline
      }
    };
    init();
  }, []);

  const sampleQuestions = [
    "What is the difference between Time and Space complexity with examples?",
    "How to prevent circular wait condition to avoid deadlocks?",
    "Explain database normalization steps from 1NF to 3NF and BCNF.",
    "Systematic debugging steps for resolving segmentation fault (core dumped) in C/C++?",
    "How does TCP 3-way handshake establish reliable socket connections?"
  ];

  const handleAsk = async (queryText = null) => {
    const q = queryText || question;
    if (!q.trim() || q.trim().length < 3) {
      setError('Please enter a specific question (at least 3 characters).');
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const res = await api.askAssistant(
        q.trim(),
        selectedAssignmentId ? parseInt(selectedAssignmentId) : null
      );
      setResponse(res);
      if (queryText) setQuestion(queryText);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '960px', margin: '0 auto' }}>
      {error && <AlertBanner type="error" message={error} onClose={() => setError(null)} />}

      {/* Header Card */}
      <div className="card">
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '14px', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sparkles size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#0f172a' }}>
                Academic Doubt-Solving Assistant
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
                Conceptual explanations, code troubleshooting guidance, and assignment breakdown in plain English.
              </p>
            </div>
          </div>

          {/* Engine indicator */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '5px 12px',
            borderRadius: '999px',
            fontSize: '0.75rem',
            fontWeight: '600',
            background: aiStatus?.is_ai_configured ? '#f5f3ff' : '#eff6ff',
            color: aiStatus?.is_ai_configured ? '#6d28d9' : '#1d4ed8',
            border: `1px solid ${aiStatus?.is_ai_configured ? '#ddd6fe' : '#bfdbfe'}`
          }}>
            <Sparkles size={13} />
            <span>{aiStatus?.engine || 'Rule-Based Fallback Mode'}</span>
          </div>
        </div>

        <p style={{ fontSize: '0.82rem', color: '#475569', lineHeight: 1.45, background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', borderLeft: '3px solid #8b5cf6' }}>
          <strong>Transparency Notice:</strong> If an LLM API key (e.g. Gemini) is configured in the backend <code style={{ fontFamily: 'var(--font-mono)' }}>.env</code> file, responses are generated via live generative AI. If no key is set, the assistant operates using an offline computer science knowledge heuristics base.
        </p>
      </div>

      {/* Input Form Card */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#334155' }}>Relate to Assignment (Optional):</span>
          <select
            value={selectedAssignmentId}
            onChange={(e) => setSelectedAssignmentId(e.target.value)}
            className="form-control"
            style={{ maxWidth: '380px', height: '36px', fontSize: '0.85rem' }}
          >
            <option value="">General Computer Science / No specific assignment</option>
            {assignments.map(a => (
              <option key={a.id} value={a.id}>{a.title} ({a.subject})</option>
            ))}
          </select>
        </div>

        <div className="form-group" style={{ marginBottom: '12px' }}>
          <textarea
            rows="3"
            placeholder="Type your academic question, algorithmic doubt, or ask for guidance understanding code..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="form-control"
            style={{ fontSize: '0.92rem' }}
          />
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
          {/* Preset question pills */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', flex: 1 }}>
            {sampleQuestions.slice(0, 3).map((sq, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleAsk(sq)}
                style={{
                  background: '#f1f5f9',
                  border: '1px solid #e2e8f0',
                  borderRadius: '999px',
                  padding: '4px 10px',
                  fontSize: '0.72rem',
                  color: '#475569',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                {sq.slice(0, 42)}...
              </button>
            ))}
          </div>

          <button
            onClick={() => handleAsk()}
            disabled={loading || !question.trim()}
            className="btn btn-primary btn-sm"
            style={{ padding: '8px 16px' }}
          >
            {loading ? <RefreshCw size={15} className="spin" /> : <Send size={15} />}
            <span>{loading ? 'Consulting Assistant...' : 'Ask Assistant'}</span>
          </button>
        </div>
      </div>

      {/* Answer Response Display Card */}
      {response && (
        <div className="card" style={{ border: '2px solid #8b5cf6', background: '#faf5ff' }}>
          {/* Header with Source Label */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e9d5ff', paddingBottom: '12px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#7c3aed', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Lightbulb size={16} />
              </div>
              <h4 style={{ fontSize: '0.98rem', fontWeight: '700', color: '#0f172a' }}>Academic Guidance</h4>
            </div>

            <span className={`badge ${response.is_ai_powered ? 'badge-purple' : 'badge-info'}`} style={{ fontSize: '0.72rem' }}>
              {response.source_label}
            </span>
          </div>

          {response.related_assignment_title && (
            <div style={{ fontSize: '0.78rem', color: '#6d28d9', fontWeight: '600', marginBottom: '12px' }}>
              Linked Assignment: {response.related_assignment_title}
            </div>
          )}

          {/* Explanation Body */}
          <div style={{ 
            fontSize: '0.9rem', 
            color: '#1e293b', 
            lineHeight: 1.6, 
            whiteSpace: 'pre-line',
            background: 'white',
            padding: '16px 20px',
            borderRadius: '10px',
            border: '1px solid #e9d5ff',
            marginBottom: '16px'
          }}>
            {response.answer}
          </div>

          {/* Suggested Next Steps */}
          {response.suggested_steps && response.suggested_steps.length > 0 && (
            <div>
              <p style={{ fontSize: '0.8rem', fontWeight: '700', color: '#581c87', textTransform: 'uppercase', marginBottom: '8px' }}>
                Suggested Actionable Steps
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {response.suggested_steps.map((step, idx) => (
                  <div 
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 12px',
                      background: 'white',
                      borderRadius: '6px',
                      border: '1px solid #f3e8ff',
                      fontSize: '0.82rem',
                      color: '#475569'
                    }}
                  >
                    <CheckCircle2 size={14} style={{ color: '#10b981', flexShrink: 0 }} />
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
