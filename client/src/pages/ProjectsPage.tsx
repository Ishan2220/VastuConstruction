import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { staggerContainer, fadeInUp, clayCardHover } from '@/animations';
import {
  Briefcase,
  Plus,
  Search,
  MapPin,
  Calendar,
  IndianRupee,
  ChevronRight,
  TrendingUp,
  HardHat,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  Edit3,
  Trash2,
} from 'lucide-react';
import { CacheManager } from '@/lib/CacheManager';
import { formatCurrency, formatDate } from '@/lib/utils';
import api from '@/lib/api';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';
import { AutocompleteInput } from '@/components/ui/AutocompleteInput';
import { useQuickAddListener } from '@/hooks/useQuickAddListener';
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { PageSkeleton } from '@/components/ui/PageSkeleton';
import { CategorySelect } from '@/components/common/CategorySelect';

const MAHARASHTRA_CITIES = [
  'Mumbai',
  'Pune',
  'Nagpur',
  'Thane',
  'Nashik',
  'Chhatrapati Sambhajinagar',
  'Solapur',
  'Kalyan-Dombivli',
  'Vasai-Virar',
  'Pimpri-Chinchwad',
  'Navi Mumbai',
  'Amravati',
  'Nanded',
  'Kolhapur',
  'Ulhasnagar',
  'Sangli',
  'Malegaon',
  'Akola',
  'Latur',
  'Dhule',
  'Ahmednagar',
  'Chandrapur',
  'Parbhani',
  'Ichalkaranji',
  'Jalna',
  'Ambarnath',
  'Bhusawal',
  'Panvel',
  'Ratnagiri',
  'Beed',
  'Gondia',
  'Satara',
  'Yavatmal',
  'Wardha',
  'Bhandara'
];

