import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MASTER_CONTROLS, COMPLIANCE_DOMAINS, FRAMEWORKS, getControlsByDomain, calculateFrameworkProgress, getDomainProgress,
  type MasterControl, type ComplianceDomain, type FrameworkId, type UserResponse, type CustomControl, type FrameworkMapping,
} from './constants/controls';

type ViewMode = 'dashboard' | 'assessment' | 'evidence' | 'company';
interface SyncNotification { id: string; controlId: string; controlTitle: string; framework: FrameworkMapping; timestamp: number; }

const Icons = {
  Home: ({ className = "w-5 h-5" }: { className?: string }) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>,
  ClipboardCheck: ({ className = "w-5 h-5" }: { className?: string }) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  FolderOpen: ({ className = "w-5 h-5" }: { className?: string }) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776" /></svg>,
  Building: ({ className = "w-5 h-5" }: { className?: string }) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" /></svg>,
  Search: ({ className = "w-5 h-5" }: { className?: string }) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>,
  Check: ({ className = "w-5 h-5" }: { className?: string }) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>,
  X: ({ className = "w-5 h-5" }: { className?: string }) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>,
  ChevronRight: ({ className = "w-5 h-5" }: { className?: string }) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>,
  Plus: ({ className = "w-5 h-5" }: { className?: string }) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>,
  Info: ({ className = "w-5 h-5" }: { className?: string }) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" /></svg>,
  AlertTriangle: ({ className = "w-5 h-5" }: { className?: string }) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>,
  Moon: ({ className = "w-5 h-5" }: { className?: string }) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" /></svg>,
  Sun: ({ className = "w-5 h-5" }: { className?: string }) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" /></svg>,
  Zap: ({ className = "w-5 h-5" }: { className?: string }) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>,
  Activity: ({ className = "w-5 h-5" }: { className?: string }) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" /></svg>,
  Shield: ({ className = "w-5 h-5" }: { className?: string }) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>,
};

function useLocalStorage<T>(key: string, init: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [val, setVal] = useState<T>(() => { try { const i = localStorage.getItem(key); return i ? JSON.parse(i) : init; } catch { return init; } });
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} }, [key, val]);
  return [val, setVal];
}

const CircularGauge: React.FC<{ value: number; maxValue: number; size?: number; color: string; label: string; icon: string }> = ({ value, maxValue, size = 140, color, label, icon }) => {
  const pct = maxValue > 0 ? Math.round((value / maxValue) * 100) : 0;
  const r = (size - 10) / 2, c = r * 2 * Math.PI, off = c - (pct / 100) * c;
  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <div className="absolute inset-0 rounded-full blur-xl opacity-30" style={{ backgroundColor: color }} />
        <svg className="relative z-10 -rotate-90" width={size} height={size}>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="currentColor" strokeWidth={10} className="text-white/10" />
          <motion.circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={10} strokeLinecap="round" strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: off }} transition={{ duration: 1.5 }} style={{ filter: `drop-shadow(0 0 12px ${color}80)` }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center z-20"><span className="text-2xl mb-1">{icon}</span><span className="text-2xl font-bold text-white">{pct}%</span></div>
      </div>
      <div className="mt-3 text-center"><div className="font-semibold text-white">{label}</div><div className="text-sm text-white/60">{value}/{maxValue}</div></div>
    </div>
  );
};

const GlassCard: React.FC<{ children: React.ReactNode; className?: string; hover?: boolean; onClick?: () => void }> = ({ children, className = '', hover = false, onClick }) => (
  <motion.div whileHover={hover ? { scale: 1.02, y: -4 } : undefined} whileTap={hover ? { scale: 0.98 } : undefined} onClick={onClick}
    className={`relative overflow-hidden rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.12)] ${hover ? 'cursor-pointer' : ''} ${className}`}>
    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
    <div className="relative z-10">{children}</div>
  </motion.div>
);

const EffortBadge: React.FC<{ riskLevel: MasterControl['riskLevel'] }> = ({ riskLevel }) => {
  const cfg = { critical: ['High','Critical','text-red-400 bg-red-500/20'], high: ['Medium','High','text-amber-400 bg-amber-500/20'], medium: ['Low','Medium','text-emerald-400 bg-emerald-500/20'], low: ['Low','Low','text-slate-400 bg-slate-500/20'] };
  const [e,i,c] = cfg[riskLevel];
  return <div className="flex gap-2"><span className={`px-2 py-0.5 text-xs font-medium rounded-full ${c}`}>{e} Effort</span><span className={`px-2 py-0.5 text-xs font-medium rounded-full ${c}`}>{i} Impact</span></div>;
};

