import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CheckSquare,
  Plus,
  Search,
  Clock,
  CheckCircle2,
  AlertCircle,
  Building2,
  Calendar,
  Edit3,
  Trash2,
} from 'lucide-react';
import api from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';
import { CategorySelect } from '@/components/common/CategorySelect';
import { useQuickAddListener } from '@/hooks/useQuickAddListener';

export default function TasksPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isAddOpen, setIsAddOpen] = useState(false);
  useQuickAddListener('task', () => setIsAddOpen(true));
  const [editingTask, setEditingTask] = useState<any>(null);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    projectId: '',
    priority: 'HIGH',
    dueDate: new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString().split('T')[0],
  });

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks-all', statusFilter],
    queryFn: async () => {
      const query = statusFilter !== 'ALL' ? `?status=${statusFilter}` : '';
      const { data } = await api.get(`/tasks${query}`);
      return data.data?.data || [];
    },
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects-select'],
    queryFn: async () => {
      const { data } = await api.get('/projects');
      return data.data?.data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await api.post('/tasks', payload);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks-all'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
      toast.success('Site engineering task assigned');
      setIsAddOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to create task');
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data } = await api.put(`/tasks/${id}`, { status });
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks-all'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
      toast.success('Task status updated');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await api.put(`/tasks/${editingTask.id}`, payload);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks-all'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
      toast.success('Task details updated successfully');
      setEditingTask(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update task');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/tasks/${id}`);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks-all'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
      toast.success('Task deleted successfully');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to delete task');
    },
  });

  const handleUpdateTask = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      title: editingTask.title,
      description: editingTask.description,
      priority: editingTask.priority,
      status: editingTask.status,
    });
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title) {
      toast.error('Task title is required');
      return;
    }
    createMutation.mutate(newTask);
  };

  const filteredTasks = tasks.filter((t: any) =>
    t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 md:p-8 lg:p-8 space-y-6 min-h-full font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight font-heading">
            Site Engineering Tasks & Milestones
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Assign safety audits, RMC pouring schedules, scaffolding checks, and regulatory follow-ups.
          </p>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="clay-btn inline-flex items-center gap-2 px-4 py-2.5 text-white text-sm font-semibold transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Create Engineering Task</span>
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center clay-card p-4">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search tasks or site actions..."
            className="clay-input w-full pl-10 pr-4 py-2 text-sm"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
          {['ALL', 'TODO', 'IN_PROGRESS', 'COMPLETED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                statusFilter === st ? 'clay-card-sm text-[#7C6EF0]' : 'text-slate-600 hover:bg-white/40'
              }`}
            >
              {st === 'ALL' ? 'All Tasks' : st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3].map((i) => <div key={i} className="h-24 bg-white/40 rounded-2xl" />)}
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="clay-card p-12 text-center text-slate-400">No site engineering tasks listed.</div>
      ) : (
        <div className="clay-card overflow-hidden">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto scrollbar-hide">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-violet-100/30 text-xs font-bold uppercase text-slate-400">
                  <th className="p-4">Task</th>
                  <th className="p-4">Project</th>
                  <th className="p-4">Priority</th>
                  <th className="p-4">Due Date</th>
                  <th className="p-4">Assignee</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-violet-100/30 text-sm">
                {filteredTasks.map((task: any) => (
                  <tr key={task.id} className={`transition-colors ${task.status === 'COMPLETED' ? 'opacity-60 bg-white/30' : 'hover:bg-violet-50/50'}`}>
                    <td className="p-4 min-w-[200px]">
                      <div className={`font-bold text-base font-heading ${task.status === 'COMPLETED' ? 'line-through text-slate-500' : 'text-slate-800'}`}>
                        {task.title}
                      </div>
                      {task.description && <div className="text-xs text-slate-600 line-clamp-1 mt-1">{task.description}</div>}
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      {task.project ? (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-clay-violet text-[#7C6EF0]">
                          {task.project.name}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">-</span>
                      )}
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        task.priority === 'HIGH' || task.priority === 'URGENT'
                          ? 'bg-clay-rose text-[#E5636C]'
                          : task.priority === 'MEDIUM'
                          ? 'bg-clay-amber text-[#F2A65A]'
                          : 'bg-clay-blue text-[#4EA8DE]'
                      }`}>
                        {task.priority}
                      </span>
                    </td>
                    <td className="p-4 text-slate-500 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {task.dueDate ? formatDate(task.dueDate) : 'Soon'}
                      </div>
                    </td>
                    <td className="p-4 font-semibold text-slate-600 whitespace-nowrap">
                      {task.assignee?.name || 'Unassigned'}
                    </td>
                    <td className="p-4">
                      <select
                        value={task.status}
                        onChange={(e) => updateStatusMutation.mutate({ id: task.id, status: e.target.value })}
                        className="text-xs font-bold uppercase px-2 py-1.5 rounded-xl bg-white/50 border border-violet-100/40 text-slate-700 focus:outline-none cursor-pointer"
                      >
                        <option value="TODO">To Do</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="COMPLETED">Completed</option>
                      </select>
                    </td>
                    <td className="p-4 text-center whitespace-nowrap space-x-1">
                      {task.status !== 'COMPLETED' && (
                        <button
                          onClick={() => updateStatusMutation.mutate({ id: task.id, status: 'COMPLETED' })}
                          className="p-1.5 text-slate-400 hover:text-[#5CB77E] hover:bg-green-50 rounded-lg transition-colors cursor-pointer inline-block"
                          title="Mark Complete"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => setEditingTask(task)}
                        className="p-1.5 text-slate-400 hover:text-[#7C6EF0] hover:bg-violet-50 rounded-lg transition-colors cursor-pointer inline-block"
                        title="Edit Task Details"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Are you sure you want to delete task "${task.title}"?`)) {
                            deleteMutation.mutate(task.id);
                          }
                        }}
                        className="p-1.5 text-slate-400 hover:text-[#E5636C] hover:bg-rose-50 rounded-lg transition-colors cursor-pointer inline-block"
                        title="Delete Task"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden flex flex-col divide-y divide-violet-100/30">
            {filteredTasks.map((task: any) => (
              <div
                key={task.id}
                className={`p-4 flex flex-col gap-3 transition-colors ${
                  task.status === 'COMPLETED' ? 'opacity-60 bg-white/30' : 'hover:bg-violet-50/50'
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        task.priority === 'HIGH' || task.priority === 'URGENT'
                          ? 'bg-clay-rose text-[#E5636C]'
                          : task.priority === 'MEDIUM'
                          ? 'bg-clay-amber text-[#F2A65A]'
                          : 'bg-clay-blue text-[#4EA8DE]'
                      }`}>
                        {task.priority}
                      </span>
                      {task.project && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-clay-violet text-[#7C6EF0]">
                          {task.project.name}
                        </span>
                      )}
                    </div>
                    <select
                      value={task.status}
                      onChange={(e) => updateStatusMutation.mutate({ id: task.id, status: e.target.value })}
                      className="text-[10px] font-bold uppercase px-2 py-1 rounded-lg bg-white/50 border border-violet-100/40 text-slate-700 focus:outline-none"
                    >
                      <option value="TODO">To Do</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="COMPLETED">Done</option>
                    </select>
                  </div>
                  <h3 className={`font-bold text-base font-heading ${task.status === 'COMPLETED' ? 'line-through text-slate-500' : 'text-slate-800'}`}>
                    {task.title}
                  </h3>
                  {task.description && <p className="text-xs text-slate-600 line-clamp-2">{task.description}</p>}
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 pt-1">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> {task.dueDate ? formatDate(task.dueDate) : 'Soon'}
                    </span>
                    <span>•</span>
                    <span className="truncate max-w-[120px]">
                      {task.assignee?.name || 'Unassigned'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-violet-100/30">
                  <button
                    onClick={() => setEditingTask(task)}
                    className="p-1.5 text-slate-400 hover:text-[#7C6EF0] hover:bg-[#7C6EF0]/10 rounded-lg transition-colors cursor-pointer"
                    title="Edit Task Details"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Are you sure you want to delete task "${task.title}"?`)) {
                        deleteMutation.mutate(task.id);
                      }
                    }}
                    className="p-1.5 text-slate-400 hover:text-[#E5636C] hover:bg-[#E5636C]/10 rounded-lg transition-colors cursor-pointer"
                    title="Delete Task"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  {task.status !== 'COMPLETED' && (
                    <button
                      onClick={() => updateStatusMutation.mutate({ id: task.id, status: 'COMPLETED' })}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-clay-green text-[#5CB77E] text-[10px] font-bold transition-all hover:opacity-80"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Complete</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-slate-950/40 backdrop-blur-sm">
          <div className="clay-card w-full h-full sm:h-auto sm:max-w-md sm:rounded-2xl rounded-none p-4 sm:p-6 space-y-4 sm:space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-violet-100/30 pb-4">
              <h3 className="font-bold text-lg font-heading text-slate-800">Create Engineering Task</h3>
              <button onClick={() => setIsAddOpen(false)} className="text-slate-400 hover:text-slate-600 text-sm font-semibold">✕</button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <input
                type="text"
                required
                placeholder="Task Title (e.g. Scaffolding inspection floor 8) *"
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                className="clay-input w-full px-3 py-2 text-sm font-bold"
              />

              <select
                value={newTask.projectId}
                onChange={(e) => setNewTask({ ...newTask, projectId: e.target.value })}
                className="clay-input w-full px-3 py-2 text-sm"
              >
                <option value="">Select Project Site (Optional)</option>
                {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>

              <div className="grid grid-cols-2 gap-4">
                <CategorySelect
                  module="tasks"
                  value={newTask.priority}
                  onChange={(val) => setNewTask({ ...newTask, priority: val })}
                  defaultOptions={['LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'URGENT']}
                  placeholder="Select Priority/Category..."
                />

                <input
                  type="date"
                  value={newTask.dueDate}
                  onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                  className="clay-input w-full px-3 py-2 text-sm font-semibold"
                />
              </div>

              <textarea
                rows={3}
                placeholder="Specific instructions, checklist items, and safety standards..."
                value={newTask.description}
                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                className="clay-input w-full px-3 py-2 text-sm"
              />

              <div className="flex justify-end gap-3 pt-4 border-t border-violet-100/30">
                <button type="button" onClick={() => setIsAddOpen(false)} className="px-4 py-2 rounded-xl text-slate-600 text-sm font-semibold hover:bg-white/40">Cancel</button>
                <button type="submit" disabled={createMutation.isPending} className="clay-btn px-5 py-2 text-white text-sm font-semibold">Assign Task</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-slate-950/40 backdrop-blur-sm">
          <div className="clay-card w-full h-full sm:h-auto sm:max-w-md sm:rounded-2xl rounded-none p-4 sm:p-6 space-y-4 sm:space-y-6 max-h-[90vh] overflow-y-auto scrollbar-hide">
            <div className="flex items-center justify-between border-b border-violet-100/30 pb-4">
              <h3 className="font-bold text-lg font-heading text-slate-800">Update Engineering Task</h3>
              <button onClick={() => setEditingTask(null)} className="text-slate-400 hover:text-slate-600 text-sm font-semibold">✕</button>
            </div>
            <form onSubmit={handleUpdateTask} className="space-y-4">
              <input
                type="text"
                required
                placeholder="Task Title *"
                value={editingTask.title || ''}
                onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                className="clay-input w-full px-3 py-2 text-sm font-semibold"
              />
              <div className="grid grid-cols-2 gap-4">
                <CategorySelect
                  module="tasks"
                  value={editingTask.priority || 'HIGH'}
                  onChange={(val) => setEditingTask({ ...editingTask, priority: val })}
                  defaultOptions={['LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'URGENT']}
                  placeholder="Select Priority/Category..."
                />
                <select
                  value={editingTask.status || 'TODO'}
                  onChange={(e) => setEditingTask({ ...editingTask, status: e.target.value })}
                  className="clay-input w-full px-3 py-2 text-sm font-semibold"
                >
                  <option value="TODO">To Do</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </div>
              <textarea
                rows={3}
                placeholder="Specific instructions, checklist items, and safety standards..."
                value={editingTask.description || ''}
                onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })}
                className="clay-input w-full px-3 py-2 text-sm"
              />
              <div className="flex justify-end gap-3 pt-4 border-t border-violet-100/30">
                <button type="button" onClick={() => setEditingTask(null)} className="px-4 py-2 rounded-xl text-slate-600 text-sm font-semibold hover:bg-white/40">Cancel</button>
                <button type="submit" disabled={updateMutation.isPending} className="clay-btn px-5 py-2 text-white text-sm font-semibold">Save Updates</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
