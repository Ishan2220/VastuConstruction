import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calendar as CalendarIcon, Clock, CheckCircle2, AlertTriangle, Plus, MapPin, ChevronLeft, ChevronRight, HardHat, CheckSquare, Square, Building2, CalendarDays, RefreshCw, Edit3, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';

interface CalendarEvent {
  id: string;
  dateStr: string; // YYYY-MM-DD
  title: string;
  type: 'MILESTONE' | 'POUR' | 'DELIVERY' | 'AUDIT' | 'TASK';
  site: string;
  time: string;
  completed: boolean;
  assignee?: string;
}

export default function CalendarPage() {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const [currentDate, setCurrentDate] = useState(() => {
    const savedDate = localStorage.getItem('vastu_calendar_month_v2');
    if (savedDate) return new Date(savedDate);
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });

  const [selectedDateStr, setSelectedDateStr] = useState(() => {
    return localStorage.getItem('vastu_calendar_selected_date_v2') || todayStr;
  });

  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);

  const [newEvent, setNewEvent] = useState<{
    title: string;
    dateStr: string;
    time: string;
    type: 'MILESTONE' | 'POUR' | 'DELIVERY' | 'AUDIT' | 'TASK';
    site: string;
    assignee: string;
  }>({
    title: '',
    dateStr: selectedDateStr || todayStr,
    time: '10:00 AM',
    type: 'MILESTONE',
    site: '',
    assignee: '',
  });

  const [events, setEvents] = useState<CalendarEvent[]>(() => {
    try {
      const saved = localStorage.getItem('vastu_calendar_events_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Failed to parse calendar events from localStorage', e);
    }
    return [];
  });

  // Save calendar month & date changes to localStorage
  useEffect(() => {
    localStorage.setItem('vastu_calendar_month_v2', currentDate.toISOString());
  }, [currentDate]);

  useEffect(() => {
    localStorage.setItem('vastu_calendar_selected_date_v2', selectedDateStr);
  }, [selectedDateStr]);

  // Save all event additions/completions/deletions immediately to localStorage
  useEffect(() => {
    localStorage.setItem('vastu_calendar_events_v2', JSON.stringify(events));
  }, [events]);

  // Also query backend API tasks & calendar events to keep calendar synchronized across sessions/devices
  useQuery({
    queryKey: ['calendar-events-sync'],
    queryFn: async () => {
      try {
        const [tasksRes, calRes] = await Promise.all([
          api.get('/tasks').catch(() => ({ data: { data: { data: [] } } })),
          api.get('/calendar').catch(() => ({ data: { data: [] } })),
        ]);

        const apiTasks = tasksRes?.data?.data?.data || [];
        const calEvents = calRes?.data?.data || calRes?.data?.data?.data || [];

        setEvents((prevEvents) => {
          const existingIds = new Set(prevEvents.map((e) => e.id));
          const newApiEvents: CalendarEvent[] = [];

          if (Array.isArray(calEvents)) {
            calEvents.forEach((c: any) => {
              const calId = `cal-${c.id}`;
              if (!existingIds.has(calId) && !existingIds.has(c.id)) {
                newApiEvents.push({
                  id: calId,
                  dateStr: c.startTime ? new Date(c.startTime).toISOString().split('T')[0] : todayStr,
                  title: c.title,
                  type: c.type || 'MILESTONE',
                  site: c.location || c.project?.name || 'Main Site',
                  time: new Date(c.startTime || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  completed: !!c.isCompleted,
                  assignee: 'Site Engineer',
                });
              }
            });
          }

          if (Array.isArray(apiTasks)) {
            apiTasks.forEach((t: any) => {
              const taskId = `api-${t.id}`;
              if (!existingIds.has(taskId) && !existingIds.has(t.id)) {
                newApiEvents.push({
                  id: taskId,
                  dateStr: t.dueDate ? t.dueDate.split('T')[0] : todayStr,
                  title: t.title,
                  type: t.priority === 'URGENT' || t.priority === 'HIGH' ? 'MILESTONE' : 'TASK',
                  site: t.project?.name || 'Corporate HQ',
                  time: '11:00 AM',
                  completed: t.status === 'COMPLETED',
                  assignee: t.assignee?.name || 'Assigned Engineer',
                });
              }
            });
          }

          if (newApiEvents.length > 0) {
            return [...prevEvents, ...newApiEvents];
          }
          return prevEvents;
        });
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'Failed to sync calendar events from server');
        console.error('Calendar sync error', err);
      }
      return true;
    },
  });

  // Calendar logic helpers
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 (Sun) to 6 (Sat)
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleGoToToday = () => {
    const now = new Date();
    const liveTodayStr = now.toISOString().split('T')[0];
    setCurrentDate(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDateStr(liveTodayStr);
    toast.info('Calendar synced to today live date.');
  };

  const toggleComplete = (id: string) => {
    setEvents((prev) =>
      prev.map((e) => {
        if (e.id === id) {
          const updated = { ...e, completed: !e.completed };
          if (id.startsWith('api-')) {
            const realId = id.replace('api-', '');
            api.put(`/tasks/${realId}`, { status: updated.completed ? 'COMPLETED' : 'IN_PROGRESS' })
               .catch((err: any) => toast.error(err.response?.data?.message || 'Failed to update task status'));
          }
          return updated;
        }
        return e;
      })
    );
    toast.success('Task status updated on calendar schedule & saved locally.');
  };

  const handleDeleteEvent = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm('Are you sure you want to delete this scheduled event / task from the calendar?')) return;
    setEvents((prev) => prev.filter((ev) => ev.id !== id));
    toast.success('Calendar event removed successfully.');
    try {
      if (id.startsWith('cal-')) {
        await api.delete(`/calendar/${id.replace('cal-', '')}`);
      } else if (id.startsWith('api-')) {
        await api.delete(`/tasks/${id.replace('api-', '')}`);
      } else {
        await api.delete(`/calendar/${id}`);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete event from server');
    }
  };

  const handleUpdateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent?.title) return;
    setEvents((prev) =>
      prev.map((ev) => (ev.id === editingEvent.id ? { ...editingEvent } : ev))
    );
    toast.success('Calendar event details updated successfully.');
    const realId = editingEvent.id.replace('cal-', '').replace('api-', '');
    try {
      if (editingEvent.id.startsWith('api-')) {
        await api.put(`/tasks/${realId}`, { title: editingEvent.title, dueDate: editingEvent.dateStr });
      } else {
        await api.put(`/calendar/${realId}`, {
          title: editingEvent.title,
          type: editingEvent.type || 'MILESTONE',
          startTime: new Date(editingEvent.dateStr).toISOString(),
          location: editingEvent.site,
        });
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update event on server');
    }
    setEditingEvent(null);
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEvent.title) {
      toast.error('Event title is required');
      return;
    }
    const createdId = String(Date.now());
    const created: CalendarEvent = {
      id: createdId,
      ...newEvent,
      completed: false,
    };

    setEvents((prev) => [created, ...prev]);
    setSelectedDateStr(newEvent.dateStr);
    toast.success('Milestone & task scheduled successfully onto calendar grid & permanently saved.');
    setIsScheduleOpen(false);

    // Also persist to backend API calendar & tasks database
    try {
      await api.post('/calendar', {
        title: newEvent.title,
        description: `Scheduled for ${newEvent.site} - Assigned to ${newEvent.assignee}`,
        type: newEvent.type === 'POUR' || newEvent.type === 'AUDIT' ? 'MILESTONE' : 'TASK',
        startTime: new Date(newEvent.dateStr).toISOString(),
        location: newEvent.site,
      });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save scheduled event to server');
    }

    setNewEvent({ title: '', dateStr: selectedDateStr, time: '10:00 AM', type: 'MILESTONE', site: 'Skyline Residency', assignee: 'Vikas Patil' });
  };

  // Filter tasks for selected date
  const tasksForSelectedDate = events.filter((e) => e.dateStr === selectedDateStr);
  // Filter future upcoming tasks after selected date
  const futureTasks = events.filter((e) => e.dateStr > selectedDateStr).sort((a, b) => a.dateStr.localeCompare(b.dateStr));

  // Build grid calendar days
  const calendarDays = [];
  // Padding cells before first day
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarDays.push({ dayNumber: null, dateStr: null });
  }
  // Days of month
  for (let day = 1; day <= daysInMonth; day++) {
    const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    calendarDays.push({ dayNumber: day, dateStr: dStr });
  }

  return (
    <div className="p-4 sm:p-6 space-y-5 min-h-full font-sans">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-violet-100/30 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-clay-violet text-[#7C6EF0] mb-2">
            <CalendarDays className="w-3.5 h-3.5" /> Live Master Schedule
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight font-heading">
            Calendar & Tasks
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Pours, inspections, deliveries & daily checklists.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleGoToToday}
            className="clay-card-sm px-4 py-2.5 text-slate-700 text-sm font-semibold transition-all"
          >
            Today ({new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })})
          </button>

          <button
            onClick={() => {
              setNewEvent((prev) => ({ ...prev, dateStr: selectedDateStr }));
              setIsScheduleOpen(true);
            }}
            className="clay-btn inline-flex items-center gap-2 px-4 py-2.5 text-sm"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Schedule Task</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Side: Interactive Monthly Grid Calendar (7 Cols) */}
        <div className="lg:col-span-7 clay-card p-4 sm:p-6 space-y-5 flex flex-col">
          {/* Calendar Month Selector & Header */}
          <div className="flex items-center justify-between border-b border-violet-100/30 pb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-800 font-heading">
                {monthNames[month]} {year}
              </h2>
              <span className="text-xs font-heading font-bold px-2 py-0.5 rounded-lg bg-clay-violet text-[#7C6EF0]">
                {daysInMonth} Days
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevMonth}
                className="p-2 rounded-xl border border-violet-100/40 hover:bg-violet-50/50 text-slate-500 transition-all"
                title="Previous Month"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={handleNextMonth}
                className="p-2 rounded-xl border border-violet-100/40 hover:bg-violet-50/50 text-slate-500 transition-all"
                title="Next Month"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Day Headers (Sun - Sat) */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((dayName, idx) => (
              <div
                key={dayName}
                className={`py-1.5 sm:py-2 text-[10px] sm:text-xs font-extrabold uppercase tracking-wider rounded-lg ${
                  idx === 0 || idx === 6 ? 'text-[#E5636C] bg-clay-rose' : 'text-slate-400 bg-white/40'
                }`}
              >
                {dayName}
              </div>
            ))}
          </div>

          {/* Calendar Grid Cells */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2 flex-1">
            {calendarDays.map((cell, idx) => {
              if (!cell.dayNumber || !cell.dateStr) {
                return <div key={`pad-${idx}`} className="min-h-[56px] sm:min-h-[90px] bg-white/20 rounded-xl border border-violet-100/20" />;
              }

              const isSelected = cell.dateStr === selectedDateStr;
              const isToday = cell.dateStr === todayStr;
              const cellEvents = events.filter((e) => e.dateStr === cell.dateStr);

              return (
                <div
                  key={cell.dateStr}
                  onClick={() => setSelectedDateStr(cell.dateStr!)}
                  className={`min-h-[56px] sm:min-h-[90px] p-1 sm:p-2 rounded-xl border transition-all cursor-pointer flex flex-col overflow-hidden relative group ${
                    isSelected
                      ? 'border-[#7C6EF0] ring-2 ring-[#7C6EF0]/20 bg-violet-50/40 shadow-md'
                      : isToday
                      ? 'border-[#F2A65A] bg-amber-50/30 ring-2 ring-[#F2A65A]/30'
                      : 'border-violet-100/30 bg-white/60 hover:border-[#7C6EF0]/30 hover:bg-violet-50/20'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center font-bold text-[10px] sm:text-xs font-heading transition-colors ${
                        isSelected
                          ? 'bg-[#7C6EF0] text-white'
                          : isToday
                          ? 'bg-[#F2A65A] text-white'
                          : 'text-slate-600 group-hover:bg-violet-100/50'
                      }`}
                    >
                      {cell.dayNumber}
                    </span>
                    {isToday && (
                      <span className="text-[8px] font-extrabold uppercase px-1 py-0.5 rounded-md bg-clay-amber text-[#F2A65A] hidden sm:inline">
                        T
                      </span>
                    )}
                  </div>

                  {/* Events preview inside cell */}
                  <div className="space-y-0.5 mt-1 overflow-hidden">
                    {cellEvents.slice(0, 2).map((ev) => (
                      <div
                        key={ev.id}
                        className={`text-[9px] sm:text-[10px] font-bold px-1 py-0.5 rounded-md truncate ${
                          ev.type === 'POUR'
                            ? 'bg-clay-violet text-[#7C6EF0]'
                            : ev.type === 'DELIVERY'
                            ? 'bg-clay-green text-[#5CB77E]'
                            : ev.type === 'AUDIT'
                            ? 'bg-clay-rose text-[#E5636C]'
                            : 'bg-white/60 text-slate-500'
                        }`}
                        title={ev.title}
                      >
                        {ev.completed ? '✓ ' : ''}{ev.title}
                      </div>
                    ))}
                    {cellEvents.length > 2 && (
                      <div className="text-[9px] font-bold text-slate-500 pl-1">
                        +{cellEvents.length - 2} more...
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between pt-3 border-t border-violet-100/30 text-[11px] text-slate-400 gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#7C6EF0]" /> Selected</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#F2A65A]" /> Today</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#5CB77E]" /> Delivery</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#E5636C]" /> Audit</span>
            </div>
          </div>
        </div>

        {/* Right Side Panel: Today's Tasks & Schedule (5 Cols) */}
        <div className="lg:col-span-5 space-y-5 flex flex-col justify-between">
          {/* Section 1: Tasks for Selected Date / Today */}
          <div className="clay-card p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-violet-100/30 pb-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#7C6EF0] bg-clay-violet px-2.5 py-1 rounded-lg">
                  {selectedDateStr === todayStr ? "Today's Schedule" : 'Date Inspection'}
                </span>
                <h3 className="text-lg sm:text-xl font-bold text-slate-800 mt-2 font-heading">
                  {new Date(selectedDateStr).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </h3>
              </div>
              <span className="text-xs font-heading font-bold bg-[#7C6EF0] text-white px-3 py-1.5 rounded-xl">
                {tasksForSelectedDate.length}
              </span>
            </div>

            {tasksForSelectedDate.length === 0 ? (
              <div className="py-8 text-center bg-white/40 rounded-xl border border-dashed border-violet-200/40 space-y-2">
                <CheckCircle2 className="w-8 h-8 text-violet-200 mx-auto" />
                <div className="text-sm font-bold text-slate-500">No tasks scheduled.</div>
                <button
                  onClick={() => {
                    setNewEvent((prev) => ({ ...prev, dateStr: selectedDateStr }));
                    setIsScheduleOpen(true);
                  }}
                  className="text-xs font-bold text-[#7C6EF0] hover:underline"
                >
                  + Schedule Task for {selectedDateStr}
                </button>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1 scrollbar-hide">
                {tasksForSelectedDate.map((ev) => (
                  <div
                    key={ev.id}
                    className={`p-3.5 rounded-xl border transition-all flex items-start gap-3 ${
                      ev.completed
                        ? 'bg-green-50/30 border-green-200/40 opacity-75'
                        : 'bg-white/60 border-violet-100/30 hover:border-[#7C6EF0]/30'
                    }`}
                  >
                    <button
                      onClick={() => toggleComplete(ev.id)}
                      className="mt-0.5 text-[#7C6EF0] hover:text-[#6558D3] transition-colors flex-shrink-0"
                      title={ev.completed ? 'Mark incomplete' : 'Mark complete'}
                    >
                      {ev.completed ? (
                        <CheckSquare className="w-5 h-5 text-[#5CB77E]" />
                      ) : (
                        <Square className="w-5 h-5 text-slate-300 hover:text-[#7C6EF0]" />
                      )}
                    </button>

                    <div className="space-y-1 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-[10px] font-heading font-bold uppercase px-2 py-0.5 rounded-lg ${
                          ev.type === 'POUR' ? 'bg-clay-violet text-[#7C6EF0]' :
                          ev.type === 'DELIVERY' ? 'bg-clay-green text-[#5CB77E]' :
                          ev.type === 'AUDIT' ? 'bg-clay-rose text-[#E5636C]' :
                          'bg-white/60 text-slate-500'
                        }`}>
                          {ev.type}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-mono font-semibold text-slate-500 flex items-center gap-1 mr-1">
                            <Clock className="w-3 h-3 text-slate-400" /> {ev.time}
                          </span>
                          <button
                            onClick={() => setEditingEvent(ev)}
                            className="p-1 text-slate-400 hover:text-[#7C6EF0] hover:bg-violet-50 rounded-lg transition-colors cursor-pointer"
                            title="Edit Event"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => handleDeleteEvent(ev.id, e)}
                            className="p-1 text-slate-400 hover:text-[#E5636C] hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete Event"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <h4 className={`text-sm font-bold font-heading ${ev.completed ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                        {ev.title}
                      </h4>

                      <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                        <span className="flex items-center gap-1 font-semibold text-[#7C6EF0]">
                          <MapPin className="w-3.5 h-3.5" /> {ev.site}
                        </span>
                        <span>Assignee: <strong className="text-slate-700">{ev.assignee || 'Engineer'}</strong></span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 2: Upcoming Future Tasks & Deadlines */}
          <div className="clay-card p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-violet-100/30 pb-3">
              <h3 className="text-base font-bold text-slate-800 font-heading">Upcoming Deadlines</h3>
              <span className="text-xs text-slate-400 font-semibold">Next 14 Days</span>
            </div>

            <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1 scrollbar-hide">
              {futureTasks.slice(0, 4).map((ft) => (
                <div
                  key={ft.id}
                  onClick={() => setSelectedDateStr(ft.dateStr)}
                  className="p-3 rounded-xl bg-white/60 border border-violet-100/30 hover:border-[#7C6EF0]/30 transition-all cursor-pointer flex items-center justify-between gap-3 group"
                >
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-slate-800 group-hover:text-[#7C6EF0] transition-colors font-heading">
                      {ft.title}
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-2">
                      <span className="font-semibold text-[#7C6EF0]">{ft.site}</span>
                      <span>•</span>
                      <span>{ft.assignee}</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 flex items-center gap-2">
                    <div className="text-xs font-heading font-bold text-slate-700 bg-clay-violet px-2 py-1 rounded-lg">
                      {ft.dateStr.split('-')[2]} {monthNames[Number(ft.dateStr.split('-')[1]) - 1].slice(0, 3)}
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditingEvent(ft); }}
                      className="p-1 text-slate-400 hover:text-[#7C6EF0] hover:bg-violet-50 rounded-lg transition-colors cursor-pointer"
                      title="Edit Event"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => handleDeleteEvent(ft.id, e)}
                      className="p-1 text-slate-400 hover:text-[#E5636C] hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Delete Event"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Schedule New Milestone Modal */}
      {isScheduleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
          <div className="clay-card w-full max-w-lg p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-violet-100/30 pb-4">
              <h3 className="text-lg font-bold text-slate-800 font-heading">Schedule Task</h3>
              <button
                onClick={() => setIsScheduleOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Task / Milestone Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Skyline Tower A - 10th Floor Column Shuttering Inspection"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  className="clay-input w-full px-3 py-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Scheduled Date *</label>
                  <input
                    type="date"
                    required
                    value={newEvent.dateStr}
                    onChange={(e) => setNewEvent({ ...newEvent, dateStr: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Time *</label>
                  <input
                    type="text"
                    required
                    placeholder="09:00 AM"
                    value={newEvent.time}
                    onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Task Category *</label>
                  <select
                    value={newEvent.type}
                    onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value as any })}
                    className="clay-input w-full px-3 py-2 text-sm"
                  >
                    <option value="MILESTONE">Site Milestone</option>
                    <option value="POUR">RCC / Slab Pouring</option>
                    <option value="DELIVERY">Material / Rebar Delivery</option>
                    <option value="AUDIT">Inspection & Structural Audit</option>
                    <option value="TASK">Daily Engineering Task</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Associated Site Project *</label>
                  <select
                    value={newEvent.site}
                    onChange={(e) => setNewEvent({ ...newEvent, site: e.target.value })}
                    className="clay-input w-full px-3 py-2 text-sm"
                  >
                    <option value="Skyline Residency">Skyline Residency</option>
                    <option value="Bandra Commercial">Bandra Commercial</option>
                    <option value="Pune Industrial Park">Pune Industrial Park</option>
                    <option value="Corporate HQ">Corporate HQ</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Assigned Engineer / Supervisor *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Vikas Patil (Senior Engineer)"
                  value={newEvent.assignee}
                  onChange={(e) => setNewEvent({ ...newEvent, assignee: e.target.value })}
                  className="clay-input w-full px-3 py-2 text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-violet-100/30">
                <button
                  type="button"
                  onClick={() => setIsScheduleOpen(false)}
                  className="px-4 py-2 rounded-xl border border-violet-100/40 text-slate-600 hover:bg-violet-50/30 text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="clay-btn px-5 py-2 text-sm"
                >
                  Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Event Modal */}
      {editingEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
          <div className="clay-card w-full max-w-lg p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-violet-100/30 pb-4">
              <h3 className="text-lg font-bold text-slate-800 font-heading">Edit Event</h3>
              <button
                onClick={() => setEditingEvent(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateEvent} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Task / Milestone Title *</label>
                <input
                  type="text"
                  required
                  value={editingEvent.title || ''}
                  onChange={(e) => setEditingEvent({ ...editingEvent, title: e.target.value })}
                  className="clay-input w-full px-3 py-2 text-sm font-semibold text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Date *</label>
                  <input
                    type="date"
                    required
                    value={editingEvent.dateStr || ''}
                    onChange={(e) => setEditingEvent({ ...editingEvent, dateStr: e.target.value })}
                    className="clay-input w-full px-3 py-2 text-sm font-semibold text-slate-800"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Event Type</label>
                  <select
                    value={editingEvent.type || 'MILESTONE'}
                    onChange={(e) => setEditingEvent({ ...editingEvent, type: e.target.value })}
                    className="clay-input w-full px-3 py-2 text-sm font-semibold text-slate-800"
                  >
                    <option value="MILESTONE">Milestone</option>
                    <option value="POUR">Pour</option>
                    <option value="DELIVERY">Delivery</option>
                    <option value="AUDIT">Audit</option>
                    <option value="TASK">Task</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Target Site</label>
                <input
                  type="text"
                  value={editingEvent.site || ''}
                  onChange={(e) => setEditingEvent({ ...editingEvent, site: e.target.value })}
                  className="clay-input w-full px-3 py-2 text-sm font-semibold text-slate-800"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-violet-100/30">
                <button
                  type="button"
                  onClick={() => setEditingEvent(null)}
                  className="px-4 py-2 rounded-xl border border-violet-100/40 text-slate-600 hover:bg-violet-50/30 text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="clay-btn px-5 py-2 text-sm"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