const GlobalSearch: React.FC<{ value: string; onChange: (v: string) => void }> = ({ value, onChange }) => {
  const [focused, setFocused] = useState(false);
  const results = useMemo(() => !value.trim() ? [] : MASTER_CONTROLS.filter(c => c.id.toLowerCase().includes(value.toLowerCase()) || c.title.toLowerCase().includes(value.toLowerCase())).slice(0, 6), [value]);
  return (
    <div className="relative">
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border ${focused ? 'border-blue-500/50 bg-white/10' : 'border-white/10'}`}>
        <Icons.Search className="w-5 h-5 text-white/40" />
        <input type="text" value={value} onChange={e => onChange(e.target.value)} onFocus={() => setFocused(true)} onBlur={() => setTimeout(() => setFocused(false), 200)} placeholder="Search controls..." className="flex-1 bg-transparent text-white placeholder-white/40 outline-none" />
        {value && <button onClick={() => onChange('')} className="text-white/40 hover:text-white"><Icons.X className="w-4 h-4" /></button>}
      </div>
      <AnimatePresence>
        {focused && results.length > 0 && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="absolute top-full left-0 right-0 mt-2 p-2 rounded-xl bg-slate-800/95 backdrop-blur-xl border border-white/10 shadow-2xl z-50">
            {results.map(c => <button key={c.id} onClick={() => onChange('')} className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-white/10 text-left"><span className="px-2 py-1 text-xs font-mono bg-white/10 rounded text-white/80">{c.id}</span><span className="flex-1 text-sm text-white truncate">{c.title}</span></button>)}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const ControlCard: React.FC<{ control: MasterControl; response: UserResponse | undefined; onAnswer: (id: string, a: 'yes'|'no'|'partial'|'na') => void; onSync: (c: MasterControl) => void }> = ({ control, response, onAnswer, onSync }) => {
  const [expanded, setExpanded] = useState(false);
  const [showGap, setShowGap] = useState(false);
  const handle = (a: 'yes'|'no'|'partial'|'na') => { onAnswer(control.id, a); if (a === 'yes') { onSync(control); setShowGap(false); } else if (a === 'no') setShowGap(true); else setShowGap(false); };
  return (
    <motion.div layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden">
      <div className="p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2"><span className="px-2.5 py-1 text-xs font-mono font-semibold bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-white/80 rounded-lg">{control.id}</span><EffortBadge riskLevel={control.riskLevel} /></div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{control.title}</h3>
          </div>
          <button onClick={() => setExpanded(!expanded)} className={`p-2 rounded-xl transition-all ${expanded ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-white/50'}`}><Icons.Info className="w-5 h-5" /></button>
        </div>
        <p className="text-slate-600 dark:text-white/70 mb-6">{control.question}</p>
        <div className="flex gap-2 mb-4">
          {(['yes','no','partial','na'] as const).map(a => {
            const sel = response?.answer === a;
            const st = { yes: sel ? 'bg-emerald-500 text-white border-emerald-500' : 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400', no: sel ? 'bg-red-500 text-white border-red-500' : 'border-red-500/30 text-red-600 dark:text-red-400', partial: sel ? 'bg-amber-500 text-white border-amber-500' : 'border-amber-500/30 text-amber-600 dark:text-amber-400', na: sel ? 'bg-slate-500 text-white border-slate-500' : 'border-slate-400/30 text-slate-600 dark:text-slate-400' };
            return <motion.button key={a} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => handle(a)} className={`flex-1 py-3 px-4 rounded-xl font-medium border-2 transition-all ${st[a]}`}>{a === 'yes' ? 'Yes' : a === 'no' ? 'No' : a === 'partial' ? 'Partial' : 'N/A'}</motion.button>;
          })}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {control.frameworkMappings.map(m => { const fw = FRAMEWORKS.find(f => f.id === m.frameworkId); return <span key={`${m.frameworkId}-${m.clauseId}`} className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg" style={{ backgroundColor: `${fw?.color}15`, color: fw?.color, border: `1px solid ${fw?.color}30` }}><span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: fw?.color }} />{m.frameworkId} {m.clauseId}</span>; })}
        </div>
      </div>
      <AnimatePresence>{expanded && <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-t border-slate-200 dark:border-white/10"><div className="p-6 bg-slate-50 dark:bg-white/5 space-y-4"><div><h4 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white mb-2"><Icons.Info className="w-4 h-4 text-blue-500" />Why This Matters</h4><p className="text-sm text-slate-600 dark:text-white/70">{control.guidance}</p></div><div><h4 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white mb-2"><Icons.FolderOpen className="w-4 h-4 text-emerald-500" />Evidence Examples</h4><ul className="space-y-1">{control.evidenceExamples.map((e,i) => <li key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-white/70"><Icons.Check className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />{e}</li>)}</ul></div></div></motion.div>}</AnimatePresence>
      <AnimatePresence>{showGap && response?.answer === 'no' && <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-t border-red-200 dark:border-red-500/30"><div className="p-4 bg-red-50 dark:bg-red-500/10 flex items-start gap-3"><Icons.AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" /><div className="flex-1"><span className="px-2 py-0.5 text-xs font-semibold bg-red-500 text-white rounded mb-1 inline-block">GAP DETECTED</span><p className="text-sm text-red-700 dark:text-red-300">{control.remediationTip}</p></div><button onClick={() => setShowGap(false)} className="text-red-400"><Icons.X className="w-4 h-4" /></button></div></motion.div>}</AnimatePresence>
    </motion.div>
  );
};

const MappingSidebar: React.FC<{ notifications: SyncNotification[]; isOpen: boolean; onClose: () => void }> = ({ notifications, isOpen, onClose }) => (
  <AnimatePresence>
    {isOpen && (<><motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden" />
      <motion.div initial={{ x: 320 }} animate={{ x: 0 }} exit={{ x: 320 }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="fixed right-0 top-0 h-full w-80 bg-slate-900/95 backdrop-blur-xl border-l border-white/10 z-50 shadow-2xl">
        <div className="p-4 border-b border-white/10 flex items-center justify-between"><div className="flex items-center gap-2"><Icons.Zap className="w-5 h-5 text-emerald-400" /><h3 className="font-semibold text-white">Framework Sync</h3></div><button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-white/60"><Icons.X className="w-5 h-5" /></button></div>
        <div className="p-4 overflow-y-auto h-[calc(100%-64px)]">
          {notifications.length === 0 ? <div className="flex flex-col items-center justify-center h-full text-center"><Icons.Shield className="w-12 h-12 text-white/20 mb-4" /><p className="text-white/40 text-sm">Answer Yes to see sync</p></div> : (
            <div className="space-y-3">{notifications.slice(0, 20).map((n, i) => { const fw = FRAMEWORKS.find(f => f.id === n.framework.frameworkId); return <motion.div key={n.id} initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }} className="relative overflow-hidden"><motion.div initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ duration: 1 }} className="absolute inset-0 bg-emerald-500/30 rounded-xl" /><div className="relative p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30"><div className="flex items-start gap-3"><div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center"><Icons.Check className="w-4 h-4 text-emerald-400" /></div><div className="flex-1 min-w-0"><p className="text-xs text-emerald-300 font-medium mb-1">Requirement Satisfied</p><p className="text-sm font-bold text-white">{n.framework.frameworkId} {n.framework.clauseId}</p><p className="text-xs text-white/50 truncate mt-0.5">{n.framework.clauseTitle}</p></div><span className="w-3 h-3 rounded-full" style={{ backgroundColor: fw?.color, boxShadow: `0 0 8px ${fw?.color}` }} /></div></div></motion.div>; })}</div>
          )}
        </div>
      </motion.div></>)}
  </AnimatePresence>
);

const DashboardView: React.FC<{ responses: Map<string, UserResponse>; notifications?: SyncNotification[]; onNavigate: (v: ViewMode) => void }> = ({ responses, onNavigate }) => {
  const fp = FRAMEWORKS.map(fw => ({ ...fw, ...calculateFrameworkProgress(fw.id, responses) }));
  const total = MASTER_CONTROLS.length, answered = Array.from(responses.values()).filter(r => r.answer != null).length, passed = Array.from(responses.values()).filter(r => r.answer === 'yes' || r.answer === 'na').length, gaps = Array.from(responses.values()).filter(r => r.answer === 'no').length;
  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
        <div className="absolute inset-0 opacity-30"><div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.3),transparent_50%)]" /><div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(139,92,246,0.3),transparent_50%)]" /></div>
        <div className="relative z-10"><div className="text-center mb-10"><h1 className="text-4xl font-bold text-white mb-3">Compliance Command Center</h1><p className="text-white/60 text-lg">{total} controls mapped across 4 frameworks</p></div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">{fp.map((f, i) => <motion.div key={f.id} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.1 }}><GlassCard className="p-6"><CircularGauge value={f.completed} maxValue={f.total} color={f.color} label={f.name} icon={f.icon} /></GlassCard></motion.div>)}</div></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <GlassCard className="p-6"><div className="flex items-center gap-4"><div className="w-14 h-14 rounded-2xl bg-blue-500/20 flex items-center justify-center"><Icons.ClipboardCheck className="w-7 h-7 text-blue-400" /></div><div><div className="text-3xl font-bold text-slate-900 dark:text-white">{answered}</div><div className="text-slate-500 dark:text-white/60">Assessed</div></div></div></GlassCard>
        <GlassCard className="p-6"><div className="flex items-center gap-4"><div className="w-14 h-14 rounded-2xl bg-emerald-500/20 flex items-center justify-center"><Icons.Shield className="w-7 h-7 text-emerald-400" /></div><div><div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{passed}</div><div className="text-slate-500 dark:text-white/60">Compliant</div></div></div></GlassCard>
        <GlassCard className="p-6"><div className="flex items-center gap-4"><div className="w-14 h-14 rounded-2xl bg-red-500/20 flex items-center justify-center"><Icons.AlertTriangle className="w-7 h-7 text-red-400" /></div><div><div className="text-3xl font-bold text-red-600 dark:text-red-400">{gaps}</div><div className="text-slate-500 dark:text-white/60">Gaps</div></div></div></GlassCard>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <GlassCard className="p-6" hover onClick={() => onNavigate('assessment')}><div className="flex items-center gap-4"><div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center"><Icons.ClipboardCheck className="w-6 h-6 text-white" /></div><div className="flex-1"><h3 className="font-semibold text-slate-900 dark:text-white">Continue Assessment</h3><p className="text-sm text-slate-500 dark:text-white/60">{total - answered} remaining</p></div><Icons.ChevronRight className="w-5 h-5 text-slate-400" /></div></GlassCard>
        <GlassCard className="p-6" hover onClick={() => onNavigate('evidence')}><div className="flex items-center gap-4"><div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center"><Icons.FolderOpen className="w-6 h-6 text-white" /></div><div className="flex-1"><h3 className="font-semibold text-slate-900 dark:text-white">Evidence Locker</h3><p className="text-sm text-slate-500 dark:text-white/60">{passed} ready</p></div><Icons.ChevronRight className="w-5 h-5 text-slate-400" /></div></GlassCard>
        <GlassCard className="p-6" hover onClick={() => onNavigate('company')}><div className="flex items-center gap-4"><div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center"><Icons.Building className="w-6 h-6 text-white" /></div><div className="flex-1"><h3 className="font-semibold text-slate-900 dark:text-white">Company Controls</h3><p className="text-sm text-slate-500 dark:text-white/60">Custom controls</p></div><Icons.ChevronRight className="w-5 h-5 text-slate-400" /></div></GlassCard>
      </div>
      <GlassCard className="p-6"><h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Domain Progress</h2><div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">{COMPLIANCE_DOMAINS.map(d => { const p = getDomainProgress(d.id, responses); const done = p.percentage === 100 && p.total > 0; return <motion.div key={d.id} whileHover={{ scale: 1.02 }} className={`p-4 rounded-xl cursor-pointer ${done ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-slate-100 dark:bg-white/5'}`} onClick={() => onNavigate('assessment')}><div className="flex items-center gap-3 mb-3"><span className="text-2xl">{d.icon}</span>{done && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center"><Icons.Check className="w-3 h-3 text-white" /></motion.div>}</div><h4 className="font-medium text-slate-900 dark:text-white text-sm mb-1">{d.title}</h4><div className="flex items-center gap-2"><div className="flex-1 h-1.5 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden"><motion.div initial={{ width: 0 }} animate={{ width: `${p.percentage}%` }} className="h-full rounded-full" style={{ backgroundColor: d.color }} /></div><span className="text-xs text-slate-500 dark:text-white/50">{p.completed}/{p.total}</span></div></motion.div>; })}</div></GlassCard>
    </div>
  );
};