export default function ProjectsPage() {
    const confirmDialog = useConfirm();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);

  useQuickAddListener('project', () => setIsCreateOpen(true));

  // New project state
  const [newProject, setNewProject] = useState({
    name: '',
    clientId: '',
    siteEngineerName: '',
    status: 'IN_PROGRESS',
    budget: '',
    contractValue: '',
    city: 'Mumbai',
    state: 'Maharashtra',
    areaAddress: '',
    primaryNumber: '',
    secondaryNumber: '',
    description: '',
  });

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects', statusFilter],
    queryFn: async () => {
      const query = statusFilter !== 'ALL' ? `?status=${statusFilter}` : '';
      const { data } = await api.get(`/projects${query}`);
      return data.data?.data || [];
    },
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients-select'],
    queryFn: async () => {
      const { data } = await api.get('/clients');
      return data.data?.data || [];
    },
  });

  const { data: engineers = [] } = useQuery({
    queryKey: ['engineers-select'],
    queryFn: async () => {
      const { data } = await api.get('/employees');
      const emps = data.data || [];
      return emps.filter((e: any) => e.user?.role === 'ENGINEER');
    },
  });

  const createMutation = useMutation({
    mutationFn: async (projectData: any) => {
      const { data } = await api.post('/projects', projectData);
      return data.data;
    },
    onSuccess: () => {
      CacheManager.invalidateOnProject(queryClient);
      toast.success('Project created successfully');
      setIsCreateOpen(false);
      setNewProject({
        name: '',
        clientId: '',
        siteEngineerName: '',
        status: 'IN_PROGRESS',
        budget: '',
        contractValue: '',
        city: 'Mumbai',
        state: 'Maharashtra',
        areaAddress: '',
        primaryNumber: '',
        secondaryNumber: '',
        description: '',
      });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to create project');
    },
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProject.name || !newProject.clientId) {
      toast.error('Please fill required fields (Name, Client)');
      return;
    }
    createMutation.mutate({
      ...newProject,
      budget: Number(newProject.budget) || 0,
      contractValue: Number(newProject.contractValue) || 0,
      startDate: new Date(),
    });
  };

  const updateMutation = useMutation({
    mutationFn: async (updatedData: any) => {
      const { data } = await api.put(`/projects/${editingProject.id}`, updatedData);
      return data.data;
    },
    onSuccess: () => {
      CacheManager.invalidateOnProject(queryClient);
      toast.success('Project updated successfully');
      setEditingProject(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update project');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/projects/${id}`);
    },
    onSuccess: () => {
      CacheManager.invalidateOnProject(queryClient);
      toast.success('Project site removed successfully');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to delete project site');
    },
  });

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject) return;
    updateMutation.mutate({
      name: editingProject.name,
      siteEngineerName: editingProject.siteEngineerName,
      status: editingProject.status,
      budget: Number(editingProject.budget) || 0,
      contractValue: Number(editingProject.contractValue) || 0,
      progress: Number(editingProject.progress) || 0,
      description: editingProject.description,
      expectedCompletion: editingProject.expectedCompletion,
      actualCompletion: editingProject.actualCompletion,
      city: editingProject.city,
      areaAddress: editingProject.areaAddress,
      primaryNumber: editingProject.primaryNumber,
      secondaryNumber: editingProject.secondaryNumber,
    });
  };

  const filteredProjects = projects.filter((p: any) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.projectCode && p.projectCode.toLowerCase().includes(searchTerm.toLowerCase())) ||
    p.city?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) return <PageSkeleton />;

  return (
    <div className="p-4 md:p-8 lg:p-8 space-y-6 min-h-full font-sans pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight font-heading">
            Construction Projects & Timeline
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Monitor contract valuations, site progress, milestones, and resource allocation.
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 clay-btn text-white text-sm font-semibold transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Project</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center clay-card p-4">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search projects by name, code, or city..."
            className="w-full pl-10 pr-4 py-2 clay-input text-sm"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto scrollbar-hide">
          {['ALL', 'IN_PROGRESS', 'PLANNING', 'COMPLETED', 'ON_HOLD'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                statusFilter === status
                  ? 'clay-card-sm text-[#7C6EF0]'
                  : 'text-slate-500 hover:bg-violet-50/50 hover:text-slate-700'
              }`}
            >
              {status === 'ALL' ? 'All Contracts' : status.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Projects Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 bg-slate-200 rounded-2xl" />
          ))}
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="clay-card p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-clay-violet/20 text-[#7C6EF0] mx-auto flex items-center justify-center">
            <Briefcase className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 font-heading">No projects found</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Try adjusting your search criteria or create a new project contract to begin site tracking.
          </p>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto clay-card !p-0">
            <table className="w-full">
              <thead>
                <tr className="border-b border-violet-100/40">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Project</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Client & Location</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Timeline</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Value</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Status & Progress</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-violet-100/30">
                {filteredProjects.map((project: any) => (
                  <tr key={project.id} onClick={() => navigate(`/projects/${project.id}/dashboard`)} className="hover:bg-white/60 transition-colors group cursor-pointer">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-800">{project.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-slate-800">{project.client?.name || 'N/A'}</span>
                        <span className="text-xs text-slate-500">{project.address ? `${project.address}, ${project.city}` : `${project.city}, ${project.state}`}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col text-xs text-slate-600">
                        <span>{project.startDate ? formatDate(project.startDate) : 'Not Set'} - </span>
                        <span>{project.expectedCompletion ? formatDate(project.expectedCompletion) : 'Not Set'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="font-heading text-sm font-extrabold text-slate-900">
                        {formatCurrency(Number(project.contractValue || 0))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col items-center gap-2 min-w-[44px] min-h-[44px] flex items-center justify-center">
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                          project.status === 'IN_PROGRESS'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : project.status === 'COMPLETED'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {project.status.replace('_', ' ')}
                        </span>
                        <div className="w-24 h-1.5 bg-violet-100/50 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-[#7C6EF0] to-[#A78BFA] rounded-full"
                            style={{ width: `${project.progress || 0}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingProject({
                              ...project,
                              budget: String(project.budget || 0),
                              contractValue: String(project.contractValue || 0),
                              expectedCompletion: project.expectedCompletion ? new Date(project.expectedCompletion).toISOString().split('T')[0] : '',
                              actualCompletion: project.actualCompletion ? new Date(project.actualCompletion).toISOString().split('T')[0] : '',
                            });
                          }}
                          className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-[#7C6EF0] hover:bg-clay-violet rounded-lg transition-all"
                          title="Quick Edit Project"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (await confirmDialog({ title: 'Confirm Action', message: `Are you sure you want to delete "${project.name}"?` })) {
                              deleteMutation.mutate(project.id);
                            }
                          }}
                          className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-[#E5636C] hover:bg-clay-rose rounded-lg transition-all"
                          title="Delete Project Site"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="grid grid-cols-1 md:hidden gap-4">
            {filteredProjects.map((project: any) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => navigate(`/projects/${project.id}/dashboard`)}
                className="clay-card-sm p-5 hover:shadow-md hover:border-[#7C6EF0]/30 transition-all flex flex-col justify-between space-y-4 cursor-pointer"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 font-heading transition-colors">
                        {project.name}
                      </h3>
                    </div>
                    <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full border whitespace-nowrap ${
                      project.status === 'IN_PROGRESS'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : project.status === 'COMPLETED'
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                      {project.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <span className="flex items-center gap-1 font-medium text-slate-700">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" /> {project.city}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1 font-medium text-slate-700">
                      <TrendingUp className="w-3.5 h-3.5 text-[#7C6EF0]" /> {project.client?.name || 'N/A'}
                    </span>
                  </div>
                </div>

                <div className="space-y-3 pt-3 border-t border-violet-100/30">
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-600">Progress</span>
                      <span className="text-[#7C6EF0] font-heading">{project.progress || 0}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-violet-100/50 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#7C6EF0] to-[#A78BFA] rounded-full transition-all duration-500"
                        style={{ width: `${project.progress || 0}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-violet-100/30">
                    <div className="text-xs text-slate-500">Value</div>
                    <div className="text-sm font-extrabold text-slate-900 font-heading">
                      {formatCurrency(Number(project.contractValue || 0))}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingProject({
                          ...project,
                          budget: String(project.budget || 0),
                          contractValue: String(project.contractValue || 0),
                          expectedCompletion: project.expectedCompletion ? new Date(project.expectedCompletion).toISOString().split('T')[0] : '',
                          actualCompletion: project.actualCompletion ? new Date(project.actualCompletion).toISOString().split('T')[0] : '',
                        });
                      }}
                      className="p-2 rounded-xl bg-violet-50 text-[#7C6EF0] transition-all"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (await confirmDialog({ title: 'Confirm Action', message: `Are you sure you want to delete "${project.name}"?` })) {
                          deleteMutation.mutate(project.id);
                        }
                      }}
                      className="p-2 rounded-xl bg-rose-50 text-[#E5636C] transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </>
      )}

      {/* Create Project Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
          <div className="clay-card w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-violet-100/30 pb-4">
              <h3 className="text-lg font-bold text-slate-900 font-heading">Register New Site Project</h3>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold"
              >
                Close ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Project Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Skyline Residency Tower A"
                    value={newProject.name}
                    onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                    className="w-full px-3 py-2 clay-input text-sm focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Select Client *</label>
                  <AutocompleteInput
                    value={newProject.clientId}
                    onChange={(val: string) => setNewProject({ ...newProject, clientId: val })}
                    options={clients.map((c: any) => ({ id: c.id, name: `${c.name} (${c.companyName || 'Private'})` }))}
                    placeholder="Search Client..."
                    onAddNew={() => navigate('/clients')}
                    addNewLabel="Add New Client"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Site Engineer Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Rahul Sharma"
                    value={newProject.siteEngineerName}
                    onChange={(e) => setNewProject({ ...newProject, siteEngineerName: e.target.value })}
                    className="w-full px-3 py-2 clay-input text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Primary Contact Number</label>
                  <input
                    type="text"
                    placeholder="e.g. +91 9876543210"
                    value={newProject.primaryNumber}
                    onChange={(e) => setNewProject({ ...newProject, primaryNumber: e.target.value })}
                    className="w-full px-3 py-2 clay-input text-sm focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Secondary Contact Number</label>
                  <input
                    type="text"
                    placeholder="Optional backup contact"
                    value={newProject.secondaryNumber}
                    onChange={(e) => setNewProject({ ...newProject, secondaryNumber: e.target.value })}
                    className="w-full px-3 py-2 clay-input text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Contract Value (₹)</label>
                  <input
                    type="number"
                    placeholder="e.g. 150000000"
                    value={newProject.contractValue}
                    onChange={(e) => setNewProject({ ...newProject, contractValue: e.target.value })}
                    className="w-full px-3 py-2 clay-input text-sm font-heading focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Estimated Fee (₹)</label>
                  <input
                    type="number"
                    placeholder="e.g. 120000000"
                    value={newProject.budget}
                    onChange={(e) => setNewProject({ ...newProject, budget: e.target.value })}
                    className="w-full px-3 py-2 clay-input text-sm font-heading focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">City (Maharashtra)</label>
                  <CategorySelect
                    module="cities"
                    value={newProject.city}
                    onChange={(val) => setNewProject({ ...newProject, city: val })}
                    defaultOptions={MAHARASHTRA_CITIES}
                    placeholder="Select or add city..."
                  />
                  {/* Show existing projects in this city as a small hint */}
                  {newProject.city && (
                    <div className="text-[10px] text-slate-500 mt-1">
                      {projects.filter((p: any) => p.city === newProject.city).length} existing projects in {newProject.city}.
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Area Address</label>
                  <input
                    type="text"
                    placeholder="e.g. Andheri East"
                    value={newProject.areaAddress}
                    onChange={(e) => setNewProject({ ...newProject, areaAddress: e.target.value })}
                    className="w-full px-3 py-2 clay-input text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Scope & Description</label>
                <textarea
                  rows={3}
                  placeholder="Details of civil work, RCC specifications, and expected delivery timeline..."
                  value={newProject.description}
                  onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                  className="w-full px-3 py-2 clay-input text-sm focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-violet-100/30">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 rounded-xl border border-violet-100/40 text-slate-600 hover:bg-slate-50 text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-5 py-2 clay-btn text-white text-sm font-semibold disabled:opacity-50"
                >
                  {createMutation.isPending ? 'Creating...' : 'Register Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Edit Project Modal */}
      {editingProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
          <div className="clay-card w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-violet-100/30 pb-4">
              <h3 className="text-lg font-bold text-slate-900 font-heading">Quick Edit Project: {editingProject.name}</h3>
              <button
                onClick={() => setEditingProject(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold"
              >
                Close ✕
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Site Engineer Name</label>
                  <input
                    type="text"
                    value={editingProject.siteEngineerName || ''}
                    onChange={(e) => setEditingProject({ ...editingProject, siteEngineerName: e.target.value })}
                    className="w-full px-3 py-2 clay-input text-sm focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Status *</label>
                  <select
                    value={editingProject.status}
                    onChange={(e) => setEditingProject({ ...editingProject, status: e.target.value })}
                    className="w-full px-3 py-2 clay-input text-sm focus:outline-none"
                  >
                    <option value="IN_PROGRESS">IN PROGRESS</option>
                    <option value="PLANNING">PLANNING</option>
                    <option value="ON_HOLD">ON HOLD</option>
                    <option value="COMPLETED">COMPLETED</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Project Name *</label>
                <input
                  type="text"
                  required
                  value={editingProject.name}
                  onChange={(e) => setEditingProject({ ...editingProject, name: e.target.value })}
                  className="w-full px-3 py-2 clay-input text-sm focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Physical Progress (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={editingProject.progress}
                    onChange={(e) => setEditingProject({ ...editingProject, progress: Number(e.target.value) })}
                    className="w-full px-3 py-2 clay-input text-sm font-heading focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">City (Maharashtra)</label>
                  <CategorySelect
                    module="cities"
                    value={editingProject.city || 'Mumbai'}
                    onChange={(val) => setEditingProject({ ...editingProject, city: val })}
                    defaultOptions={MAHARASHTRA_CITIES}
                    placeholder="Select or add city..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Area Address</label>
                  <input
                    type="text"
                    value={editingProject.areaAddress || ''}
                    onChange={(e) => setEditingProject({ ...editingProject, areaAddress: e.target.value })}
                    className="w-full px-3 py-2 clay-input text-sm focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Primary Number</label>
                  <input
                    type="text"
                    value={editingProject.primaryNumber || ''}
                    onChange={(e) => setEditingProject({ ...editingProject, primaryNumber: e.target.value })}
                    className="w-full px-3 py-2 clay-input text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Secondary Number</label>
                  <input
                    type="text"
                    value={editingProject.secondaryNumber || ''}
                    onChange={(e) => setEditingProject({ ...editingProject, secondaryNumber: e.target.value })}
                    className="w-full px-3 py-2 clay-input text-sm focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Contract Valuation (₹)</label>
                  <input
                    type="number"
                    value={editingProject.contractValue}
                    onChange={(e) => setEditingProject({ ...editingProject, contractValue: e.target.value })}
                    className="w-full px-3 py-2 clay-input text-sm font-heading focus:outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Estimated Fee (₹)</label>
                  <input
                    type="number"
                    value={editingProject.budget}
                    onChange={(e) => setEditingProject({ ...editingProject, budget: e.target.value })}
                    className="w-full px-3 py-2 clay-input text-sm font-heading focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Expected Completion</label>
                  <input
                    type="date"
                    value={editingProject.expectedCompletion || ''}
                    onChange={(e) => setEditingProject({ ...editingProject, expectedCompletion: e.target.value })}
                    className="w-full px-3 py-2 clay-input text-sm focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Actual Completion</label>
                  <input
                    type="date"
                    value={editingProject.actualCompletion || ''}
                    onChange={(e) => setEditingProject({ ...editingProject, actualCompletion: e.target.value })}
                    className="w-full px-3 py-2 clay-input text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Scope & Description</label>
                <textarea
                  rows={3}
                  value={editingProject.description}
                  onChange={(e) => setEditingProject({ ...editingProject, description: e.target.value })}
                  className="w-full px-3 py-2 clay-input text-sm focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-violet-100/30">
                <button
                  type="button"
                  onClick={() => setEditingProject(null)}
                  className="px-4 py-2 rounded-xl border border-violet-100/40 text-slate-600 hover:bg-slate-50 text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="px-5 py-2 clay-btn text-white text-sm font-semibold disabled:opacity-50"
                >
                  {updateMutation.isPending ? 'Saving...' : 'Save Quick Edit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
