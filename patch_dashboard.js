const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'client', 'src', 'pages', 'DashboardPage.tsx');
let content = fs.readFileSync(filePath, 'utf-8');

// The marker lines
const startMarker = '// ---- Sites State ----';
const endMarker = '// ---- Create Project Modal (API) ----';

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex === -1 || endIndex === -1) {
    console.error("Could not find markers");
    process.exit(1);
}

const replacement = `
  // ---- Dashboard Data Mappings (No Mock States) ----
  const sites = useMemo(() => {
    if (!serverDashboard?.activeSites) return [];
    return serverDashboard.activeSites.map((s: any) => ({
      id: s.id,
      name: s.name,
      location: s.city || 'Mumbai',
      progress: s.progress || 0,
      income: Number(s.contractValue) || 0,
      expense: 0,
    }));
  }, [serverDashboard]);

  const remindersList = useMemo(() => {
    if (!serverDashboard?.upcomingReminders) return [];
    return serverDashboard.upcomingReminders.map((r: any) => ({
      id: r.id,
      title: r.title || r.project?.name || 'Meeting',
      dateStr: new Date(r.startTime).toLocaleString(),
      tag: r.type || 'Meeting'
    }));
  }, [serverDashboard]);

  const expenseCategories = useMemo(() => {
    if (!serverDashboard?.expenseByCategory) return [];
    return serverDashboard.expenseByCategory.map((c: any, idx: number) => ({
      id: String(idx),
      name: c.type,
      amount: Number(c._sum?.amount) || 0,
      color: EXPENSE_COLORS[idx % EXPENSE_COLORS.length]
    }));
  }, [serverDashboard]);
  const totalExpCatAmount = expenseCategories.reduce((s, c) => s + c.amount, 0);

  const paymentModes = useMemo(() => {
    if (!serverDashboard?.paymentModeSummary) return [];
    const pmData = serverDashboard.paymentModeSummary.map((pm: any, idx: number) => ({
      id: String(idx),
      mode: pm.paymentMethod,
      amount: Number(pm._sum?.amount) || 0,
      pct: 0,
      color: PM_COLORS[idx % PM_COLORS.length],
      text: PM_TEXT_COLORS[idx % PM_TEXT_COLORS.length]
    }));
    const total = pmData.reduce((s: number, p: any) => s + p.amount, 0) || 1;
    return pmData.map((pm: any) => ({ ...pm, pct: Math.round((pm.amount / total) * 100) }));
  }, [serverDashboard]);
  const totalPaymentModeAmount = paymentModes.reduce((s, pm) => s + pm.amount, 0);

  const activities = useMemo(() => {
    if (!serverDashboard?.recentActivities) return [];
    return serverDashboard.recentActivities.map((a: any) => ({
      id: a.id,
      desc: \`\${a.action} \${a.entityType}\`,
      time: new Date(a.createdAt).toLocaleString(),
      type: 'PAYMENT'
    }));
  }, [serverDashboard]);

  const todayTasks = useMemo(() => {
    if (!serverDashboard?.todayTasks) return [];
    return serverDashboard.todayTasks.map((t: any) => ({
      id: t.id,
      title: t.title,
      time: t.dueDate ? new Date(t.dueDate).toLocaleTimeString() : '12:00 PM',
      priority: t.priority,
      completed: t.status === 'COMPLETED'
    }));
  }, [serverDashboard]);

  const leads = useMemo(() => {
    if (!serverDashboard?.recentLeads) return [];
    return serverDashboard.recentLeads.map((l: any, idx: number) => ({
      id: l.id,
      name: l.name,
      city: l.source || '',
      stage: l.status,
      date: new Date(l.createdAt).toLocaleDateString(),
      badge: BADGE_OPTIONS[idx % BADGE_OPTIONS.length]
    }));
  }, [serverDashboard]);

  const toggleTaskComplete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    toast.info('Status updates should be done in Tasks module');
  };

  `;

content = content.substring(0, startIndex) + replacement + content.substring(endIndex);

// Define editBtnSmall and deleteBtnSmall to return null so they render nothing in the UI!
content = content.replace(
  /const editBtnSmall = .*/g,
  "const editBtnSmall = (onClick: any) => null;"
);
content = content.replace(
  /const deleteBtnSmall = .*/g,
  "const deleteBtnSmall = (onClick: any) => null;"
);

// We need to keep openKpiEdit from crashing. Just define it as noop.
content = content.replace(
  /const overallProfit = /g,
  "const openKpiEdit = () => {};\n  const overallProfit = "
);

fs.writeFileSync(filePath, content, 'utf-8');
console.log("Successfully patched DashboardPage.tsx");