const AssessmentView: React.FC<{ responses: Map<string, UserResponse>; onAnswer: (id: string, a: 'yes'|'no'|'partial'|'na') => void; onSync: (c: MasterControl) => void; searchQuery: string; onSearchChange: (v: string) => void }> = ({ responses, onAnswer, onSync, searchQuery, onSearchChange }) => {
  const [domainIdx, setDomainIdx] = useState(0);
  const domain = COMPLIANCE_DOMAINS[domainIdx];
  const controls = useMemo(() => searchQuery.trim() ? MASTER_CONTROLS.filter(c => c.id.toLowerCase().includes(searchQuery.toLowerCase()) || c.title.toLowerCase().includes(searchQuery.toLowerCase())) : getControlsByDomain(domain.id), [domain.id, searchQuery]);
  return (
    <div className="flex gap-6">
      <div className="w-72 flex-shrink-0 hidden lg:block"><div className="sticky top-24"><GlassCard className="p-4"><h3 className="text-sm font-semibold text-slate-500 dark:text-white/50 uppercase mb-4 px-2">Domains</h3><div className="space-y-1">{COMPLIANCE_DOMAINS.map((d, i) => { const p = getDomainProgress(d.id, responses); const active = i === domainIdx && !searchQuery; const done = p.percentage === 100 && p.total > 0; return <button key={d.id} onClick={() => { setDomainIdx(i); onSearchChange(''); }} className={`w-full text-left px-3 py-3 rounded-xl ${active ? 'bg-blue-500/20 border border-blue-500/30' : 'hover:bg-slate-100 dark:hover:bg-white/5'}`}><div className="flex items-center gap-3"><span className="text-xl">{d.icon}</span><div className="flex-1 min-w-0"><div className={`font-medium text-sm truncate ${active ? 'text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-white/80'}`}>{d.title}</div><div className="flex items-center gap-2 mt-1"><div className="flex-1 h-1 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${p.percentage}%`, backgroundColor: done ? '#10B981' : d.color }} /></div><span className="text-xs text-slate-500 dark:text-white/50">{p.completed}/{p.total}</span></div></div>{done && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0"><Icons.Check className="w-3.5 h-3.5 text-white" /></motion.div>}</div></button>; })}</div></GlassCard></div></div>
      <div className="flex-1 min-w-0 space-y-6"><GlobalSearch value={searchQuery} onChange={onSearchChange} />{!searchQuery && <motion.div key={domain.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}><GlassCard className="p-6"><div className="flex items-center gap-4"><div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl" style={{ backgroundColor: `${domain.color}20` }}>{domain.icon}</div><div className="flex-1"><h2 className="text-2xl font-bold text-slate-900 dark:text-white">{domain.title}</h2><p className="text-slate-500 dark:text-white/60">{domain.description}</p></div><div className="text-right"><div className="text-3xl font-bold" style={{ color: domain.color }}>{getDomainProgress(domain.id, responses).percentage}%</div><div className="text-sm text-slate-500 dark:text-white/50">Complete</div></div></div></GlassCard></motion.div>}{searchQuery && <div className="p-4 bg-blue-50 dark:bg-blue-500/10 rounded-xl border border-blue-200 dark:border-blue-500/30"><p className="text-blue-700 dark:text-blue-300">Found <strong>{controls.length}</strong> controls</p></div>}<div className="space-y-4">{controls.map((c, i) => <motion.div key={c.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}><ControlCard control={c} response={responses.get(c.id)} onAnswer={onAnswer} onSync={onSync} /></motion.div>)}</div>{controls.length === 0 && <div className="text-center py-16"><Icons.Search className="w-12 h-12 text-slate-300 dark:text-white/20 mx-auto mb-4" /><p className="text-slate-500 dark:text-white/50">No controls found</p></div>}</div>
    </div>
  );
};

