import { useEffect, useMemo, useState } from 'react';
import {
  Activity, ArrowDownLeft, ArrowDownRight, ArrowRight, ArrowUpRight, Banknote,
  Bell, CalendarDays, Check, ChevronDown, CircleHelp, Coffee, CreditCard,
  Download, Ellipsis, Flame, Goal, HeartPulse, Home, IndianRupee, Lightbulb,
  Menu, Plus, ReceiptText, RotateCcw, Search, ShieldAlert, ShieldCheck,
  ShoppingBag, Sparkles, Target, TrendingDown, TrendingUp, Wallet, X,
  Zap,
} from 'lucide-react';
import {
  Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from 'recharts';

const STORAGE_KEY = 'pocketwise-finance-v1';
const STARTING_BUDGET = 10000;
const CATEGORY_META = {
  Food: { color: '#c2f970', icon: Coffee },
  Transport: { color: '#8eafff', icon: ArrowRight },
  Shopping: { color: '#ffb38a', icon: ShoppingBag },
  Bills: { color: '#c4a1ff', icon: Home },
  Health: { color: '#7de1c3', icon: HeartPulse },
  Learning: { color: '#f8d977', icon: Target },
  Lifestyle: { color: '#f59fc7', icon: Sparkles },
  Other: { color: '#b6c1b0', icon: ReceiptText },
  Income: { color: '#7de1c3', icon: ArrowDownLeft },
};
const CATEGORIES = Object.keys(CATEGORY_META).filter((name) => name !== 'Income');
const money = (value) => new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', maximumFractionDigits: 0,
}).format(Number(value) || 0);
const shortMoney = (value) => {
  const n = Number(value) || 0;
  if (Math.abs(n) >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (Math.abs(n) >= 1000) return `₹${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return money(n);
};
const localISO = (date) => {
  const adjusted = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return adjusted.toISOString().slice(0, 10);
};
const offsetDate = (offset) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return localISO(d);
};
const formatDate = (date) => {
  if (!date) return 'Today';
  const parsed = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  const today = localISO(new Date());
  if (date === today) return 'Today';
  if (date === offsetDate(-1)) return 'Yesterday';
  return parsed.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};
const makeId = () => `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

function createDemoData() {
  const now = new Date();
  const monthDay = Math.min(30, Math.max(1, now.getDate()));
  const dateAt = (day) => {
    const d = new Date(now.getFullYear(), now.getMonth(), Math.min(day, 28), 12, 0, 0);
    return localISO(d);
  };
  return {
    startingBudget: STARTING_BUDGET,
    monthLength: 30,
    expenses: [
      { id: 'e1', title: 'Weekly groceries', amount: 680, category: 'Food', date: dateAt(Math.max(1, monthDay - 8)), note: 'Essentials' },
      { id: 'e2', title: 'Metro & auto', amount: 240, category: 'Transport', date: dateAt(Math.max(1, monthDay - 7)), note: '' },
      { id: 'e3', title: 'Coffee with friends', amount: 185, category: 'Food', date: dateAt(Math.max(1, monthDay - 6)), note: '' },
      { id: 'e4', title: 'Phone recharge', amount: 299, category: 'Bills', date: dateAt(Math.max(1, monthDay - 5)), note: '' },
      { id: 'e5', title: 'Notebook & pens', amount: 165, category: 'Learning', date: dateAt(Math.max(1, monthDay - 4)), note: 'College' },
      { id: 'e6', title: 'Lunch', amount: 210, category: 'Food', date: dateAt(Math.max(1, monthDay - 3)), note: '' },
      { id: 'e7', title: 'Movie night', amount: 420, category: 'Lifestyle', date: dateAt(Math.max(1, monthDay - 2)), note: '' },
      { id: 'e8', title: 'Bus pass top-up', amount: 350, category: 'Transport', date: dateAt(Math.max(1, monthDay - 1)), note: '' },
    ],
    incomes: [],
    goals: [
      { id: 'g1', name: 'Emergency buffer', target: 3000, saved: 650, emoji: '🛟', color: '#c2f970' },
      { id: 'g2', name: 'New headphones', target: 2500, saved: 350, emoji: '🎧', color: '#a99aff' },
      { id: 'g3', name: 'Weekend plans', target: 1200, saved: 0, emoji: '🌴', color: '#ffb38a' },
    ],
    commitments: [
      { id: 'c1', title: 'College fee instalment', amount: 900, dueDate: offsetDate(3), category: 'Education', paid: false },
      { id: 'c2', title: 'Mobile recharge', amount: 299, dueDate: offsetDate(5), category: 'Utilities', paid: false },
      { id: 'c3', title: 'Electricity share', amount: 450, dueDate: offsetDate(7), category: 'Utilities', paid: false },
    ],
    subscriptions: [
      { id: 's1', name: 'Spotify Student', amount: 59, renewalDate: offsetDate(2), active: true, icon: '♫' },
      { id: 's2', name: 'Cloud storage', amount: 89, renewalDate: offsetDate(6), active: true, icon: '☁' },
      { id: 's3', name: 'Streaming app', amount: 149, renewalDate: offsetDate(10), active: false, icon: '▶' },
    ],
  };
}

function readInitialData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDemoData();
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.expenses) || !Array.isArray(parsed.goals)) return createDemoData();
    return { ...createDemoData(), ...parsed };
  } catch {
    return createDemoData();
  }
}

function IconButton({ label, onClick, children, className = '' }) {
  return <button type="button" className={`icon-button ${className}`} aria-label={label} title={label} onClick={onClick}>{children}</button>;
}

function SectionHeading({ eyebrow, title, action, onAction }) {
  return <div className="section-heading"><div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h2>{title}</h2></div>{action && <button className="text-action" onClick={onAction}>{action}<ArrowRight size={15} /></button>}</div>;
}

