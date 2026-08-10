import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Lock, CheckCircle2, UserX } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { VendorAttendanceView } from '@/components/attendance/VendorAttendanceView';

// Types
type PersonType = 'EMPLOYEE' | 'VENDOR_TEAMS';
type AttendanceStatus = 'PRESENT' | 'HALF_DAY' | 'ABSENT' | null;

interface Person {
  personId: string;
  name: string;
  role: string;
  status: AttendanceStatus;
  overtimeHours: number;
  absentReason?: string | null;
}

interface AttendanceData {
  date: string;
  isLocked: boolean;
  people: Person[];
}

interface CalendarSummary {
  [dateStr: string]: {
    marked: number;
    total: number;
  };
}

// Helpers
const formatDateStr = (date: Date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const formatMonthStr = (date: Date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return `${yyyy}-${mm}`;
};

const getInitials = (name?: string) => {
  if (!name) return '??';
  return name.split(' ').filter(Boolean).map(w => w[0]).join('').substring(0, 2).toUpperCase();
};

export default function AttendancePage() {
  const queryClient = useQueryClient();
  const today = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => formatDateStr(today), [today]);
  
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const selectedDateStr = formatDateStr(selectedDate);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date(today.getFullYear(), today.getMonth(), 1));
  const [personType, setPersonType] = useState<PersonType>('EMPLOYEE');
  
  const isToday = selectedDateStr === todayStr;
  const isPast = selectedDateStr < todayStr;
  
  // Local state for optimistic updates
  const [localPeople, setLocalPeople] = useState<Person[]>([]);
  const [successIds, setSuccessIds] = useState<Set<string>>(new Set());

  // Queries
  const { data: attendanceData, isLoading } = useQuery({
    queryKey: ['attendance', selectedDateStr, personType],
    queryFn: async () => {
      if (personType === 'VENDOR_TEAMS') return null;
      const res = await api.get<{ data: AttendanceData }>(`/attendance?date=${selectedDateStr}&type=${personType}`);
      return res.data.data;
    },
  });

  const { data: calendarSummary } = useQuery({
    queryKey: ['attendance-calendar', formatMonthStr(currentMonth), personType],
    queryFn: async () => {
      if (personType === 'VENDOR_TEAMS') return null;
      const res = await api.get<{ data: CalendarSummary }>(`/attendance/calendar-summary?month=${formatMonthStr(currentMonth)}&type=${personType}`);
      return res.data.data;
    },
  });

  useEffect(() => {
    if (attendanceData) {
      setLocalPeople(attendanceData.people);
    }
  }, [attendanceData]);

  // Mutations
  const updateMutation = useMutation({
    mutationFn: async (payload: { personId: string; personType: PersonType; date: string; status: AttendanceStatus; overtimeHours: number; absentReason?: string | null }) => {
      const res = await api.put('/attendance', payload);
      return res.data;
    },
    onSuccess: (_, variables) => {
      setSuccessIds(prev => new Set(prev).add(variables.personId));
      setTimeout(() => {
        setSuccessIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(variables.personId);
          return newSet;
        });
      }, 1500);
      queryClient.invalidateQueries({ queryKey: ['attendance-calendar'] });
      queryClient.invalidateQueries({ queryKey: ['attendance', variables.date, variables.personType] });
    },
    onError: (err: any, _vars, context: any) => {
      toast.error(err.response?.data?.message || err.message || 'Failed to update attendance');
      if (context?.previousData) {
        setLocalPeople(context.previousData);
      }
    },
  });

  const bulkMutation = useMutation({
    mutationFn: async (payload: { date: string; personType: PersonType; updates: any[] }) => {
      const res = await api.put('/attendance/bulk', payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success('All unmarked people marked present');
      queryClient.invalidateQueries({ queryKey: ['attendance', selectedDateStr, personType] });
      queryClient.invalidateQueries({ queryKey: ['attendance-calendar'] });
    },
    onError: () => {
      toast.error('Failed to mark all present');
    }
  });

  // Handlers
  const handleStatusChange = (personId: string, status: AttendanceStatus) => {
    if (attendanceData?.isLocked || isPast) return;
    
    const prevPeople = [...localPeople];
    const newPeople = localPeople.map(p => {
      if (p.personId === personId) {
        const newOvertime = status === 'ABSENT' ? 0 : p.overtimeHours;
        const newReason = status === 'ABSENT' ? p.absentReason : null;
        return { ...p, status, overtimeHours: newOvertime, absentReason: newReason };
      }
      return p;
    });
    setLocalPeople(newPeople);
    
    const person = newPeople.find(p => p.personId === personId);
    if (person) {
      updateMutation.mutate(
        { personId, personType, date: selectedDateStr, status, overtimeHours: status === 'ABSENT' ? 0 : person.overtimeHours, absentReason: person.absentReason },
        { 
          onError: (err: any) => {
            toast.error(err.response?.data?.message || err.message || 'Failed to update attendance');
            setLocalPeople(prevPeople);
          }
        }
      );
    }
  };

  const handleAbsentReasonChange = (personId: string, val: string) => {
    if (attendanceData?.isLocked || isPast) return;
    
    const prevPeople = [...localPeople];
    const newPeople = localPeople.map(p => {
      if (p.personId === personId) {
        return { ...p, absentReason: val };
      }
      return p;
    });
    setLocalPeople(newPeople);
    
    const person = newPeople.find(p => p.personId === personId);
    if (person && person.status === 'ABSENT') {
      updateMutation.mutate(
        { personId, personType, date: selectedDateStr, status: 'ABSENT', overtimeHours: 0, absentReason: val },
        { 
          onError: (err: any) => {
            toast.error(err.response?.data?.message || err.message || 'Failed to update attendance');
            setLocalPeople(prevPeople);
          }
        }
      );
    }
  };

  const handleOvertimeChange = (personId: string, val: string) => {
    if (attendanceData?.isLocked || isPast) return;
    let num = parseFloat(val);
    if (isNaN(num)) num = 0;
    if (num < 0) num = 0;
    if (num > 12) num = 12;

    const prevPeople = [...localPeople];
    const newPeople = localPeople.map(p => {
      if (p.personId === personId) {
        return { ...p, overtimeHours: num };
      }
      return p;
    });
    setLocalPeople(newPeople);
    
    const person = newPeople.find(p => p.personId === personId);
    if (person && person.status) {
      updateMutation.mutate(
        { personId, personType, date: selectedDateStr, status: person.status, overtimeHours: num },
        { 
          onError: (err: any) => {
            toast.error(err.response?.data?.message || err.message || 'Failed to update attendance');
            setLocalPeople(prevPeople);
          }
        }
      );
    }
  };

  const handleMarkAllPresent = () => {
    const unmarked = localPeople.filter(p => p.status === null);
    if (unmarked.length === 0) return;
    
    const updates = unmarked.map(p => ({
      personId: p.personId,
      status: 'PRESENT',
      overtimeHours: 0
    }));

    bulkMutation.mutate({
      date: selectedDateStr,
      personType,
      updates
    });
    
    setLocalPeople(prev => prev.map(p => p.status === null ? { ...p, status: 'PRESENT', overtimeHours: 0 } : p));
  };

  // Calendar rendering
  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  const startDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1; // Mon = 0
  
  const calendarDays = [];
  for (let i = 0; i < startDay; i++) {
    calendarDays.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i));
  }

  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));

  // Stats
  const stats = useMemo(() => {
    let present = 0, half = 0, absent = 0, totalOt = 0;
    localPeople.forEach(p => {
      if (p.status === 'PRESENT') present++;
      if (p.status === 'HALF_DAY') half++;
      if (p.status === 'ABSENT') absent++;
      totalOt += p.overtimeHours || 0;
    });
    return { present, half, absent, totalOt };
  }, [localPeople]);

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full font-sans">
      
      {/* LEFT COL: CALENDAR */}
      <div className="w-full lg:w-[340px] flex-shrink-0">
        <div className="rounded-3xl bg-white shadow-[6px_6px_12px_#e2e8f0,-6px_-6px_12px_#ffffff] p-5">
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} className="min-w-[40px] min-h-[40px] rounded-xl bg-violet-50 hover:bg-violet-100 flex items-center justify-center text-violet-700 transition-colors">
              <ChevronLeft size={20} />
            </button>
            <div className="font-heading font-bold text-gray-800 text-lg">
              {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </div>
            <button onClick={nextMonth} className="min-w-[40px] min-h-[40px] rounded-xl bg-violet-50 hover:bg-violet-100 flex items-center justify-center text-violet-700 transition-colors">
              <ChevronRight size={20} />
            </button>
          </div>
          
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
              <div key={i} className="text-[10px] font-semibold text-gray-400 uppercase text-center py-2 sm:hidden">{d}</div>
            ))}
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d, i) => (
              <div key={`desk-${i}`} className="text-[10px] font-semibold text-gray-400 uppercase text-center py-2 hidden sm:block">{d}</div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((date, i) => {
              if (!date) return <div key={`empty-${i}`} className="aspect-square" />;
              
              const dStr = formatDateStr(date);
              const isSel = dStr === selectedDateStr;
              const isTod = dStr === todayStr;
              const isFut = date > today && dStr !== todayStr;
              const daySummary = calendarSummary?.[dStr];
              
              let dotClass = "";
              if (daySummary && daySummary.marked > 0) {
                if (daySummary.marked === daySummary.total) dotClass = "bg-emerald-400";
                else dotClass = "bg-amber-400";
              }

              return (
                <button
                  key={dStr}
                  disabled={isFut}
                  onClick={() => setSelectedDate(date)}
                  className={`
                    aspect-square rounded-xl flex flex-col items-center justify-center relative transition-colors duration-200
                    ${isFut ? 'text-gray-300 cursor-not-allowed pointer-events-none' : 'cursor-pointer'}
                    ${!isFut && !isSel ? 'hover:bg-violet-50 text-gray-700' : ''}
                    ${isTod && !isSel ? 'ring-2 ring-violet-400 font-bold' : ''}
                    ${isSel ? 'bg-[#7C6EF0] text-white shadow-[0_4px_12px_rgba(124,110,240,0.4)] font-bold' : ''}
                  `}
                >
                  <span className="text-sm">{date.getDate()}</span>
                  {dotClass && (
                    <span className={`w-1 h-1 rounded-full absolute bottom-1.5 ${dotClass} ${isSel ? 'bg-white' : ''}`}></span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* RIGHT COL: LIST */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Category Switcher Dropdown */}
        <div className="flex justify-center lg:justify-start mb-6">
          <div className="relative inline-flex">
            <select
              value={personType}
              onChange={(e) => setPersonType(e.target.value as PersonType)}
              className="appearance-none bg-white border border-gray-200 text-violet-700 text-sm font-semibold rounded-xl px-4 py-2.5 pr-10 shadow-[4px_4px_8px_#e2e8f0,-4px_-4px_8px_#ffffff] focus:outline-none focus:ring-2 focus:ring-violet-400 transition-shadow cursor-pointer"
            >
              <option value="EMPLOYEE">Employees</option>
              <option value="VENDOR_TEAMS">Vendor Teams</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-violet-700">
              <svg className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
              </svg>
            </div>
          </div>
        </div>

        {personType === 'VENDOR_TEAMS' ? (
          <VendorAttendanceView selectedDateStr={selectedDateStr} isLocked={!!attendanceData?.isLocked || isPast} />
        ) : (
          <>
            {/* Date Banner */}
            <div className="mb-4 flex items-center">
              {isToday ? (
                <h2 className="text-base font-bold text-gray-900 font-heading">
                  Marking attendance for Today, {selectedDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                </h2>
              ) : (
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <h2 className="text-base font-bold text-gray-900 font-heading">
                    Viewing attendance for {selectedDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </h2>
                  <div className="inline-flex items-center gap-1 text-xs text-amber-600 bg-amber-50 rounded-full px-3 py-1 w-fit border border-amber-100">
                    <Lock size={12} />
                    <span>This date is locked — past attendance cannot be edited</span>
                  </div>
                </div>
              )}
            </div>

            {/* Summary Strip */}
            <div className="flex flex-wrap sm:flex-nowrap justify-around bg-violet-50 rounded-2xl p-3 mb-4 gap-2">
              <div className="flex flex-col items-center">
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Present</span>
                <span className="text-xl font-bold text-emerald-600">{stats.present}</span>
              </div>
              <div className="w-px bg-violet-200/50 hidden sm:block"></div>
              <div className="flex flex-col items-center">
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Half Day</span>
                <span className="text-xl font-bold text-amber-600">{stats.half}</span>
              </div>
              <div className="w-px bg-violet-200/50 hidden sm:block"></div>
              <div className="flex flex-col items-center">
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Absent</span>
                <span className="text-xl font-bold text-rose-600">{stats.absent}</span>
              </div>
              <div className="w-px bg-violet-200/50 hidden sm:block"></div>
              <div className="flex flex-col items-center">
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Total OT</span>
                <span className="text-xl font-bold text-violet-600">{stats.totalOt}</span>
              </div>
            </div>

            {/* Mark All Present */}
            {isToday && localPeople.some(p => p.status === null) && (
              <div className="mb-4 flex justify-end">
                <button
                  onClick={handleMarkAllPresent}
                  disabled={bulkMutation.isPending}
                  className="w-full sm:w-auto rounded-2xl bg-[#7C6EF0] text-white font-semibold px-5 py-3 text-sm shadow-[0_4px_14px_rgba(124,110,240,0.4)] disabled:opacity-50 transition-opacity"
                >
                  {bulkMutation.isPending ? 'Marking...' : 'Mark All Present'}
                </button>
              </div>
            )}

            {/* Attendance List */}
            <div className="flex-1 relative">
              {isLoading ? (
                <div className="flex justify-center py-10">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7C6EF0]"></div>
                </div>
              ) : localPeople.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-gray-400">
                    <UserX size={32} />
                  </div>
                  <h3 className="text-gray-900 font-bold text-lg mb-1">No Employees found</h3>
                  <p className="text-gray-500 text-sm">Add some employees to start marking attendance.</p>
                </div>
              ) : (
                <div className="space-y-2 pb-20 overflow-hidden">
                  <AnimatePresence mode="popLayout">
                    {localPeople.map((person) => {
                      const isLocked = !!attendanceData?.isLocked || isPast;
                      const showOt = person.status === 'PRESENT' || person.status === 'HALF_DAY';
                      const isSuccess = successIds.has(person.personId);

                      return (
                        <motion.div
                          key={person.personId}
                          layout
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="flex flex-col sm:flex-row sm:items-center justify-between bg-white rounded-2xl shadow-[4px_4px_8px_#e2e8f0,-4px_-4px_8px_#ffffff] p-3 gap-3"
                        >
                          {/* Left: Info */}
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-400 to-indigo-500 text-white font-bold flex items-center justify-center flex-shrink-0">
                              {getInitials(person.name)}
                            </div>
                            <div>
                              <div className="font-bold text-gray-900 text-sm flex items-center gap-2">
                                {person.name}
                                <AnimatePresence>
                                  {isSuccess && (
                                    <motion.div
                                      initial={{ opacity: 0, scale: 0.5 }}
                                      animate={{ opacity: 1, scale: 1 }}
                                      exit={{ opacity: 0, scale: 0.5 }}
                                    >
                                      <CheckCircle2 size={16} className="text-emerald-500" />
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                              <div className="text-xs text-gray-500">{person.role || 'General'}</div>
                            </div>
                          </div>

                          {/* Right: Controls */}
                          <div className="flex flex-wrap items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
                            
                            {/* Actions Group */}
                            <div className="flex items-center gap-1.5 p-1 bg-gray-50/80 rounded-[20px] border border-gray-100/50" style={{ opacity: isLocked ? 0.7 : 1 }}>
                              <button
                                disabled={isLocked}
                                onClick={() => handleStatusChange(person.personId, 'PRESENT')}
                                className={`min-w-[36px] min-h-[32px] rounded-full text-[11px] font-bold active:scale-95 transition-all ${
                                  person.status === 'PRESENT' ? 'bg-emerald-500 text-white shadow-sm' : 'text-gray-400 hover:bg-gray-200'
                                }`}
                              >
                                P
                              </button>
                              <button
                                disabled={isLocked}
                                onClick={() => handleStatusChange(person.personId, 'HALF_DAY')}
                                className={`min-w-[36px] min-h-[32px] rounded-full text-[11px] font-bold active:scale-95 transition-all ${
                                  person.status === 'HALF_DAY' ? 'bg-amber-500 text-white shadow-sm' : 'text-gray-400 hover:bg-gray-200'
                                }`}
                              >
                                H
                              </button>
                              <button
                                disabled={isLocked}
                                onClick={() => handleStatusChange(person.personId, 'ABSENT')}
                                className={`min-w-[36px] min-h-[32px] rounded-full text-[11px] font-bold active:scale-95 transition-all ${
                                  person.status === 'ABSENT' ? 'bg-rose-500 text-white shadow-sm' : 'text-gray-400 hover:bg-gray-200'
                                }`}
                              >
                                A
                              </button>
                            </div>

                             {/* Absent Reason */}
                             {person.status === 'ABSENT' && (
                               <div className="flex items-center gap-2 w-full sm:w-auto">
                                 <input
                                   type="text"
                                   placeholder="Reason for absence..."
                                   disabled={isLocked}
                                   value={person.absentReason || ''}
                                   onChange={(e) => {
                                     const prev = [...localPeople];
                                     setLocalPeople(prev.map(p => p.personId === person.personId ? { ...p, absentReason: e.target.value } : p));
                                   }}
                                   onBlur={(e) => handleAbsentReasonChange(person.personId, e.target.value)}
                                   className={`w-full sm:w-44 rounded-lg border border-gray-200 text-xs font-semibold px-2 py-1.5 outline-none focus:ring-2 focus:ring-[#7C6EF0]/40 transition-shadow ${
                                     isLocked ? 'bg-gray-50 text-gray-300' : 'bg-white text-gray-800'
                                   }`}
                                 />
                               </div>
                             )}

                             {/* Overtime */}
                             <div className={`flex items-center justify-center gap-2 min-w-[44px] min-h-[44px] transition-opacity ${showOt ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                               <span className="text-[10px] text-gray-400 font-medium">OT</span>
                               <input
                                 type="number"
                                 step="0.5"
                                 min="0"
                                 max="12"
                                 disabled={isLocked || !showOt}
                                 value={person.overtimeHours === 0 ? '' : person.overtimeHours}
                                 onChange={(e) => {
                                   const prev = [...localPeople];
                                   setLocalPeople(prev.map(p => p.personId === person.personId ? { ...p, overtimeHours: parseFloat(e.target.value) || 0 } : p));
                                 }}
                                 onBlur={(e) => handleOvertimeChange(person.personId, e.target.value)}
                                 placeholder="0"
                                 className={`w-14 rounded-lg border border-gray-200 text-center text-sm font-semibold py-1 outline-none focus:ring-2 focus:ring-violet-400 transition-shadow ${
                                   isLocked ? 'bg-gray-50 text-gray-300' : 'bg-white text-gray-800'
                                 }`}
                               />
                             </div>
                            
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