const EvidenceLockerView: React.FC<{ responses: Map<string, UserResponse>; onUpdateNotes: (id: string, n: string) => void }> = ({ responses, onUpdateNotes }) => {
  const [editId, setEditId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const passed = MASTER_CONTROLS.filter(c => responses.get(c.id)?.answer === 'yes');
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between"><div><h2 className="text-2xl font-bold text-slate-900 dark:text-white">Evidence Locker</h2><p className="text-slate-500 dark:text-white/60">Attach notes for auditors</p></div><div className="px-4 py-2 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 rounded-xl font-medium">{passed.length} passed</div></div>
      {passed.length === 0 ? <GlassCard className="p-12 text-center"><Icons.FolderOpen className="w-16 h-16 text-slate-300 dark:text-white/20 mx-auto mb-4" /><h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">No Evidence Yet</h3><p className="text-slate-500 dark:text-white/60">Complete controls with Yes to collect evidence</p></GlassCard> : (
        <GlassCard className="overflow-hidden"><div className="overflow-x-auto"><table className="w-full"><thead><tr className="border-b border-slate-200 dark:border-white/10"><th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-white/50 uppercase">Control</th><th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-white/50 uppercase">Status</th><th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-white/50 uppercase">Notes</th><th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-white/50 uppercase">Actions</th></tr></thead><tbody className="divide-y divide-slate-200 dark:divide-white/10">{passed.map(c => { const r = responses.get(c.id); const editing = editId === c.id; return <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-white/5"><td className="px-6 py-4"><div className="flex items-center gap-3"><span className="px-2 py-1 text-xs font-mono bg-slate-100 dark:bg-white/10 rounded">{c.id}</span><span className="text-sm text-slate-900 dark:text-white font-medium">{c.title}</span></div></td><td className="px-6 py-4"><span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 rounded-full"><Icons.Check className="w-3.5 h-3.5" />Compliant</span></td><td className="px-6 py-4">{editing ? <div className="flex gap-2"><input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Add notes..." className="flex-1 px-3 py-2 text-sm bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/20 rounded-lg text-slate-900 dark:text-white" autoFocus /><button onClick={() => { onUpdateNotes(c.id, notes); setEditId(null); }} className="px-3 py-2 bg-blue-500 text-white text-sm rounded-lg">Save</button><button onClick={() => setEditId(null)} className="px-3 py-2 text-slate-500 text-sm">Cancel</button></div> : <span className="text-sm text-slate-600 dark:text-white/70">{r?.notes || <span className="text-slate-400 dark:text-white/30">No notes</span>}</span>}</td><td className="px-6 py-4">{!editing && <button onClick={() => { setEditId(c.id); setNotes(r?.notes || ''); }} className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg"><Icons.Plus className="w-4 h-4" /></button>}</td></tr>; })}</tbody></table></div></GlassCard>
      )}
    </div>
  );
};

