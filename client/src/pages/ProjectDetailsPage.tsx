import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Briefcase,
  MapPin,
  Calendar,
  IndianRupee,
  ChevronLeft,
  TrendingUp,
  HardHat,
  CheckCircle2,
  Clock,
  AlertCircle,
  Edit3,
  Plus,
  FileText,
  User,
  Building2,
  Trash2,
  CloudRain,
  Sun,
  Cloud,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import api from '@/lib/api';
import { toast } from 'sonner';
import { useConfirm } from "@/components/ui/ConfirmProvider";
import PageHeader from '@/components/layout/PageHeader';

export default function ProjectDetailsPage() {
    const confirmDialog = useConfirm();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'PROGRESS' | 'TASKS' | 'DOCUMENTS' | 'MILESTONES'>('OVERVIEW');
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isProgressOpen, setIsProgressOpen] = useState(false);

  // Edit project state
  const [editForm, setEditForm] = useState({
    name: '',
    code: '',
    clientId: '',
    status: 'IN_PROGRESS',
    budget: '',
    contractValue: '',
    city: '',
    state: '',
    description: '',
    progress: 0,
  });

  // Progress log state
  const [progressForm, setProgressForm] = useState({
    progress: 0,
    title: '',
    description: '',
    weather: 'SUNNY',
  });

  const { data: project, isLoading } = useQuery({
    queryKey: ['project-details', id],
    queryFn: async () => {
      const { data } = await api.get(`/projects/${id}`);
      const proj = data.data;
      if (proj) {
        setEditForm({
          name: proj.name || '',
          code: proj.code || '',
          clientId: proj.clientId || '',
          status: proj.status || 'IN_PROGRESS',
          budget: String(proj.budget || 0),
          contractValue: String(proj.contractValue || 0),
          city: proj.city || 'Mumbai',
          state: proj.state || 'Maharashtra',
          description: proj.description || '',
          progress: Number(proj.progress) || 0,
        });
        setProgressForm((prev) => ({ ...prev, progress: Number(proj.progress) || 0 }));
      }
      return proj;
    },
    enabled: Boolean(id),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients-select'],
    queryFn: async () => {
      const { data } = await api.get('/clients');
      return data.data?.data || [];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (updatedData: any) => {
      const { data } = await api.put(`/projects/${id}`, updatedData);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-details', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
      toast.success('Project details updated successfully');
      setIsEditOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update project details');
    },
  });

  const progressMutation = useMutation({
    mutationFn: async (logData: any) => {
      const { data } = await api.post(`/projects/${id}/progress`, logData);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-details', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
      toast.success('Daily site progress logged successfully');
      setIsProgressOpen(false);
      setProgressForm({ progress: 0, title: '', description: '', weather: 'SUNNY' });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to log site progress');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`/projects/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
      toast.success('Project removed successfully');
      navigate('/projects');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to delete project');
    },
  });

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      ...editForm,
      budget: Number(editForm.budget) || 0,
      contractValue: Number(editForm.contractValue) || 0,
      progress: Number(editForm.progress) || 0,
    });
  };

  const handleProgressSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!progressForm.title || !progressForm.description) {
      toast.error('Please enter title and detailed progress description');
      return;
    }
    progressMutation.mutate({
      ...progressForm,
      progress: Number(progressForm.progress),
      date: new Date(),
    });
  };

  if (isLoading) {
    return (
      <div className="p-8 space-y-6 animate-pulse">
        <div className="h-10 w-48 bg-clay-violet/10 rounded-xl" />
        <div className="h-64 bg-clay-violet/10 rounded-2xl" />
        <div className="grid grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-36 bg-clay-violet/10 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-8 text-center space-y-4">
        <h2 className="text-2xl font-bold text-slate-800 font-heading">Project Not Found</h2>
        <p className="text-sm text-slate-500">The project you are looking for does not exist or has been archived.</p>
        <Link
          to="/projects"
          className="clay-btn inline-flex items-center gap-2 px-4 py-2"
        >
          <ChevronLeft className="w-4 h-4" /> Back to All Projects
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 lg:p-8 space-y-6 min-h-full font-sans pb-24">
      {/* Top Navigation Bar */}
      <PageHeader
        title={project.name}
        description={project.code || 'PROJ-01'}
        showBack={false}
        breadcrumbs={[
          { label: 'Projects', href: '/projects' },
          { label: project.name }
        ]}
      >
        <div className="flex items-center gap-3">
          <span className={`text-[11px] font-bold uppercase px-2.5 py-0.5 rounded-full border ${
            project.status === 'IN_PROGRESS'
              ? 'bg-clay-green/10 text-[#5CB77E] border-[#5CB77E]/30'
              : project.status === 'COMPLETED'
              ? 'bg-clay-blue/10 text-[#4EA8DE] border-[#4EA8DE]/30'
              : 'bg-clay-amber/10 text-[#F2A65A] border-[#F2A65A]/30'
          }`}>
            {(project.status || 'IN_PROGRESS').replace('_', ' ')}
          </span>
          <button
            onClick={() => setIsProgressOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#5CB77E] hover:bg-[#4ea16b] text-white text-sm font-bold shadow-md shadow-[#5CB77E]/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Log Daily Site Progress</span>
          </button>

          <button
            onClick={() => setIsEditOpen(true)}
            className="clay-btn inline-flex items-center gap-2 px-4 py-2"
          >
            <Edit3 className="w-4 h-4" />
            <span>Edit Details</span>
          </button>

          <button
            onClick={async () => {
              if (await confirmDialog({ title: 'Confirm Action', message: `Are you sure you want to remove project "${project.name}"?` })) {
                deleteMutation.mutate();
              }
            }}
            className="p-2.5 rounded-xl border border-[#E5636C]/30 bg-clay-rose/10 text-[#E5636C] hover:bg-[#E5636C]/20 transition-all shadow-sm"
            title="Delete Project"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </PageHeader>

      {/* Hero Valuation & Status Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="clay-card p-6 space-y-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Contract Value</span>
          <div className="text-2xl font-extrabold text-[#7C6EF0] font-heading">
            {formatCurrency(Number(project.contractValue || 0))}
          </div>
          <div className="text-xs text-slate-400 font-medium">Total approved valuation</div>
        </div>

        <div className="clay-card p-6 space-y-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Estimated Fee</span>
          <div className="text-2xl font-extrabold text-[#F2A65A] font-heading">
            {formatCurrency(Number(project.budget || 0))}
          </div>
          <div className="text-xs text-slate-400 font-medium">Cost limit allocation</div>
        </div>

        <div className="clay-card p-6 space-y-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Physical Completion</span>
          <div className="flex items-center justify-between">
            <div className="text-2xl font-extrabold text-[#5CB77E] font-heading">
              {project.progress || 0}%
            </div>
            <CheckCircle2 className="w-6 h-6 text-[#5CB77E]" />
          </div>
          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden mt-1 inner-shadow">
            <div
              className="h-full bg-gradient-to-r from-[#7C6EF0] to-[#5CB77E] rounded-full transition-all duration-500"
              style={{ width: `${project.progress || 0}%` }}
            />
          </div>
        </div>

        <div className="clay-card p-6 space-y-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Site Location</span>
          <div className="text-lg font-bold text-slate-800 flex items-center gap-2 font-heading">
            <MapPin className="w-5 h-5 text-[#E5636C]" />
            <span>{project.city || 'Mumbai'}, {project.state || 'Maharashtra'}</span>
          </div>
          <div className="text-xs text-slate-500 truncate font-medium">
            Client: <strong className="text-[#7C6EF0]">{project.client?.name || 'Unassigned Client'}</strong>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-violet-100/40 pb-2 overflow-x-auto scrollbar-hide">
        {(['OVERVIEW', 'MILESTONES', 'PROGRESS', 'TASKS', 'DOCUMENTS'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
              activeTab === tab
                ? 'bg-white text-[#7C6EF0] shadow-sm border border-violet-100/40'
                : 'bg-transparent text-slate-500 hover:text-slate-800 hover:bg-white/50 border border-transparent'
            }`}
          >
            {tab === 'OVERVIEW' && <Briefcase className="w-4 h-4" />}
            {tab === 'MILESTONES' && <CheckCircle2 className="w-4 h-4" />}
            {tab === 'PROGRESS' && <TrendingUp className="w-4 h-4" />}
            {tab === 'TASKS' && <CheckCircle2 className="w-4 h-4" />}
            {tab === 'DOCUMENTS' && <FileText className="w-4 h-4" />}
            <span>
              {tab === 'OVERVIEW' && 'Project Overview'}
              {tab === 'MILESTONES' && `Milestones (${project.milestones?.length || 0})`}
              {tab === 'PROGRESS' && `Daily Site Logs (${project.siteProgress?.length || 0})`}
              {tab === 'TASKS' && `Site Tasks (${project.tasks?.length || project._count?.tasks || 0})`}
              {tab === 'DOCUMENTS' && `Site Documents (${project._count?.documents || 2})`}
            </span>
          </button>
        ))}
      </div>

      {/* Tab Contents */}
      {activeTab === 'OVERVIEW' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 clay-card p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-800 font-heading">Contract Scope & Engineering Specifications</h3>
            <p className="text-sm text-slate-600 leading-relaxed bg-white/50 p-4 rounded-xl border border-violet-100/30 shadow-inner">
              {project.description ||
                'Full structural construction contract including foundation work, reinforced cement concrete (RCC) columns, structural framing, electrical plumbing conduits, and safety compliance according to municipal code guidelines.'}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-white/50 border border-violet-100/40 space-y-1">
                <div className="text-xs text-slate-500 font-bold uppercase">Assigned Project Client</div>
                <div className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <User className="w-4 h-4 text-[#7C6EF0]" />
                  <span>{project.client?.name || 'Mahindra Lifespaces'}</span>
                </div>
                <div className="text-xs text-slate-500 font-mono">{project.client?.phone || '+91 98111 22334'}</div>
              </div>

              <div className="p-4 rounded-xl bg-white/50 border border-violet-100/40 space-y-1">
                <div className="text-xs text-slate-500 font-bold uppercase">Assigned Site Engineer</div>
                <div className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <HardHat className="w-4 h-4 text-[#F2A65A]" />
                  <span>{project.engineer?.name || 'Vikas Patil (Senior Engineer)'}</span>
                </div>
                <div className="text-xs text-slate-500 font-mono">{project.engineer?.email || 'vikas.p@vastuconstruction.in'}</div>
              </div>
            </div>
          </div>

          {/* Timeline / Recent Activity */}
          <div className="clay-card p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-800 font-heading">Milestone Timeline</h3>
            <div className="space-y-4 border-l-2 border-violet-100/40 pl-4 py-1">
              {!project.timeline || project.timeline.length === 0 ? (
                <div className="py-6 text-slate-400 text-xs font-medium">No timeline milestones recorded for this project yet.</div>
              ) : (
                project.timeline.map((event: any) => (
                  <div key={event.id} className="relative space-y-1">
                    <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-[#7C6EF0] ring-4 ring-white" />
                    <div className="text-xs font-bold text-slate-800">{event.action}</div>
                    <div className="text-xs text-slate-500 leading-snug">{event.notes}</div>
                    <div className="text-[10px] text-slate-400 font-mono font-medium">
                      {new Date(event.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'PROGRESS' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between clay-card p-4">
            <div>
              <h3 className="text-base font-bold text-slate-800 font-heading">Daily Site Inspection Logs</h3>
              <p className="text-xs text-slate-500">Record physical progress percentages, weather conditions, and site inspector notes.</p>
            </div>
            <button
              onClick={() => setIsProgressOpen(true)}
              className="clay-btn px-4 py-2 text-xs"
            >
              + Add Today's Progress Log
            </button>
          </div>

          <div className="space-y-4">
            {!project.siteProgress || project.siteProgress.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs clay-card font-medium">
                No daily site progress logs added yet. Click "+ Add Today's Progress Log" above to record the first entry.
              </div>
            ) : (
              project.siteProgress.map((log: any) => (
                <div key={log.id} className="clay-card p-6 space-y-3">
                  <div className="flex items-start justify-between gap-4 border-b border-violet-100/40 pb-3">
                    <div>
                      <div className="flex items-center gap-2.5">
                        <span className="text-sm font-extrabold text-[#7C6EF0] font-mono px-2 py-0.5 rounded bg-clay-violet/10 border border-violet-100/40">
                          {log.progress}% Completion
                        </span>
                        <span className="text-xs font-bold uppercase px-2 py-0.5 rounded bg-white border border-violet-100/30 text-slate-600 flex items-center gap-1 shadow-sm">
                          {log.weather === 'SUNNY' && <Sun className="w-3.5 h-3.5 text-[#F2A65A]" />}
                          {log.weather === 'RAINY' && <CloudRain className="w-3.5 h-3.5 text-[#4EA8DE]" />}
                          {log.weather === 'CLOUDY' && <Cloud className="w-3.5 h-3.5 text-slate-400" />}
                          {log.weather}
                        </span>
                      </div>
                      <h4 className="text-base font-bold text-slate-800 mt-2 font-heading">{log.title}</h4>
                    </div>
                    <div className="text-right text-xs text-slate-400 font-mono">
                      {new Date(log.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      <div className="font-bold text-[#7C6EF0] mt-0.5">By: {log.createdBy?.name || 'Engineer'}</div>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed font-medium">{log.description}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'MILESTONES' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between clay-card p-4">
            <div>
              <h3 className="text-base font-bold text-slate-800 font-heading">Project Milestones</h3>
              <p className="text-xs text-slate-500">Track major phases and achievements.</p>
            </div>
            <button className="clay-btn px-4 py-2 text-xs">
              + Add Milestone
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {!project.milestones || project.milestones.length === 0 ? (
              <div className="md:col-span-2 p-8 text-center text-slate-400 text-xs clay-card font-medium">
                No milestones defined for this project yet.
              </div>
            ) : (
              project.milestones.map((m: any) => (
                <div key={m.id} className="clay-card-sm p-4 flex flex-col gap-2">
                  <div className="flex justify-between items-start">
                    <h4 className="font-bold text-slate-800 font-heading">{m.title}</h4>
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-clay-violet/10 text-[#7C6EF0] border border-violet-100/40">
                      {m.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium">{m.description}</p>
                  <div className="flex justify-between items-center mt-2 text-xs text-slate-400 font-bold">
                    <span>Due: {m.targetDate ? new Date(m.targetDate).toLocaleDateString() : 'N/A'}</span>
                    <span className="text-[#5CB77E]">Progress: {m.completionPct}%</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'TASKS' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between clay-card p-4">
            <div>
              <h3 className="text-base font-bold text-slate-800 font-heading">Site Tasks & Engineering Checklist</h3>
              <p className="text-xs text-slate-500">Tasks assigned to engineers, supervisors, and quality inspectors at {project.name}.</p>
            </div>
            <Link
              to="/tasks"
              className="clay-btn px-4 py-2 text-xs"
            >
              Manage All Tasks →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {!project.tasks || project.tasks.length === 0 ? (
              <div className="md:col-span-2 p-8 text-center text-slate-400 text-xs clay-card font-medium">
                No engineering checklist tasks assigned specifically to this project right now.
              </div>
            ) : (
              project.tasks.map((t: any) => (
                <div key={t.id} className="clay-card-sm p-4 flex items-start justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                        t.priority === 'URGENT' || t.priority === 'HIGH'
                          ? 'bg-clay-rose/10 text-[#E5636C] border-[#E5636C]/30'
                          : 'bg-clay-amber/10 text-[#F2A65A] border-[#F2A65A]/30'
                      }`}>
                        {t.priority}
                      </span>
                      <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> Due: {t.dueDate ? new Date(t.dueDate).toLocaleDateString('en-IN') : 'No Date'}
                      </span>
                    </div>
                    <div className="text-sm font-bold text-slate-800 font-heading">{t.title}</div>
                    <div className="text-xs text-slate-500 font-medium">Assignee: <strong className="text-[#7C6EF0]">{t.assignee?.name || 'Engineer'}</strong></div>
                  </div>
                  <CheckCircle2 
                    className={`w-5 h-5 cursor-pointer transition-colors ${t.status === 'COMPLETED' ? 'text-[#5CB77E]' : 'text-slate-300 hover:text-[#5CB77E]'}`}
                    onClick={async () => {
                      try {
                        const newStatus = t.status === 'COMPLETED' ? 'TODO' : 'COMPLETED';
                        await api.patch(`/tasks/${t.id}/status`, { status: newStatus });
                        toast.success('Task status updated');
                        queryClient.invalidateQueries({ queryKey: ['project-details', id] });
                      } catch (err) {
                        toast.error('Failed to update task');
                      }
                    }} 
                  />
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'DOCUMENTS' && (
        <div className="clay-card p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-violet-100/40 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-800 font-heading">Engineering Blueprints & Permits for {project.name}</h3>
              <p className="text-xs text-slate-500">Structural drawings, NOC approvals, and site test certificates.</p>
            </div>
            <Link
              to="/documents"
              className="clay-btn px-4 py-2 text-xs"
            >
              Open Document Vault →
            </Link>
          </div>

          <div className="divide-y divide-violet-100/40">
            {!project.documents || project.documents.length === 0 ? (
              <div className="py-6 text-center text-slate-400 text-xs font-medium">No documents uploaded specifically to this project yet.</div>
            ) : (
              project.documents.map((d: any) => (
                <div key={d.id} className="py-3.5 flex items-center justify-between hover:bg-white/50 rounded-xl px-2 transition-colors">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-[#7C6EF0]" />
                    <div>
                      <div className="text-sm font-bold text-slate-800 font-heading">{d.name || d.title || 'Project Blueprint'}</div>
                      <div className="text-xs text-slate-500 flex items-center gap-2 font-medium">
                        <span className="font-mono uppercase px-1.5 py-0.5 rounded bg-white border border-violet-100/30 text-slate-600">{d.category || 'DOCUMENT'}</span>
                        <span>• Size: {d.size || 'N/A'}</span>
                        <span>• Uploaded: {d.createdAt ? new Date(d.createdAt).toLocaleDateString() : 'Recently'}</span>
                      </div>
                    </div>
                  </div>
                  <a
                    href={d.fileUrl || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-clay-violet/10 text-[#7C6EF0] hover:bg-clay-violet/20 text-xs font-bold transition-colors"
                  >
                    View / Download
                  </a>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Edit Project Modal */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-slate-950/40 backdrop-blur-sm">
          <div className="clay-card w-full h-full sm:h-auto sm:max-w-lg sm:rounded-2xl rounded-none p-4 sm:p-6 space-y-4 sm:space-y-6 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-violet-100/40 pb-4">
              <h3 className="text-lg font-bold text-slate-800 font-heading">Edit Project Details: {project.name}</h3>
              <button
                onClick={() => setIsEditOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                Close ✕
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Project Code *</label>
                  <input
                    type="text"
                    required
                    value={editForm.code}
                    onChange={(e) => setEditForm({ ...editForm, code: e.target.value.toUpperCase() })}
                    className="clay-input font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Project Status *</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="clay-input"
                  >
                    <option value="IN_PROGRESS">IN PROGRESS (Active Site)</option>
                    <option value="PLANNING">PLANNING & BLUEPRINTING</option>
                    <option value="ON_HOLD">ON HOLD</option>
                    <option value="COMPLETED">COMPLETED & HANDED OVER</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Project Name *</label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="clay-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Physical Progress (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={editForm.progress}
                    onChange={(e) => setEditForm({ ...editForm, progress: Number(e.target.value) })}
                    className="clay-input font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Client Account</label>
                  <select
                    value={editForm.clientId}
                    onChange={(e) => setEditForm({ ...editForm, clientId: e.target.value })}
                    className="clay-input"
                  >
                    <option value="">Select Client</option>
                    {clients.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Contract Valuation (₹)</label>
                  <input
                    type="number"
                    value={editForm.contractValue}
                    onChange={(e) => setEditForm({ ...editForm, contractValue: e.target.value })}
                    className="clay-input font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Estimated Fee (₹)</label>
                  <input
                    type="number"
                    value={editForm.budget}
                    onChange={(e) => setEditForm({ ...editForm, budget: e.target.value })}
                    className="clay-input font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">City</label>
                  <input
                    type="text"
                    value={editForm.city}
                    onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                    className="clay-input"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">State</label>
                  <input
                    type="text"
                    value={editForm.state}
                    onChange={(e) => setEditForm({ ...editForm, state: e.target.value })}
                    className="clay-input"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Scope & Description</label>
                <textarea
                  rows={3}
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="clay-input"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-violet-100/40">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="px-4 py-2 rounded-xl border border-violet-100/40 text-slate-600 hover:bg-white text-sm font-bold shadow-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="clay-btn px-5 py-2 disabled:opacity-50"
                >
                  {updateMutation.isPending ? 'Saving Changes...' : 'Save Updated Details'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Log Progress Modal */}
      {isProgressOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-slate-950/40 backdrop-blur-sm">
          <div className="clay-card w-full h-full sm:h-auto sm:max-w-md sm:rounded-2xl rounded-none p-4 sm:p-6 space-y-4 sm:space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-violet-100/40 pb-4">
              <h3 className="text-lg font-bold text-slate-800 font-heading">Log Daily Site Progress</h3>
              <button
                onClick={() => setIsProgressOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                Close ✕
              </button>
            </div>

            <form onSubmit={handleProgressSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">New Completion (%) *</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    required
                    value={progressForm.progress}
                    onChange={(e) => setProgressForm({ ...progressForm, progress: Number(e.target.value) })}
                    className="clay-input font-mono font-bold text-[#7C6EF0]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Weather Condition *</label>
                  <select
                    value={progressForm.weather}
                    onChange={(e) => setProgressForm({ ...progressForm, weather: e.target.value })}
                    className="clay-input font-semibold"
                  >
                    <option value="SUNNY">Sunny / Clear</option>
                    <option value="CLOUDY">Cloudy / Overcast</option>
                    <option value="RAINY">Rainy / Wet Site</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Progress Title / Headline *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 10th Floor Column Shuttering & Steel Reinforcement"
                  value={progressForm.title}
                  onChange={(e) => setProgressForm({ ...progressForm, title: e.target.value })}
                  className="clay-input"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Inspection & Work Notes *</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Detail exact work completed by masons, bar benders, and concrete mixers. Mention any delays or quality checks..."
                  value={progressForm.description}
                  onChange={(e) => setProgressForm({ ...progressForm, description: e.target.value })}
                  className="clay-input"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-violet-100/40">
                <button
                  type="button"
                  onClick={() => setIsProgressOpen(false)}
                  className="px-4 py-2 rounded-xl border border-violet-100/40 text-slate-600 hover:bg-white text-sm font-bold shadow-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={progressMutation.isPending}
                  className="px-5 py-2 rounded-xl bg-[#5CB77E] hover:bg-[#4ea16b] text-white text-sm font-bold shadow-md disabled:opacity-50"
                >
                  {progressMutation.isPending ? 'Logging...' : 'Submit Site Log'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
