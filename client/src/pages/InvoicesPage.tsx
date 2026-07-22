import { useState, useEffect } from 'react';
import { FileText, Search, Plus, ChevronDown, Download, X, Trash2, Filter } from 'lucide-react';
import api from '@/lib/api';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useAuthStore } from '@/store/authStore';

interface Invoice {
  id: string;
  invoiceNumber: string;
  client: { name: string, companyName?: string };
  project?: { name: string };
  issueDate: string;
  dueDate: string;
  status: string;
  totalAmount: number;
}

export default function InvoicesPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');

  // Form State
  const [newInvoice, setNewInvoice] = useState({
    clientId: '',
    projectId: '',
    issueDate: format(new Date(), 'yyyy-MM-dd'),
    dueDate: format(new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    totalAmount: '',
    status: 'UNPAID',
    items: [{ description: '', amount: '' }]
  });

  const [clients, setClients] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);

  useEffect(() => {
    fetchInvoices();
    fetchDependencies();
  }, []);

  const fetchDependencies = async () => {
    try {
      const [cRes, pRes] = await Promise.all([
        api.get('/clients'),
        api.get('/projects')
      ]);
      setClients(cRes.data?.data?.data || cRes.data?.data || []);
      setProjects(pRes.data?.data?.data || pRes.data?.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchInvoices = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/invoices');
      if (res.data?.success) {
        setInvoices(res.data.data.invoices);
      }
    } catch (error) {
      toast.error('Failed to load invoices');
    } finally {
      setIsLoading(false);
    }
  };

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await api.post('/invoices', payload);
      return data;
    },
    onSuccess: () => {
      toast.success('Invoice created successfully');
      setIsCreateOpen(false);
      fetchInvoices();
      setNewInvoice({
        clientId: '',
        projectId: '',
        issueDate: format(new Date(), 'yyyy-MM-dd'),
        dueDate: format(new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
        totalAmount: '',
        status: 'UNPAID',
        items: [{ description: '', amount: '' }]
      });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to create invoice');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/invoices/${id}`);
    },
    onSuccess: () => {
      toast.success('Invoice deleted successfully');
      fetchInvoices();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to delete invoice');
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, paymentMethod, accountId }: { id: string, status: string, paymentMethod?: string, accountId?: string }) => {
      await api.patch(`/invoices/${id}/status`, { status, paymentMethod, accountId });
    },
    onSuccess: () => {
      toast.success('Invoice status updated successfully');
      queryClient.invalidateQueries({ queryKey: ['dashboard-kpis'] });
      fetchInvoices();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to update invoice status');
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'UNPAID': return 'bg-clay-rose text-[#E5636C] border-[#E5636C]/20';
      case 'PARTIAL': return 'bg-clay-amber text-[#F2A65A] border-[#F2A65A]/20';
      case 'PAID': return 'bg-clay-green text-[#5CB77E] border-[#5CB77E]/20';
      case 'CANCELLED': return 'bg-white/50 text-slate-500 border-slate-200';
      default: return 'bg-white/50 text-slate-700 border-slate-200';
    }
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInvoice.clientId) {
      toast.error('Client is required');
      return;
    }
    let amount = 0;
    const hasValidItems = newInvoice.items.some(i => Number(i.amount) > 0);
    if (hasValidItems) {
      amount = newInvoice.items.reduce((s, i) => s + (Number(i.amount) || 0), 0);
    } else {
      amount = Number(newInvoice.totalAmount) || 0;
    }

    if (!amount) {
      toast.error('Total amount must be greater than 0');
      return;
    }
    
    const generatedInvoiceNumber = 'INV-' + Date.now().toString().slice(-6);
    
    createMutation.mutate({
      invoiceNumber: generatedInvoiceNumber,
      clientId: newInvoice.clientId,
      projectId: newInvoice.projectId || undefined,
      issueDate: new Date(newInvoice.issueDate),
      dueDate: new Date(newInvoice.dueDate),
      status: newInvoice.status,
      subtotal: String(amount),
      taxAmount: '0',
      totalAmount: String(amount)
    });
  };

  const addItem = () => {
    setNewInvoice({ ...newInvoice, items: [...newInvoice.items, { description: '', amount: '' }] });
  };

  const handleDownloadPDF = (invoice: any) => {
    toast.success(`Generating PDF for ${invoice.invoiceNumber}...`);
    try {
      const doc = new jsPDF();
      
      // Header
      doc.setFontSize(22);
      doc.setTextColor(124, 110, 240);
      doc.text('VASTU CONSTRUCTIONS', 14, 20);
      
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text('Sudarshan Chouk, Rp Road, Satpute Galli', 14, 26);
      doc.text('Ichalkaranji-416115, Maharashtra', 14, 32);
      doc.text('Contact: +91 9604459628 | vastuconstructionich@gmail.com', 14, 38);

      // Invoice Details
      doc.setFontSize(16);
      doc.setTextColor(0, 0, 0);
      doc.text('INVOICE', 150, 20);
      
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Invoice No: ${invoice.invoiceNumber}`, 150, 28);
      doc.text(`Issue Date: ${format(new Date(invoice.issueDate), 'dd MMM yyyy')}`, 150, 34);
      doc.text(`Status: ${invoice.status}`, 150, 40);

      // Client Info
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text('Billed To:', 14, 55);
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      const clientName = invoice.client?.companyName || invoice.client?.name || 'Client';
      doc.text(clientName, 14, 62);
      if (invoice.project?.name) {
        doc.text(`Project: ${invoice.project.name}`, 14, 68);
      }

      // Items Table
      autoTable(doc, {
        startY: 80,
        headStyles: { fillColor: [124, 110, 240] },
        head: [['Description', 'Amount (INR)']],
        body: [
          ['Invoice Services / Materials provided', Number(invoice.totalAmount).toLocaleString('en-IN')],
        ],
        foot: [['Total', Number(invoice.totalAmount).toLocaleString('en-IN')]],
        footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' }
      });

      // Footer
      const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
      doc.setFontSize(10);
      doc.setTextColor(150, 150, 150);
      doc.text('Thank you for your business!', 14, pageHeight - 20);
      doc.text('Generated by Vastu x ConstraCore', 14, pageHeight - 14);

      // Save PDF
      doc.save(`${invoice.invoiceNumber}.pdf`);
    } catch (e) {
      console.error(e);
      toast.error('Failed to generate PDF');
    }
  };

  const filteredInvoices = invoices.filter((inv) => {
    const search = searchTerm.toLowerCase();
    const matchesSearch = inv.invoiceNumber?.toLowerCase().includes(search) ||
                          inv.client?.name?.toLowerCase().includes(search) ||
                          inv.client?.companyName?.toLowerCase().includes(search);
    const matchesFilter = filterStatus === 'ALL' || inv.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="p-4 md:p-8 lg:p-8 space-y-6 min-h-full font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-800 flex items-center gap-2 font-heading">
            <FileText className="w-8 h-8 text-[#7C6EF0]" />
            Invoices
          </h1>
          <p className="text-sm text-slate-600 mt-1">Manage client billing and payments</p>
        </div>
        <button 
          onClick={() => setIsCreateOpen(true)}
          className="clay-btn px-4 py-2.5 text-sm font-bold text-white flex items-center gap-2 transition-all hover:scale-[1.02]"
        >
          <Plus className="w-4 h-4" />
          Create Invoice
        </button>
      </div>

      <div className="clay-card sticky top-16 z-20 flex flex-col md:flex-row md:items-center gap-3 p-3 md:p-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search invoice number or client..."
            className="clay-input w-full pl-10 pr-4"
          />
        </div>
        <select
          className="clay-card-sm px-4 py-2.5 text-slate-700 rounded-xl text-sm font-bold transition-colors w-full md:w-40 shrink-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#7C6EF0]"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="ALL">All Status</option>
          <option value="PAID">Paid</option>
          <option value="UNPAID">Unpaid</option>
          <option value="PARTIAL">Partial</option>
        </select>
      </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto clay-card !p-0">
          <table className="w-full">
            <thead>
              <tr className="border-b border-violet-100/40">
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Invoice No</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Client</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Project</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Issue Date</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-violet-100/30">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-sm text-slate-500">
                    Loading invoices...
                  </td>
                </tr>
              ) : filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-sm text-slate-500">
                    No invoices found.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-white/60 transition-colors group cursor-pointer">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-bold text-[#7C6EF0] font-mono">{invoice.invoiceNumber}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-800 font-bold">
                      {invoice.client?.companyName || invoice.client?.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      {invoice.project?.name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      {format(new Date(invoice.issueDate), 'dd MMM yyyy')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right font-heading text-xl text-slate-800">
                      ₹{Number(invoice.totalAmount).toLocaleString('en-IN')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <select
                        value={invoice.status}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          e.stopPropagation();
                          updateStatusMutation.mutate({ id: invoice.id, status: e.target.value });
                        }}
                        className={`inline-flex items-center px-2 py-1 rounded-md text-[10px] uppercase font-bold border focus:outline-none cursor-pointer ${getStatusColor(invoice.status)}`}
                      >
                        <option value="UNPAID">UNPAID</option>
                        <option value="PARTIAL">PARTIAL</option>
                        <option value="PAID">PAID</option>
                        <option value="CANCELLED">CANCELLED</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={(e) => { e.stopPropagation(); handleDownloadPDF(invoice); }} className="p-1.5 text-slate-400 hover:text-[#7C6EF0] hover:bg-clay-violet rounded-lg transition-all" title="Download PDF">
                          <Download className="w-4 h-4" />
                        </button>
                        {isAdmin && (
                          <button 
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              if(window.confirm('Delete this invoice?')) deleteMutation.mutate(invoice.id); 
                            }} 
                            className="p-1.5 text-slate-400 hover:text-[#E5636C] hover:bg-clay-rose rounded-lg transition-all" 
                            title="Delete Invoice">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden flex flex-col gap-3">
          {isLoading ? (
            <div className="p-8 text-center text-slate-500">Loading invoices...</div>
          ) : filteredInvoices.length === 0 ? (
            <div className="p-8 text-center text-slate-500">No invoices found.</div>
          ) : (
            filteredInvoices.map((invoice) => (
              <div key={invoice.id} className="clay-card-sm p-4 flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-mono font-bold text-[#7C6EF0]">{invoice.invoiceNumber}</div>
                    <div className="font-bold text-slate-800 mt-1">{invoice.client?.companyName || invoice.client?.name}</div>
                  </div>
                  <div className="font-heading text-slate-800 text-xl">
                    ₹{Number(invoice.totalAmount).toLocaleString('en-IN')}
                  </div>
                </div>
                
                <div className="flex flex-col gap-1 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span className="font-semibold">{invoice.project?.name || '-'}</span>
                    <span>{format(new Date(invoice.issueDate), 'dd MMM yyyy')}</span>
                  </div>
                </div>

                <div className="flex justify-between items-center mt-2 pt-3 border-t border-violet-100/40">
                  <select
                    value={invoice.status}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => {
                      e.stopPropagation();
                      updateStatusMutation.mutate({ id: invoice.id, status: e.target.value });
                    }}
                    className={`inline-flex items-center px-2 py-1 rounded-md text-[10px] uppercase font-bold border focus:outline-none cursor-pointer ${getStatusColor(invoice.status)}`}
                  >
                    <option value="UNPAID">UNPAID</option>
                    <option value="PARTIAL">PARTIAL</option>
                    <option value="PAID">PAID</option>
                    <option value="CANCELLED">CANCELLED</option>
                  </select>
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDownloadPDF(invoice); }}
                      className="p-2 text-slate-400 hover:text-[#7C6EF0] hover:bg-clay-violet rounded-lg transition-all"
                      title="Download PDF"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    {isAdmin && (
                      <button
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          if(window.confirm('Delete this invoice?')) deleteMutation.mutate(invoice.id); 
                        }}
                        className="p-2 text-slate-400 hover:text-[#E5636C] hover:bg-clay-rose rounded-lg transition-all"
                        title="Delete Invoice"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
          <div className="clay-card w-full max-w-2xl p-6 space-y-6 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-violet-100/40 pb-4">
              <h3 className="text-lg font-bold text-slate-800 font-heading flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#7C6EF0]" />
                Create New Invoice
              </h3>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Client *</label>
                  <select
                    required
                    value={newInvoice.clientId}
                    onChange={e => setNewInvoice({ ...newInvoice, clientId: e.target.value })}
                    className="clay-input w-full"
                  >
                    <option value="">Select Client</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Project (Optional)</label>
                  <select
                    value={newInvoice.projectId}
                    onChange={e => setNewInvoice({ ...newInvoice, projectId: e.target.value })}
                    className="clay-input w-full"
                  >
                    <option value="">Select Project</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Issue Date *</label>
                  <input
                    type="date"
                    required
                    value={newInvoice.issueDate}
                    onChange={e => setNewInvoice({ ...newInvoice, issueDate: e.target.value })}
                    className="clay-input w-full"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Due Date *</label>
                  <input
                    type="date"
                    required
                    value={newInvoice.dueDate}
                    onChange={e => setNewInvoice({ ...newInvoice, dueDate: e.target.value })}
                    className="clay-input w-full"
                  />
                </div>
              </div>
              
              <div className="pt-2">
                <label className="text-sm font-semibold text-slate-800 block mb-2">Invoice Items</label>
                <div className="space-y-2">
                  {newInvoice.items.map((item, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <input
                        type="text"
                        placeholder="Description"
                        value={item.description}
                        onChange={(e) => {
                          const items = [...newInvoice.items];
                          items[idx].description = e.target.value;
                          setNewInvoice({ ...newInvoice, items });
                        }}
                        className="clay-input flex-1"
                      />
                      <input
                        type="number"
                        placeholder="Amount"
                        value={item.amount}
                        onChange={(e) => {
                          const items = [...newInvoice.items];
                          items[idx].amount = e.target.value;
                          const hasValid = items.some(i => Number(i.amount) > 0);
                          const newTotal = hasValid ? String(items.reduce((s, i) => s + (Number(i.amount) || 0), 0)) : newInvoice.totalAmount;
                          setNewInvoice({ ...newInvoice, items, totalAmount: newTotal });
                        }}
                        className="clay-input w-32 font-mono"
                      />
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addItem}
                    className="text-xs font-bold text-[#7C6EF0] hover:text-[#7C6EF0]/80 mt-2"
                  >
                    + Add Item
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-violet-100/40">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Total Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    value={newInvoice.totalAmount}
                    onChange={e => setNewInvoice({ ...newInvoice, totalAmount: e.target.value })}
                    className="clay-input w-full font-mono font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Status</label>
                  <select
                    value={newInvoice.status}
                    onChange={e => setNewInvoice({ ...newInvoice, status: e.target.value })}
                    className="clay-input w-full font-semibold"
                  >
                    <option value="UNPAID">Unpaid</option>
                    <option value="PARTIAL">Partial</option>
                    <option value="PAID">Paid</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-white/50 text-sm font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="clay-btn disabled:opacity-50"
                >
                  {createMutation.isPending ? 'Creating...' : 'Create Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