const CompanyControlsView: React.FC<{ customControls: CustomControl[]; onAdd: (c: CustomControl) => void; onDel: (id: string) => void }> = ({ customControls, onAdd, onDel }) => {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', desc: '', cat: 'access_control' as ComplianceDomain, maps: [] as { fwId: FrameworkId; clause: string }[] });
  const [newMap, setNewMap] = useState({ fwId: 'SOC2' as FrameworkId, clause: '' });
  const addMap = () => { if (newMap.clause.trim()) { setForm(p => ({ ...p, maps: [...p.maps, { fwId: newMap.fwId, clause: newMap.clause.trim() }] })); setNewMap({ fwId: 'SOC2', clause: '' }); } };
  const submit = (e: React.FormEvent) => { e.preventDefault(); if (form.name && form.desc) { onAdd({ id: `CUSTOM-${Date.now()}`, title: form.name, description: form.desc, question: `Is ${form.name} implemented?`, category: form.cat, frameworkMappings: form.maps.map(m => ({ frameworkId: m.fwId, clauseId: m.clause, clauseTitle: 'Custom' })), effort: 'medium', impact: 'medium', createdAt: new Date().toISOString(), createdBy: 'User' }); setForm({ name: '', desc: '', cat: 'access_control', maps: [] }); setShowModal(false); } };
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between"><div><h2 className="text-2xl font-bold text-slate-900 dark:text-white">Company Controls</h2><p className="text-slate-500 dark:text-white/60">Create custom internal controls</p></div><motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setShowModal(true)} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-500 to-purple-500 text-white rounded-xl font-medium shadow-lg shadow-violet-500/25"><Icons.Plus className="w-5 h-5" />Add Control</motion.button></div>
      {customControls.length === 0 ? <GlassCard className="p-12 text-center"><Icons.Building className="w-16 h-16 text-slate-300 dark:text-white/20 mx-auto mb-4" /><h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">No Custom Controls</h3><p className="text-slate-500 dark:text-white/60 mb-6">Add controls for your org</p></GlassCard> : (
        <div className="grid gap-4">{customControls.map(c => <GlassCard key={c.id} className="p-5"><div className="flex items-start justify-between gap-4"><div className="flex-1"><div className="flex items-center gap-2 mb-2"><span className="px-2 py-1 text-xs font-mono bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300 rounded">{c.id}</span><span className="px-2 py-0.5 text-xs bg-violet-500/20 text-violet-400 rounded">Custom</span></div><h3 className="font-semibold text-slate-900 dark:text-white mb-1">{c.title}</h3><p className="text-sm text-slate-600 dark:text-white/70 mb-3">{c.description}</p>{c.frameworkMappings.length > 0 && <div className="flex flex-wrap gap-1.5">{c.frameworkMappings.map((m, i) => { const fw = FRAMEWORKS.find(f => f.id === m.frameworkId); return <span key={i} className="inline-flex items-center gap-1.5 px-2 py-1 text-xs rounded-lg" style={{ backgroundColor: `${fw?.color}15`, color: fw?.color }}><span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: fw?.color }} />{m.frameworkId} {m.clauseId}</span>; })}</div>}</div><button onClick={() => onDel(c.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg"><Icons.X className="w-5 h-5" /></button></div></GlassCard>)}</div>
      )}
      <AnimatePresence>{showModal && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowModal(false)}><motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} onClick={e => e.stopPropagation()} className="w-full max-w-2xl bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden"><div className="p-6 border-b border-slate-200 dark:border-white/10"><h2 className="text-xl font-bold text-slate-900 dark:text-white">Create Custom Control</h2><p className="text-slate-500 dark:text-white/60 text-sm mt-1">Define and map to frameworks</p></div><form onSubmit={submit} className="p-6 space-y-5"><div><label className="block text-sm font-medium text-slate-700 dark:text-white/80 mb-2">Control Name *</label><input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g., Weekly Security Standups" className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white" required /></div><div><label className="block text-sm font-medium text-slate-700 dark:text-white/80 mb-2">Description *</label><textarea value={form.desc} onChange={e => setForm(p => ({ ...p, desc: e.target.value }))} placeholder="What does this control do..." rows={2} className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white resize-none" required /></div><div><label className="block text-sm font-medium text-slate-700 dark:text-white/80 mb-2">Category</label><select value={form.cat} onChange={e => setForm(p => ({ ...p, cat: e.target.value as ComplianceDomain }))} className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white">{COMPLIANCE_DOMAINS.map(d => <option key={d.id} value={d.id}>{d.icon} {d.title}</option>)}</select></div><div className="p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10"><label className="block text-sm font-medium text-slate-700 dark:text-white/80 mb-3">Framework Mapping</label><div className="flex gap-2 mb-3"><select value={newMap.fwId} onChange={e => setNewMap(p => ({ ...p, fwId: e.target.value as FrameworkId }))} className="px-3 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white">{FRAMEWORKS.map(f => <option key={f.id} value={f.id}>{f.icon} {f.name}</option>)}</select><input type="text" value={newMap.clause} onChange={e => setNewMap(p => ({ ...p, clause: e.target.value }))} placeholder="Clause ID" className="flex-1 px-3 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white" /><button type="button" onClick={addMap} className="px-4 py-2 bg-blue-500 text-white rounded-lg">Add</button></div>{form.maps.length > 0 && <div className="flex flex-wrap gap-2">{form.maps.map((m, i) => { const fw = FRAMEWORKS.find(f => f.id === m.fwId); return <span key={i} className="inline-flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-white/10"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: fw?.color }} /><span className="text-sm text-slate-700 dark:text-white/80">{m.fwId} {m.clause}</span><button type="button" onClick={() => setForm(p => ({ ...p, maps: p.maps.filter((_, idx) => idx !== i) }))} className="text-slate-400 hover:text-red-500"><Icons.X className="w-4 h-4" /></button></span>; })}</div>}</div><div className="flex justify-end gap-3 pt-4"><button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 text-slate-600 dark:text-white/60">Cancel</button><button type="submit" className="px-5 py-2.5 bg-gradient-to-r from-violet-500 to-purple-500 text-white rounded-xl font-medium">Create</button></div></form></motion.div></motion.div>}</AnimatePresence>
    </div>
  );
};

