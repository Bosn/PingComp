import { useEffect, useMemo, useState } from 'react';
import type { AgentSession, ChatTurn } from '../types';

const defaultAgentTurns: ChatTurn[] = [
  { role: 'assistant', text: '我是 PingComp Agent。你可以自然语言问我潜在客户数据，例如："分数大于80且已锁定"。' },
];

export function useAgent() {
  const [agentInput, setAgentInput] = useState('');
  const [agentLoading, setAgentLoading] = useState(false);
  const [agentComposing, setAgentComposing] = useState(false);

  const [agentSessions, setAgentSessions] = useState<AgentSession[]>(() => {
    try {
      const raw = localStorage.getItem('pingcomp_agent_sessions');
      const arr = raw ? JSON.parse(raw) : [];
      if (Array.isArray(arr) && arr.length) return arr;
    } catch {}
    return [{ id: `s_${Date.now()}`, name: 'Session 1', updatedAt: Date.now(), turns: defaultAgentTurns }];
  });

  const [currentSessionId, setCurrentSessionId] = useState<string>(() => {
    const saved = localStorage.getItem('pingcomp_agent_current_session');
    return saved || '';
  });

  const currentSession = useMemo(() => {
    if (!agentSessions.length) return null;
    return agentSessions.find(s => s.id === currentSessionId) || agentSessions[0];
  }, [agentSessions, currentSessionId]);

  const agentTurns = currentSession?.turns || defaultAgentTurns;

  useEffect(() => {
    if (!agentSessions.length) return;
    localStorage.setItem('pingcomp_agent_sessions', JSON.stringify(agentSessions));
    const active = currentSessionId || agentSessions[0].id;
    localStorage.setItem('pingcomp_agent_current_session', active);
  }, [agentSessions, currentSessionId]);

  async function askAgent() {
    const q = agentInput.trim();
    if (!q || agentLoading) return;
    const sid = currentSession?.id;
    if (!sid) return;
    setAgentSessions(prev => prev.map(ss => ss.id === sid ? { ...ss, updatedAt: Date.now(), turns: [...ss.turns, { role: 'user', text: q }] } : ss));
    setAgentInput('');
    setAgentLoading(true);
    try {
      const r = await fetch('/api/agent/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: q })
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || j?.ok === false) {
        const errMsg = String(j?.error || j?.message || `HTTP ${r.status}`);
        throw new Error(errMsg);
      }
      const replyText = String(j?.reply || '').trim();
      setAgentSessions(prev => prev.map(ss => ss.id === currentSession?.id ? {
        ...ss,
        updatedAt: Date.now(),
        turns: [...ss.turns, {
          role: 'assistant',
          text: replyText || '（空回复）',
          rows: Array.isArray(j?.rows) ? j.rows : [],
          chart: j?.chart || undefined
        }]
      } : ss));
    } catch (e: any) {
      setAgentSessions(prev => prev.map(ss => ss.id === currentSession?.id ? { ...ss, updatedAt: Date.now(), turns: [...ss.turns, { role: 'assistant', text: `请求失败：${e?.message || e}` }] } : ss));
    } finally {
      setAgentLoading(false);
    }
  }

  function createSession() {
    const id = `s_${Date.now()}`;
    const next: AgentSession = { id, name: `Session ${agentSessions.length + 1}`, updatedAt: Date.now(), turns: defaultAgentTurns };
    setAgentSessions(prev => [next, ...prev]);
    setCurrentSessionId(id);
  }

  function deleteCurrentSession() {
    if (!currentSession) return;
    const ok = window.confirm('Delete current session?');
    if (!ok) return;
    setAgentSessions(prev => {
      const next = prev.filter(x => x.id !== currentSession.id);
      if (!next.length) {
        const seed: AgentSession = { id: `s_${Date.now()}`, name: 'Session 1', updatedAt: Date.now(), turns: defaultAgentTurns };
        setCurrentSessionId(seed.id);
        return [seed];
      }
      setCurrentSessionId(next[0].id);
      return next;
    });
  }

  return {
    agentInput, setAgentInput,
    agentLoading, agentComposing, setAgentComposing,
    agentSessions, currentSession, currentSessionId, setCurrentSessionId,
    agentTurns,
    askAgent, createSession, deleteCurrentSession,
  };
}