function Modal({ title, subtitle, onClose, children }) {
  useEffect(() => {
    const listener = (event) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, [onClose]);
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="modal-heading"><div><h2 id="modal-title">{title}</h2>{subtitle && <p>{subtitle}</p>}</div><IconButton label="Close dialog" onClick={onClose}><X size={19} /></IconButton></div>
      {children}
    </section>
  </div>;
}

function Field({ label, children, hint }) {
  return <label className="field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>;
}

function ExpenseModal({ onClose, onSave }) {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Food');
  const [date, setDate] = useState(localISO(new Date()));
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const submit = (event) => {
    event.preventDefault();
    const parsedAmount = Number(amount);
    if (!title.trim()) return setError('Add a short description first.');
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0 || parsedAmount > 10000000) return setError('Enter an amount greater than ₹0.');
    onSave({ id: makeId(), title: title.trim().slice(0, 70), amount: Math.round(parsedAmount * 100) / 100, category, date, note: note.trim().slice(0, 120) });
    onClose();
  };
  return <Modal title="Add an expense" subtitle="Every rupee gets a place." onClose={onClose}>
    <form className="form-grid" onSubmit={submit}>
      <Field label="What did you spend on?"><input autoFocus maxLength={70} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Lunch with friends" /></Field>
      <div className="form-two"><Field label="Amount (₹)"><div className="input-with-icon"><IndianRupee size={16} /><input type="number" inputMode="decimal" min="1" max="10000000" step="1" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="250" /></div></Field><Field label="Category"><select value={category} onChange={(e) => setCategory(e.target.value)}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></Field></div>
      <Field label="Date"><input type="date" value={date} max={localISO(new Date())} onChange={(e) => setDate(e.target.value)} /></Field>
      <Field label="Note (optional)"><input maxLength={120} value={note} onChange={(e) => setNote(e.target.value)} placeholder="A little context" /></Field>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="form-actions"><button className="button button-quiet" type="button" onClick={onClose}>Cancel</button><button className="button button-primary" type="submit"><Plus size={16} /> Save expense</button></div>
    </form>
  </Modal>;
}

function IncomeModal({ onClose, onSave }) {
  const [source, setSource] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const submit = (event) => {
    event.preventDefault();
    const value = Number(amount);
    if (!source.trim()) return setError('Enter where the money came from.');
    if (!Number.isFinite(value) || value <= 0 || value > 10000000) return setError('Enter a valid amount.');
    onSave({ id: makeId(), title: source.trim().slice(0, 70), amount: Math.round(value * 100) / 100, date: localISO(new Date()) });
    onClose();
  };
  return <Modal title="Add money in" subtitle="Stipend, allowance, freelance gig — count it all." onClose={onClose}>
    <form className="form-grid" onSubmit={submit}>
      <Field label="Income source"><input autoFocus maxLength={70} value={source} onChange={(e) => setSource(e.target.value)} placeholder="e.g. Monthly allowance" /></Field>
      <Field label="Amount (₹)"><div className="input-with-icon"><IndianRupee size={16} /><input type="number" min="1" max="10000000" step="1" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="1500" /></div></Field>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="form-actions"><button className="button button-quiet" type="button" onClick={onClose}>Cancel</button><button className="button button-primary" type="submit"><Plus size={16} /> Add income</button></div>
    </form>
  </Modal>;
}

function GoalModal({ onClose, onSave }) {
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [emoji, setEmoji] = useState('✨');
  const [error, setError] = useState('');
  const submit = (event) => {
    event.preventDefault();
    const value = Number(target);
    if (!name.trim()) return setError('Give your goal a name.');
    if (!Number.isFinite(value) || value <= 0 || value > 10000000) return setError('Enter a valid target amount.');
    onSave({ id: makeId(), name: name.trim().slice(0, 50), target: Math.round(value), saved: 0, emoji, color: '#a99aff' });
    onClose();
  };
  return <Modal title="Create a savings goal" subtitle="Tiny moves still move you forward." onClose={onClose}>
    <form className="form-grid" onSubmit={submit}>
      <Field label="Goal name"><input autoFocus maxLength={50} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Goa trip" /></Field>
      <div className="form-two"><Field label="Target amount (₹)"><input type="number" min="1" max="10000000" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="3000" /></Field><Field label="Pick a vibe"><select value={emoji} onChange={(e) => setEmoji(e.target.value)}><option>✨</option><option>🎧</option><option>🛟</option><option>🌴</option><option>📚</option><option>💻</option><option>✈️</option></select></Field></div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="form-actions"><button className="button button-quiet" type="button" onClick={onClose}>Cancel</button><button className="button button-primary" type="submit"><Target size={16} /> Create goal</button></div>
    </form>
  </Modal>;
}

function CommitmentModal({ onClose, onSave }) {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState(offsetDate(5));
  const [error, setError] = useState('');
  const submit = (event) => {
    event.preventDefault();
    const value = Number(amount);
    if (!title.trim()) return setError('Add a name for this commitment.');
    if (!Number.isFinite(value) || value <= 0) return setError('Enter a valid amount.');
    onSave({ id: makeId(), title: title.trim().slice(0, 70), amount: Math.round(value), dueDate, category: 'Other', paid: false });
    onClose();
  };
  return <Modal title="Plan a commitment" subtitle="Reserve the money before it surprises you." onClose={onClose}>
    <form className="form-grid" onSubmit={submit}>
      <Field label="Bill or commitment"><input autoFocus maxLength={70} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Hostel electricity share" /></Field>
      <Field label="Amount (₹)"><input type="number" min="1" max="10000000" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="500" /></Field>
      <Field label="Due date"><input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></Field>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="form-actions"><button className="button button-quiet" type="button" onClick={onClose}>Cancel</button><button className="button button-primary" type="submit"><Plus size={16} /> Save commitment</button></div>
    </form>
  </Modal>;
}