const App: React.FC = () => {
  const [view, setView] = useState<ViewMode>('dashboard');
  const [darkMode, setDarkMode] = useLocalStorage('compliance-dark-v4', true);
  const [responses, setResponses] = useLocalStorage<Record<string, UserResponse>>('compliance-resp-v4', {});
  const [customControls, setCustomControls] = useLocalStorage<CustomControl[]>('compliance-custom-v4', []);
  const [syncNotifications, setSyncNotifications] = useState<SyncNotification[]>([]);
  const [showSidebar, setShowSidebar] = useState(false);
  const [search, setSearch] = useState('');

  const responsesMap = useMemo(() => new Map(Object.entries(responses)), [responses]);
  useEffect(() => { darkMode ? document.documentElement.classList.add('dark') : document.documentElement.classList.remove('dark'); }, [darkMode]);

  const handleAnswer = useCallback((id: string, a: 'yes'|'no'|'partial'|'na') => { setResponses(p => ({ ...p, [id]: { controlId: id, answer: a, notes: p[id]?.notes || '', evidenceUrls: [], evidenceNotes: '', answeredAt: new Date().toISOString() } })); }, [setResponses]);
  const handleSync = useCallback((c: MasterControl) => { const notifs: SyncNotification[] = c.frameworkMappings.map(m => ({ id: `${c.id}-${m.frameworkId}-${Date.now()}-${Math.random()}`, controlId: c.id, controlTitle: c.title, framework: m, timestamp: Date.now() })); setSyncNotifications(p => [...notifs, ...p].slice(0, 100)); setShowSidebar(true); }, []);
  const handleUpdateNotes = useCallback((id: string, notes: string) => { setResponses(p => ({ ...p, [id]: { ...p[id], notes } })); }, [setResponses]);

  const navItems = [{ id: 'dashboard' as ViewMode, label: 'Dashboard', icon: Icons.Home }, { id: 'assessment' as ViewMode, label: 'Assessment', icon: Icons.ClipboardCheck }, { id: 'evidence' as ViewMode, label: 'Evidence', icon: Icons.FolderOpen }, { id: 'company' as ViewMode, label: 'Company', icon: Icons.Building }];

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 transition-colors duration-300">
      <nav className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"><div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3"><div className="w-10 h-10 bg-gradient-to-br from-blue-500 via-violet-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/25"><Icons.Shield className="w-5 h-5 text-white" /></div><div className="hidden sm:block"><span className="text-lg font-bold text-slate-900 dark:text-white">Compliance Engine</span><span className="hidden md:inline text-xs text-slate-500 dark:text-white/50 ml-2">{MASTER_CONTROLS.length} Controls</span></div></div>
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-white/5 rounded-xl p-1">{navItems.map(i => { const Icon = i.icon; return <button key={i.id} onClick={() => setView(i.id)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${view === i.id ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white'}`}><Icon className="w-4 h-4" /><span className="hidden sm:inline">{i.label}</span></button>; })}</div>
          <div className="flex items-center gap-2"><button onClick={() => setShowSidebar(!showSidebar)} className={`relative p-2.5 rounded-xl transition-all ${showSidebar ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-white/50 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'}`}><Icons.Zap className="w-5 h-5" />{syncNotifications.length > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{Math.min(syncNotifications.length, 99)}</span>}</button><button onClick={() => setDarkMode(!darkMode)} className="p-2.5 rounded-xl text-slate-500 dark:text-white/50 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-all">{darkMode ? <Icons.Sun className="w-5 h-5" /> : <Icons.Moon className="w-5 h-5" />}</button></div>
        </div></div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatePresence mode="wait">
          {view === 'dashboard' && <motion.div key="dashboard" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}><DashboardView responses={responsesMap} notifications={syncNotifications} onNavigate={setView} /></motion.div>}
          {view === 'assessment' && <motion.div key="assessment" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}><AssessmentView responses={responsesMap} onAnswer={handleAnswer} onSync={handleSync} searchQuery={search} onSearchChange={setSearch} /></motion.div>}
          {view === 'evidence' && <motion.div key="evidence" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}><EvidenceLockerView responses={responsesMap} onUpdateNotes={handleUpdateNotes} /></motion.div>}
          {view === 'company' && <motion.div key="company" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}><CompanyControlsView customControls={customControls} onAdd={c => setCustomControls(p => [...p, c])} onDel={id => setCustomControls(p => p.filter(c => c.id !== id))} /></motion.div>}
        </AnimatePresence>
      </main>
      <MappingSidebar notifications={syncNotifications} isOpen={showSidebar} onClose={() => setShowSidebar(false)} />
    </div>
  );
};

export default App;