function App() {
  const [data, setData] = useState(readInitialData);
  const [page, setPage] = useState('overview');
  const [modal, setModal] = useState(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [simTitle, setSimTitle] = useState('That little impulse buy');
  const [simAmount, setSimAmount] = useState(650);
  const [simCategory, setSimCategory] = useState('Shopping');
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch { /* Continue in memory if storage is unavailable. */ }
  }, [data]);

  const today = new Date();
  const dayNumber = Math.min(30, Math.max(1, today.getDate()));
  const daysRemaining = Math.max(0, 30 - dayNumber);
  const monthLabel = today.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  const derived = useMemo(() => {
    const totalIncome = data.incomes.reduce((sum, item) => sum + item.amount, 0);
    const totalExpenses = data.expenses.reduce((sum, item) => sum + item.amount, 0);
    const goalSavings = data.goals.reduce((sum, goal) => sum + goal.saved, 0);
    const unpaidCommitments = data.commitments.filter((item) => !item.paid).reduce((sum, item) => sum + item.amount, 0);
    const activeSubscriptions = data.subscriptions.filter((item) => item.active).reduce((sum, item) => sum + item.amount, 0);
    const totalFunds = data.startingBudget + totalIncome;
    const cashBalance = totalFunds - totalExpenses - goalSavings;
    const reserveTotal = unpaidCommitments + activeSubscriptions;
    const available = cashBalance - reserveTotal;
    const elapsed = Math.max(1, dayNumber);
    const averageDailySpend = totalExpenses / elapsed;
    const projectedVariableSpend = averageDailySpend * daysRemaining;
    const forecastBalance = available - projectedVariableSpend;
    const dailyAllowance = daysRemaining > 0 ? Math.max(0, available / daysRemaining) : Math.max(0, available);
    let risk = 'Healthy';
    let riskTone = 'good';
    if (forecastBalance < 0) { risk = 'Critical'; riskTone = 'bad'; }
    else if (forecastBalance < 1000) { risk = 'High risk'; riskTone = 'bad'; }
    else if (forecastBalance < 2500 || (daysRemaining > 0 && dailyAllowance < 100)) { risk = 'Watch closely'; riskTone = 'warning'; }
    const health = Math.max(8, Math.min(100, Math.round(100 * (forecastBalance / Math.max(totalFunds, 1)) + (available >= 0 ? 16 : 0) - Math.max(0, reserveTotal / Math.max(totalFunds, 1) * 10))));
    return { totalIncome, totalExpenses, goalSavings, unpaidCommitments, activeSubscriptions, totalFunds, cashBalance, reserveTotal, available, averageDailySpend, projectedVariableSpend, forecastBalance, dailyAllowance, risk, riskTone, health };
  }, [data, dayNumber, daysRemaining]);

  const filteredExpenses = useMemo(() => data.expenses.filter((expense) => {
    const matchesText = `${expense.title} ${expense.category} ${expense.note || ''}`.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'All' || expense.category === categoryFilter;
    return matchesText && matchesCategory;
  }).sort((a, b) => b.date.localeCompare(a.date)), [data.expenses, searchTerm, categoryFilter]);

  const categoryData = useMemo(() => CATEGORIES.map((category) => ({
    name: category,
    value: data.expenses.filter((expense) => expense.category === category).reduce((sum, expense) => sum + expense.amount, 0),
    color: CATEGORY_META[category].color,
  })).filter((item) => item.value > 0).sort((a, b) => b.value - a.value), [data.expenses]);

  const trendData = useMemo(() => {
    const dates = Array.from({ length: 7 }, (_, i) => offsetDate(i - 6));
    const allInDates = data.expenses.reduce((acc, expense) => {
      acc[expense.date] = (acc[expense.date] || 0) + expense.amount;
      return acc;
    }, {});
    const sortedDates = [...dates].sort();
    const firstDate = sortedDates[0];
    let runningBalance = derived.totalFunds - derived.goalSavings - data.expenses
      .filter((expense) => expense.date < firstDate)
      .reduce((sum, expense) => sum + expense.amount, 0);
    const chart = [];
    sortedDates.forEach((date) => {
      runningBalance -= allInDates[date] || 0;
      chart.push({ date, label: new Date(`${date}T12:00:00`).toLocaleDateString('en-IN', { weekday: 'short' }), spend: allInDates[date] || 0, remaining: Math.max(0, runningBalance) });
    });
    return chart;
  }, [data.expenses, derived.totalFunds, derived.goalSavings]);

  const addExpense = (expense) => setData((prev) => ({ ...prev, expenses: [expense, ...prev.expenses] }));
  const addIncome = (income) => setData((prev) => ({ ...prev, incomes: [income, ...prev.incomes] }));
  const deleteExpense = (id) => setData((prev) => ({ ...prev, expenses: prev.expenses.filter((expense) => expense.id !== id) }));
  const addGoal = (goal) => setData((prev) => ({ ...prev, goals: [...prev.goals, goal] }));
  const addCommitment = (commitment) => setData((prev) => ({ ...prev, commitments: [...prev.commitments, commitment] }));
  const contributeToGoal = (id, amount) => {
    if (!Number.isFinite(amount) || amount <= 0) return;
    const amountToAdd = Math.round(amount);
    const goal = data.goals.find((item) => item.id === id);
    if (!goal) return;
    if (amountToAdd > Math.max(0, derived.available)) return;
    setData((prev) => ({ ...prev, goals: prev.goals.map((item) => item.id === id ? { ...item, saved: Math.min(item.target, item.saved + amountToAdd) } : item) }));
  };
  const payCommitment = (commitment) => {
    if (commitment.paid) return;
    setData((prev) => ({
      ...prev,
      commitments: prev.commitments.map((item) => item.id === commitment.id ? { ...item, paid: true } : item),
      expenses: [{ id: makeId(), title: commitment.title, amount: commitment.amount, category: 'Bills', date: localISO(new Date()), note: 'Commitment paid' }, ...prev.expenses],
    }));
  };
  const toggleSubscription = (id) => setData((prev) => ({ ...prev, subscriptions: prev.subscriptions.map((item) => item.id === id ? { ...item, active: !item.active } : item) }));
  const applySimulation = () => {
    const amount = Number(simAmount);
    if (!Number.isFinite(amount) || amount <= 0 || amount > 10000000 || !simTitle.trim()) return;
    addExpense({ id: makeId(), title: simTitle.trim().slice(0, 70), amount: Math.round(amount), category: simCategory, date: localISO(new Date()), note: 'Added from Decision Lab' });
    setSimTitle('That little impulse buy');
    setSimAmount(650);
    setPage('overview');
  };
  const resetDemo = () => {
    localStorage.removeItem(STORAGE_KEY);
    setData(createDemoData());
    setSearchTerm('');
    setCategoryFilter('All');
    setShowResetConfirm(false);
  };
  const exportCsv = () => {
    const rows = [['Date', 'Description', 'Category', 'Amount (INR)', 'Note'], ...data.expenses.map((e) => [e.date, e.title, e.category, e.amount, e.note || ''])];
    const escapeCell = (cell) => `"${String(cell).replaceAll('"', '""')}"`;
    const csv = rows.map((row) => row.map(escapeCell).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'pocketwise-transactions.csv'; anchor.click(); URL.revokeObjectURL(url);
  };

  const navItems = [
    { id: 'overview', label: 'Overview', icon: Home },
    { id: 'transactions', label: 'Transactions', icon: ReceiptText, count: data.expenses.length },
    { id: 'goals', label: 'Savings goals', icon: Goal },
    { id: 'commitments', label: 'Bills & subs', icon: CreditCard },
  ];
  const navigate = (id) => { setPage(id); setMobileNavOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const pageTitles = { overview: 'Your money, in the open.', transactions: 'Every rupee has a story.', goals: 'Little wins add up.', commitments: 'Future you says thanks.' };
  const pageSubtitles = { overview: 'A little clarity goes a long way. Let’s make this month count.', transactions: 'Track what went out, spot patterns, and keep the receipts.', goals: 'Make space for the things you actually care about.', commitments: 'See what is coming up before it catches you off guard.' };

  return <div className="app-shell">
    <aside className={`sidebar ${mobileNavOpen ? 'sidebar-open' : ''}`}>
      <div className="brand-row"><div className="brand-mark"><Wallet size={21} strokeWidth={2.2} /></div><div className="brand-name">pocketwise<span>.</span><small>YOUR MONEY SIDEKICK</small></div><IconButton className="mobile-close" label="Close navigation" onClick={() => setMobileNavOpen(false)}><X size={18} /></IconButton></div>
      <div className="sidebar-section-label">YOUR SPACE</div>
      <nav className="side-nav" aria-label="Main navigation">{navItems.map(({ id, label, icon: Icon, count }) => <button key={id} className={`nav-item ${page === id ? 'active' : ''}`} onClick={() => navigate(id)} aria-current={page === id ? 'page' : undefined}><Icon size={18} strokeWidth={1.9} /><span>{label}</span>{count !== undefined && <span className="nav-count">{count}</span>}{page === id && <span className="nav-active-dot" />}</button>)}</nav>
      <div className="sidebar-budget-card"><div className="budget-card-top"><span className="mini-orb"><IndianRupee size={15} /></span><span className="live-dot">LIVE PLAN</span></div><p>Your 30-day mission</p><h3>Make ₹10k <em>last.</em></h3><div className="budget-line"><span>Budget used</span><b>{Math.min(100, Math.round((derived.totalExpenses / Math.max(derived.totalFunds, 1)) * 100))}%</b></div><div className="progress-track"><span style={{ width: `${Math.min(100, (derived.totalExpenses / Math.max(derived.totalFunds, 1)) * 100)}%` }} /></div><div className="budget-card-foot"><span>{money(derived.totalFunds - derived.totalExpenses)} left after spend</span><span>↗</span></div></div>
      <div className="sidebar-bottom"><div className="avatar-row"><div className="avatar">S</div><div className="avatar-text"><strong>Money learner</strong><span>Building better habits</span></div><IconButton label="Reset demo data" onClick={() => setShowResetConfirm(true)}><Ellipsis size={18} /></IconButton></div><div className="sidebar-footer"><span>Made for real life</span><span>✳</span></div></div>
    </aside>

    {mobileNavOpen && <button className="mobile-scrim" aria-label="Close navigation overlay" onClick={() => setMobileNavOpen(false)} />}

    <main className="main-content">
      <header className="topbar"><div className="topbar-left"><IconButton className="mobile-menu" label="Open navigation" onClick={() => setMobileNavOpen(true)}><Menu size={20} /></IconButton><div className="breadcrumbs"><span>My finances</span><span className="crumb-slash">/</span><strong>{navItems.find((item) => item.id === page)?.label || 'Overview'}</strong></div></div><div className="topbar-right"><div className="month-chip"><CalendarDays size={15} /><span>{monthLabel}</span><ChevronDown size={14} /></div><button className="notification-button" aria-label="Notifications"><Bell size={18} /><span /></button><button className="topbar-avatar" aria-label="Profile">S</button></div></header>
      <div className="page-wrap">
        <section className="page-intro"><div><div className="welcome-line"><span className="welcome-spark">✳</span> HEY THERE, MONEY HUMAN</div><h1>{pageTitles[page]}</h1><p>{pageSubtitles[page]}</p></div><div className="intro-actions"><button className="button button-quiet export-button" onClick={exportCsv}><Download size={16} /> Export</button><button className="button button-quiet funds-button" onClick={() => setModal('income')}><ArrowDownLeft size={16} /> Add funds</button><button className="button button-primary" onClick={() => setModal('expense')}><Plus size={17} /> Add expense</button></div></section>

        {page === 'overview' && <>
          <section className="hero-card"><div className="hero-copy"><div className="hero-pill"><span className="hero-pill-dot" /> YOUR 30-DAY MONEY QUEST</div><h2>You're not broke.<br /><span>You're becoming</span> <i>money smart.</i></h2><p>Small choices, big peace of mind. Keep an eye on your money today so tomorrow feels lighter.</p><div className="hero-actions"><button className="button button-lime" onClick={() => setPage('transactions')}>View my activity <ArrowUpRight size={16} /></button><span className="hero-footnote"><ShieldCheck size={15} /> Your data stays on this device</span></div></div><div className="hero-art" aria-hidden="true"><div className="art-glow" /><div className="art-ring ring-one" /><div className="art-ring ring-two" /><div className="art-spark spark-a">✳</div><div className="art-spark spark-b">✦</div><div className="art-coin coin-back">₹</div><div className="art-coin coin-front"><span>₹</span></div><div className="art-sticker">GOOD<br />VIBES<br /><span>ONLY</span></div><div className="art-bottom-note"><span>↗</span> YOUR MONEY, YOUR RULES</div></div><div className="hero-index">01 <span>/ 04</span></div></section>

          <section className="stats-grid" aria-label="Financial summary">
            <article className="stat-card balance-stat"><div className="stat-top"><span className="stat-icon stat-icon-lime"><Wallet size={18} /></span><span className="stat-tag positive"><span className="dot" /> SPENDABLE</span></div><p className="stat-label">Available balance</p><div className="stat-value">{money(derived.available)}</div><div className="stat-foot"><span>After bills & savings reserves</span><span className="stat-foot-icon"><ArrowDownRight size={16} /></span></div></article>
            <article className="stat-card"><div className="stat-top"><span className="stat-icon stat-icon-orange"><TrendingDown size={18} /></span><span className="stat-tag neutral">THIS MONTH</span></div><p className="stat-label">Spent so far</p><div className="stat-value">{money(derived.totalExpenses)}</div><div className="stat-foot"><span>{derived.totalExpenses <= derived.totalFunds * 0.5 ? 'Still room to breathe' : 'Time to check your pace'}</span><span className="stat-foot-icon orange"><ArrowUpRight size={16} /></span></div></article>
            <article className="stat-card"><div className="stat-top"><span className="stat-icon stat-icon-purple"><CalendarDays size={18} /></span><span className="stat-tag neutral">{daysRemaining} DAYS LEFT</span></div><p className="stat-label">Daily allowance</p><div className="stat-value">{money(derived.dailyAllowance)}</div><div className="stat-foot"><span>Based on money not reserved</span><span className="stat-foot-icon purple"><Activity size={16} /></span></div></article>
            <article className="stat-card health-stat"><div className="stat-top"><span className="stat-icon stat-icon-green"><HeartPulse size={18} /></span><span className={`stat-tag ${derived.riskTone === 'good' ? 'positive' : derived.riskTone === 'warning' ? 'caution' : 'negative'}`}>{derived.risk.toUpperCase()}</span></div><p className="stat-label">Money wellness</p><div className="health-value-row"><div className="stat-value">{derived.health}<span className="score-outof">/100</span></div><div className="health-ring" style={{ '--health': `${derived.health * 3.6}deg` }}><span>{derived.health >= 70 ? '✦' : derived.health >= 40 ? '↗' : '!'}</span></div></div><div className="stat-foot"><span>Based on your current forecast</span><span className="stat-foot-icon green"><ShieldCheck size={16} /></span></div></article>
          </section>

          <section className="dashboard-grid"><div className="panel spending-panel"><div className="panel-head"><SectionHeading eyebrow="THE BIG PICTURE" title="Spending rhythm" /><div className="legend-pill"><span /> Balance trend</div></div><div className="chart-summary"><div><span className="chart-summary-label">Tracked balance</span><strong>{money(Math.max(0, derived.totalFunds - derived.totalExpenses - derived.goalSavings))}</strong></div><span className="chart-summary-note"><span className="note-dot" /> Last 7 days</span></div><div className="balance-chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={trendData} margin={{ top: 12, right: 4, left: -22, bottom: 0 }}><defs><linearGradient id="balanceFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#c2f970" stopOpacity={0.24} /><stop offset="100%" stopColor="#c2f970" stopOpacity={0.01} /></linearGradient></defs><CartesianGrid stroke="#e7ebe4" strokeDasharray="3 5" vertical={false} /><XAxis dataKey="label" tick={{ fill: '#92998f', fontSize: 11 }} axisLine={false} tickLine={false} dy={8} /><YAxis tick={{ fill: '#92998f', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} /><Tooltip formatter={(value) => [money(value), 'Tracked balance']} labelFormatter={(label) => `Day: ${label}`} contentStyle={{ border: '1px solid #e4e8df', borderRadius: 12, boxShadow: '0 12px 30px #20291b14', fontSize: 12 }} /><Area type="monotone" dataKey="remaining" stroke="#7ba946" strokeWidth={2.5} fill="url(#balanceFill)" activeDot={{ r: 5, strokeWidth: 0, fill: '#7ba946' }} /></AreaChart></ResponsiveContainer></div><div className="chart-bottom"><span><i className="chart-dot lime-dot" /> Tracked balance</span><span><i className="chart-dot grey-dot" /> Transactions update this view</span></div></div>

            <div className="panel category-panel"><SectionHeading eyebrow="WHERE IT GOES" title="Spending mix" action="All transactions" onAction={() => navigate('transactions')} /><div className="donut-wrap"><div className="donut-chart"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={categoryData.length ? categoryData : [{ name: 'No spend', value: 1, color: '#edf0e9' }]} dataKey="value" nameKey="name" innerRadius={65} outerRadius={88} paddingAngle={categoryData.length ? 4 : 0} stroke="none" cornerRadius={4}>{(categoryData.length ? categoryData : [{ color: '#edf0e9' }]).map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}</Pie><Tooltip formatter={(value) => money(value)} contentStyle={{ border: '1px solid #e4e8df', borderRadius: 10, fontSize: 12 }} /></PieChart></ResponsiveContainer><div className="donut-center"><strong>{shortMoney(derived.totalExpenses)}</strong><span>TOTAL SPENT</span></div></div></div><div className="category-list">{categoryData.slice(0, 4).map((item) => <div className="category-row" key={item.name}><span className="category-key" style={{ background: item.color }} /><span className="category-name">{item.name}</span><div className="category-track"><span style={{ width: `${derived.totalExpenses ? (item.value / derived.totalExpenses) * 100 : 0}%`, background: item.color }} /></div><strong>{Math.round((item.value / Math.max(derived.totalExpenses, 1)) * 100)}%</strong></div>)}{categoryData.length === 0 && <p className="empty-small">Your spending mix will appear here.</p>}</div><div className="category-bottom"><span><span className="tiny-star">✳</span> Know your patterns, own your plan.</span></div></div></section>

          <section className="dashboard-grid lower-grid"><div className="panel decision-panel"><div className="decision-title-row"><div><p className="eyebrow">BEFORE YOU BUY</p><h2>Decision lab <span>✳</span></h2><p className="section-description">Try the choice before your wallet feels it.</p></div><span className="decision-chip"><Lightbulb size={14} /> WHAT IF?</span></div><div className="simulator-layout"><div className="sim-form"><Field label="What are you thinking of buying?"><input maxLength={70} value={simTitle} onChange={(e) => setSimTitle(e.target.value)} placeholder="That little impulse buy" /></Field><div className="sim-input-row"><Field label="Amount (₹)"><div className="input-with-icon"><IndianRupee size={15} /><input aria-label="Simulation amount in rupees" type="number" min="1" max="10000000" value={simAmount} onChange={(e) => setSimAmount(e.target.value)} /></div></Field><Field label="Category"><select value={simCategory} onChange={(e) => setSimCategory(e.target.value)}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></Field></div><div className="quick-amounts"><span>QUICK TRY</span>{[150, 350, 650, 1200].map((amount) => <button key={amount} className={Number(simAmount) === amount ? 'selected' : ''} onClick={() => setSimAmount(amount)}>₹{amount}</button>)}</div></div><div className="sim-preview"><div className="preview-orb"><Zap size={19} /></div><p className="eyebrow">AFTER THIS PURCHASE</p><div className="preview-balance">{money(derived.available - Math.max(0, Number(simAmount) || 0))}</div><span className="preview-caption">estimated spendable balance</span><div className="preview-divider" /><div className="preview-metric"><span>Daily allowance becomes</span><strong>{money(daysRemaining > 0 ? Math.max(0, (derived.available - Math.max(0, Number(simAmount) || 0)) / daysRemaining) : Math.max(0, derived.available - Math.max(0, Number(simAmount) || 0)))}</strong></div><div className={`preview-risk ${derived.available - (Number(simAmount) || 0) - derived.projectedVariableSpend < 0 ? 'preview-risk-bad' : ''}`}><span />{derived.available - (Number(simAmount) || 0) - derived.projectedVariableSpend < 0 ? 'This could push you over budget' : 'Your month is still in view'}</div><button className="button button-dark apply-button" onClick={applySimulation} disabled={!simTitle.trim() || !Number.isFinite(Number(simAmount)) || Number(simAmount) <= 0}>Yep, make it real <ArrowRight size={16} /></button></div></div><p className="simulation-disclaimer"><ShieldCheck size={14} /> A preview only. Nothing changes until you choose to apply it.</p></div>

            <div className="panel goals-preview-panel"><SectionHeading eyebrow="FUTURE YOU" title="Savings goals" action="All goals" onAction={() => navigate('goals')} /><div className="goals-mini-list">{data.goals.slice(0, 3).map((goal) => { const progress = Math.min(100, goal.target ? goal.saved / goal.target * 100 : 0); return <div className="goal-mini" key={goal.id}><div className="goal-mini-top"><span className="goal-emoji">{goal.emoji}</span><div className="goal-mini-name"><strong>{goal.name}</strong><span>{money(goal.saved)} of {money(goal.target)}</span></div><b>{Math.round(progress)}%</b></div><div className="progress-track goal-track"><span style={{ width: `${progress}%`, background: goal.color }} /></div></div>; })}{data.goals.length === 0 && <p className="empty-small">Your first savings goal starts here.</p>}</div><button className="button button-outline goal-add-button" onClick={() => setModal('goal')}><Plus size={16} /> Create a savings goal</button></div></section>

          <section className="bottom-split"><div className="panel recent-panel"><SectionHeading eyebrow="THE LATEST" title="Recent activity" action="See all" onAction={() => navigate('transactions')} /><TransactionList expenses={data.expenses.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4)} onDelete={deleteExpense} /></div><div className="forecast-card"><div className="forecast-top"><span className="forecast-icon"><Activity size={19} /></span><span className={`forecast-tag ${derived.riskTone}`}>{derived.risk}</span></div><p className="eyebrow">END-OF-MONTH ESTIMATE</p><h2>{money(derived.forecastBalance)}</h2><p className="forecast-copy">That's your projected money after expected spending, bills and active subscriptions.</p><div className="forecast-divider" /><div className="forecast-row"><span>Expected variable spend</span><strong>{money(derived.projectedVariableSpend)}</strong></div><div className="forecast-row"><span>Upcoming commitments</span><strong>{money(derived.reserveTotal)}</strong></div><div className="forecast-insight"><Sparkles size={15} /><span>{derived.forecastBalance < 0 ? 'Try pausing non-essentials and reviewing your bills.' : derived.forecastBalance < 1500 ? 'Keep non-essentials light until the month wraps.' : 'A little buffer can make a big difference.'}</span></div></div></section>
        </>}

        {page === 'transactions' && <section className="panel page-panel transactions-page"><div className="page-panel-heading"><div><p className="eyebrow">YOUR MONEY TRAIL</p><h2>Transaction history</h2><p className="section-description">{data.expenses.length} expenses logged · {money(derived.totalExpenses)} spent this month</p></div><button className="button button-primary" onClick={() => setModal('expense')}><Plus size={16} /> Add transaction</button></div><div className="filter-row"><div className="search-field"><Search size={17} /><input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search description or category" aria-label="Search transactions" /><kbd>⌕</kbd></div><label className="filter-select"><span>Category</span><select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}><option>All</option>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></label><button className="button button-quiet filter-reset" onClick={() => { setSearchTerm(''); setCategoryFilter('All'); }}><RotateCcw size={15} /> Reset</button></div><div className="table-scroll"><table className="transactions-table"><thead><tr><th>DESCRIPTION</th><th>CATEGORY</th><th>DATE</th><th className="align-right">AMOUNT</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{filteredExpenses.map((expense) => <TransactionRow key={expense.id} expense={expense} onDelete={deleteExpense} />)}</tbody></table>{filteredExpenses.length === 0 && <div className="empty-state"><span>🪴</span><strong>No transactions found</strong><p>Try another search or add your first expense.</p><button className="button button-primary" onClick={() => setModal('expense')}><Plus size={16} /> Add expense</button></div>}</div><div className="table-footer"><span>Showing <strong>{filteredExpenses.length}</strong> of <strong>{data.expenses.length}</strong> transactions</span><span>Stored locally on your device <ShieldCheck size={14} /></span></div></section>}

        {page === 'goals' && <section className="goals-page"><div className="page-panel-heading goals-page-heading"><div><p className="eyebrow">SAVE WITH A REASON</p><h2>Your goals, your pace.</h2><p className="section-description">Saved money is accounted for in your spendable balance.</p></div><button className="button button-primary" onClick={() => setModal('goal')}><Plus size={16} /> New goal</button></div><div className="goals-grid">{data.goals.map((goal) => { const progress = Math.min(100, goal.target ? goal.saved / goal.target * 100 : 0); const remaining = Math.max(0, goal.target - goal.saved); return <GoalCard key={goal.id} goal={goal} progress={progress} remaining={remaining} canContribute={derived.available} onContribute={(amount) => contributeToGoal(goal.id, amount)} onDelete={() => setData((prev) => ({ ...prev, goals: prev.goals.filter((item) => item.id !== goal.id) }))} />; })}{data.goals.length === 0 && <div className="empty-state goal-empty"><span>🎯</span><strong>Give your money a mission</strong><p>Create a goal and watch the progress grow.</p><button className="button button-primary" onClick={() => setModal('goal')}><Plus size={16} /> Create a savings goal</button></div>}<button className="new-goal-card" onClick={() => setModal('goal')}><span><Plus size={20} /></span><strong>Give a new dream a name</strong><small>Start a fresh savings goal</small></button></div><div className="goals-footnote"><ShieldCheck size={16} /><p>Contributing to a goal moves money out of your spendable balance, so your daily allowance updates automatically.</p></div></section>}

        {page === 'commitments' && <section className="commitments-page"><div className="commitment-summary-row"><div className="commitment-total-card"><span className="commitment-summary-icon"><CreditCard size={19} /></span><p>Upcoming bills & subscriptions</p><strong>{money(derived.reserveTotal)}</strong><small>Money to keep aside this month</small></div><div className="commitment-total-card"><span className="commitment-summary-icon sub-icon"><Zap size={19} /></span><p>Active subscriptions</p><strong>{data.subscriptions.filter((s) => s.active).length}</strong><small>{money(derived.activeSubscriptions)} per month</small></div><div className="commitment-total-card"><span className="commitment-summary-icon due-icon"><CalendarDays size={19} /></span><p>Pending commitments</p><strong>{data.commitments.filter((c) => !c.paid).length}</strong><small>Mark a bill paid to log it as an expense</small></div></div><div className="commitments-layout"><div className="panel commitments-panel"><div className="page-panel-heading"><div><p className="eyebrow">PLAN AHEAD</p><h2>Upcoming commitments</h2><p className="section-description">These are deducted from your spendable balance until you mark them paid.</p></div><button className="button button-primary" onClick={() => setModal('commitment')}><Plus size={16} /> Add bill</button></div><div className="commitment-list">{data.commitments.map((commitment) => <div className={`commitment-row ${commitment.paid ? 'commitment-paid' : ''}`} key={commitment.id}><div className="commitment-row-icon"><ReceiptText size={18} /></div><div className="commitment-info"><strong>{commitment.title}</strong><span>{commitment.paid ? 'Paid' : `Due ${formatDate(commitment.dueDate)}`} · {commitment.category}</span></div><div className="commitment-amount"><strong>{money(commitment.amount)}</strong><span className={commitment.paid ? 'paid-label' : 'pending-label'}>{commitment.paid ? 'PAID' : 'PLANNED'}</span></div>{!commitment.paid && <button className="button button-quiet mark-paid" onClick={() => payCommitment(commitment)}><Check size={15} /> Mark paid</button>}{commitment.paid && <span className="paid-check"><Check size={17} /></span>}</div>)}{data.commitments.length === 0 && <div className="empty-state"><span>🧾</span><strong>Nothing on the calendar</strong><p>Add a bill when you know it's coming.</p><button className="button button-primary" onClick={() => setModal('commitment')}><Plus size={15} /> Add a bill</button></div>}</div></div>
            <div className="panel subscriptions-panel"><SectionHeading eyebrow="RECURRING MONEY" title="Subscriptions" /><p className="section-description">Switch off what you don't need. Your reserve changes instantly.</p><div className="subscription-list">{data.subscriptions.map((sub) => <div className={`subscription-row ${!sub.active ? 'subscription-off' : ''}`} key={sub.id}><div className="subscription-logo">{sub.icon}</div><div className="subscription-copy"><strong>{sub.name}</strong><span>{sub.active ? `Renews ${formatDate(sub.renewalDate)}` : 'Paused for this month'}</span></div><strong className="subscription-price">{money(sub.amount)}<small>/mo</small></strong><button className={`toggle ${sub.active ? 'toggle-on' : ''}`} role="switch" aria-checked={sub.active} aria-label={`${sub.active ? 'Pause' : 'Activate'} ${sub.name}`} onClick={() => toggleSubscription(sub.id)}><span /></button></div>)}{data.subscriptions.length === 0 && <p className="empty-small">No subscriptions added yet.</p>}</div><div className="subscription-total"><span>Active monthly total</span><strong>{money(derived.activeSubscriptions)}</strong></div></div></div></section>}

        <footer className="app-footer"><span>✳ pocketwise <span className="footer-muted">— small steps, less money stress.</span></span><span className="footer-secure"><ShieldCheck size={14} /> Your data is saved locally <span className="footer-separator">·</span> No bank connection needed</span></footer>
      </div>
    </main>

    {modal === 'expense' && <ExpenseModal onClose={() => setModal(null)} onSave={addExpense} />}
    {modal === 'income' && <IncomeModal onClose={() => setModal(null)} onSave={addIncome} />}
    {modal === 'goal' && <GoalModal onClose={() => setModal(null)} onSave={addGoal} />}
    {modal === 'commitment' && <CommitmentModal onClose={() => setModal(null)} onSave={addCommitment} />}
    {showResetConfirm && <Modal title="Start fresh?" subtitle="This resets expenses, goals, bills and subscriptions to the demo data." onClose={() => setShowResetConfirm(false)}><div className="reset-warning"><ShieldAlert size={21} /><p>This action replaces your locally saved data. Export your transactions first if you want a copy.</p></div><div className="form-actions"><button className="button button-quiet" onClick={() => setShowResetConfirm(false)}>Keep my data</button><button className="button button-danger" onClick={resetDemo}><RotateCcw size={15} /> Reset demo</button></div></Modal>}
  </div>;
}

function TransactionList({ expenses, onDelete }) {
  if (!expenses.length) return <div className="empty-small">Nothing here yet. Add your first expense.</div>;
  return <div className="transaction-list">{expenses.map((expense) => { const meta = CATEGORY_META[expense.category] || CATEGORY_META.Other; const Icon = meta.icon; return <div className="transaction-row" key={expense.id}><div className="transaction-icon" style={{ '--category-color': meta.color }}><Icon size={17} /></div><div className="transaction-description"><strong>{expense.title}</strong><span>{expense.category} <i>·</i> {formatDate(expense.date)}</span></div><div className="transaction-money"><strong>−{money(expense.amount)}</strong><button className="delete-transaction" aria-label={`Delete ${expense.title}`} title="Delete transaction" onClick={() => onDelete(expense.id)}><X size={13} /></button></div></div>; })}</div>;
}

function TransactionRow({ expense, onDelete }) {
  const meta = CATEGORY_META[expense.category] || CATEGORY_META.Other;
  const Icon = meta.icon;
  return <tr><td><div className="table-description"><span className="table-category-icon" style={{ '--category-color': meta.color }}><Icon size={16} /></span><div><strong>{expense.title}</strong>{expense.note && <small>{expense.note}</small>}</div></div></td><td><span className="category-badge"><i style={{ background: meta.color }} />{expense.category}</span></td><td className="date-cell">{formatDate(expense.date)}</td><td className="align-right amount-cell">−{money(expense.amount)}</td><td><button className="row-more" aria-label={`Delete ${expense.title}`} title="Delete transaction" onClick={() => onDelete(expense.id)}><Ellipsis size={17} /></button></td></tr>;
}

function GoalCard({ goal, progress, remaining, canContribute, onContribute, onDelete }) {
  const [contribution, setContribution] = useState('200');
  const [showContribution, setShowContribution] = useState(false);
  const [error, setError] = useState('');
  const addContribution = () => {
    const amount = Number(contribution);
    if (!Number.isFinite(amount) || amount <= 0) return setError('Enter an amount above ₹0.');
    if (amount > canContribute) return setError('Not enough spendable balance for this contribution.');
    if (amount > remaining) return setError(`Only ${money(remaining)} needed to reach this goal.`);
    onContribute(amount); setShowContribution(false); setError('');
  };
  return <article className="goal-card"><div className="goal-card-top"><span className="goal-card-emoji" style={{ background: `${goal.color}35` }}>{goal.emoji}</span><button className="row-more" aria-label={`Remove ${goal.name}`} title="Remove goal" onClick={onDelete}><Ellipsis size={18} /></button></div><p className="eyebrow">SAVINGS GOAL</p><h3>{goal.name}</h3><div className="goal-amount-row"><strong>{money(goal.saved)}</strong><span>of {money(goal.target)}</span></div><div className="progress-track goal-card-track"><span style={{ width: `${progress}%`, background: goal.color }} /></div><div className="goal-progress-foot"><span>{remaining > 0 ? `${money(remaining)} to go` : 'Goal unlocked!'}</span><strong>{Math.round(progress)}%</strong></div><div className="goal-card-divider" />{showContribution ? <div className="contribution-form"><label htmlFor={`contribution-${goal.id}`}>Add to this goal</label><div className="contribution-controls"><div className="input-with-icon"><IndianRupee size={14} /><input id={`contribution-${goal.id}`} type="number" min="1" max={Math.min(canContribute, remaining)} value={contribution} onChange={(e) => setContribution(e.target.value)} /></div><button className="button button-primary" onClick={addContribution} disabled={remaining <= 0 || canContribute <= 0}>Save</button></div>{error && <small className="form-error">{error}</small>}<button className="cancel-contribution" onClick={() => { setShowContribution(false); setError(''); }}>Cancel</button></div> : <button className="button button-outline goal-contribute" disabled={remaining <= 0 || canContribute <= 0} onClick={() => setShowContribution(true)}>{remaining <= 0 ? <><Check size={15} /> Goal reached</> : <><Plus size={15} /> Add savings</>}</button>}</article>;
}

export default App;
