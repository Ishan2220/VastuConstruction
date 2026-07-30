import { useState, useEffect } from 'react';
import { FileText, Search, Plus, ChevronDown, Download, X, Trash2, Filter } from 'lucide-react';
import api from '@/lib/api';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useAuthStore } from '@/store/authStore';
import { AutocompleteInput } from '@/components/ui/AutocompleteInput';
import { useConfirm } from "@/components/ui/ConfirmProvider";

interface Invoice {
  id: string;
  type: string;
  invoiceNumber: string;
  client?: { name: string, companyName?: string };
  vendor?: { name: string };
  project?: { name: string };
  issueDate: string;
  status: string;
  totalAmount: number;
}

export default function InvoicesPage() {
    const confirmDialog = useConfirm();
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
    type: 'CLIENT' as 'CLIENT' | 'VENDOR',
    clientId: '',
    vendorId: '',
    projectId: '',
    issueDate: format(new Date(), 'yyyy-MM-dd'),
    status: 'UNPAID',
    items: [{ description: '', quantity: '1', rate: '', amount: '' }],
    gstMode: 'NONE',
    gstPercentage: 18,
    gstAmount: ''
  });

  const { data: settings } = useQuery({
    queryKey: ['financial-settings'],
    queryFn: async () => {
      const { data } = await api.get('/settings');
      return data?.data?.settings || {};
    },
  });

  // Update defaults when settings load
  useEffect(() => {
    if (settings && isCreateOpen) {
      if (settings.defaultGstMode && newInvoice.gstMode === 'NONE') {
        setNewInvoice(prev => ({ ...prev, gstMode: settings.defaultGstMode, gstPercentage: settings.defaultGstPercentage || 18 }));
      }
    }
  }, [settings, isCreateOpen]);

  const [clients, setClients] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);

  useEffect(() => {
    fetchInvoices();
    fetchDependencies();
  }, []);

  const fetchDependencies = async () => {
    try {
      const [cRes, pRes, vRes] = await Promise.all([
        api.get('/clients'),
        api.get('/projects'),
        api.get('/vendors')
      ]);
      setClients(cRes.data?.data?.data || cRes.data?.data || []);
      setProjects(pRes.data?.data?.data || pRes.data?.data || []);
      setVendors(vRes.data?.data?.data || vRes.data?.data || []);
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
        type: 'CLIENT',
        clientId: '',
        vendorId: '',
        projectId: '',
        issueDate: format(new Date(), 'yyyy-MM-dd'),
        status: 'UNPAID',
        items: [{ description: '', quantity: '1', rate: '', amount: '' }],
        gstMode: settings?.defaultGstMode || 'NONE',
        gstPercentage: settings?.defaultGstPercentage || 18,
        gstAmount: ''
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
    if (newInvoice.type === 'CLIENT' && !newInvoice.clientId) {
      toast.error('Client is required');
      return;
    }
    if (newInvoice.type === 'VENDOR' && !newInvoice.vendorId) {
      toast.error('Vendor is required');
      return;
    }
    let subtotal = 0;
    const hasValidItems = newInvoice.items.some(i => Number(i.amount) > 0);
    if (hasValidItems) {
      subtotal = newInvoice.items.reduce((s, i) => s + (Number(i.amount) || 0), 0);
    }
    
    let taxAmount = 0;
    if (newInvoice.gstMode === 'PERCENTAGE') {
      taxAmount = (subtotal * Number(newInvoice.gstPercentage)) / 100;
    } else if (newInvoice.gstMode === 'AMOUNT') {
      taxAmount = Number(newInvoice.gstAmount);
    }
    
    const amount = subtotal + taxAmount;

    if (!amount) {
      toast.error('Total amount must be greater than 0');
      return;
    }
    
    const generatedInvoiceNumber = 'INV-' + Date.now().toString().slice(-6);
    
    createMutation.mutate({
      invoiceNumber: generatedInvoiceNumber,
      type: newInvoice.type,
      clientId: newInvoice.type === 'CLIENT' ? newInvoice.clientId : undefined,
      vendorId: newInvoice.type === 'VENDOR' ? newInvoice.vendorId : undefined,
      projectId: newInvoice.projectId || undefined,
      issueDate: new Date(newInvoice.issueDate),
      status: newInvoice.status,
      gstMode: newInvoice.gstMode,
      gstPercentage: newInvoice.gstPercentage,
      gstAmount: newInvoice.gstMode === 'AMOUNT' ? newInvoice.gstAmount : undefined,
      items: newInvoice.items.map(i => ({
        description: i.description,
        quantity: i.quantity,
        rate: i.rate,
        amount: i.amount
      }))
    });
  };

  const addItem = () => {
    setNewInvoice({ ...newInvoice, items: [...newInvoice.items, { description: '', quantity: '1', rate: '', amount: '' }] });
  };

  const handleDownloadPDF = (invoice: any) => {
    toast.success(`Generating PDF for ${invoice.invoiceNumber}...`);
    try {
      const doc = new jsPDF();
      
      // Professional Header with Background Accent
      doc.setFillColor(124, 110, 240);
      doc.rect(0, 0, 210, 40, 'F');
      
      doc.setFontSize(26);
      doc.setTextColor(255, 255, 255);
      doc.text('VASTU CONSTRUCTIONS', 14, 20);
      doc.setFontSize(10);
      doc.text('Enterprise Grade Construction ERP', 14, 28);
      
      // Invoice Details
      doc.setFontSize(24);
      doc.setTextColor(255, 255, 255);
      doc.text('INVOICE', 150, 25);
      
      // Company Info (Below header)
      doc.setFontSize(10);
      doc.setTextColor(80, 80, 80);
      doc.text('Sudarshan Chouk, Rp Road, Satpute Galli', 14, 50);
      doc.text('Ichalkaranji-416115, Maharashtra', 14, 55);
      doc.text('Contact: +91 9604459628', 14, 60);
      doc.text('Email: vastuconstructionich@gmail.com', 14, 65);

      // Invoice Meta Info
      doc.setFontSize(10);
      doc.setTextColor(50, 50, 50);
      doc.text(`Invoice No: ${invoice.invoiceNumber}`, 150, 50);
      doc.text(`Issue Date: ${format(new Date(invoice.issueDate), 'dd MMM yyyy')}`, 150, 55);
      doc.text(`Status: ${invoice.status}`, 150, 60);

      // Party Info Box
      doc.setFillColor(245, 244, 255);
      doc.rect(14, 75, 182, 35, 'F');
      doc.setFontSize(11);
      doc.setTextColor(124, 110, 240);
      doc.text(`INVOICE ${invoice.type === 'CLIENT' ? 'FOR CLIENT' : 'FROM VENDOR'}`, 20, 85);
      
      doc.setFontSize(12);
      doc.setTextColor(40, 40, 40);
      const partyName = invoice.type === 'CLIENT' 
        ? (invoice.client?.companyName || invoice.client?.name || 'Client')
        : (invoice.vendor?.name || 'Vendor');
      doc.text(partyName, 20, 93);
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      if (invoice.project?.name) {
        doc.text(`Project: ${invoice.project.name}`, 20, 100);
      }

      // Items Table
      const tableBody = invoice.items && invoice.items.length > 0 
        ? invoice.items.map((i: any) => [
            i.description || 'Item', 
            i.quantity || '1', 
            Number(i.rate || 0).toLocaleString('en-IN'),
            i.gstRate ? `${i.gstRate}%` : '0%',
            Number(Number(i.amount || 0) + Number(i.gstAmount || 0)).toLocaleString('en-IN')
          ])
        : [['Consulting, Labour & Material Services', '1', Number(invoice.totalAmount).toLocaleString('en-IN'), '0%', Number(invoice.totalAmount).toLocaleString('en-IN')]];

      autoTable(doc, {
        startY: 120,
        headStyles: { fillColor: [124, 110, 240], textColor: [255, 255, 255], fontStyle: 'bold' },
        bodyStyles: { textColor: [50, 50, 50] },
        alternateRowStyles: { fillColor: [250, 249, 255] },
        head: [['Description', 'Qty', 'Rate', 'GST', 'Total (INR)']],
        body: tableBody,
        foot: [['', '', '', 'Total Due', `Rs. ${Number(invoice.totalAmount).toLocaleString('en-IN')}`]],
        footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
        theme: 'striped',
        margin: { top: 10, left: 14, right: 14 }
      });

      // Footer
      const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
      
      doc.setDrawColor(124, 110, 240);
      doc.setLineWidth(0.5);
      doc.line(14, pageHeight - 30, 196, pageHeight - 30);
      
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text('Thank you for your business!', 14, pageHeight - 20);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text('Generated digitally by Vastu x ConstraCore ERP System.', 14, pageHeight - 12);

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
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Party</th>
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
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-md text-[10px] uppercase font-bold border ${invoice.type === 'CLIENT' ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : 'bg-orange-50 text-orange-600 border-orange-200'}`}>
                        {invoice.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-800 font-bold">
                      {invoice.type === 'CLIENT' ? (invoice.client?.companyName || invoice.client?.name) : invoice.vendor?.name}
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
                        <button onClick={(e) => { e.stopPropagation(); handleDownloadPDF(invoice); }} className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-[#7C6EF0] hover:bg-clay-violet rounded-lg transition-all" title="Download PDF">
                          <Download className="w-4 h-4" />
                        </button>
                        {isAdmin && (
                          <button 
                            onClick={async (e) => { 
                              e.stopPropagation(); 
                              if(await confirmDialog({ title: 'Confirm Action', message: 'Delete this invoice?' })) deleteMutation.mutate(invoice.id); 
                            }} 
                            className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-[#E5636C] hover:bg-clay-rose rounded-lg transition-all" 
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
                    <div className="flex items-center gap-2">
                      <div className="font-mono font-bold text-[#7C6EF0]">{invoice.invoiceNumber}</div>
                      <span className={`px-2 py-0.5 rounded-md text-[9px] uppercase font-bold border ${invoice.type === 'CLIENT' ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : 'bg-orange-50 text-orange-600 border-orange-200'}`}>
                        {invoice.type}
                      </span>
                    </div>
                    <div className="font-bold text-slate-800 mt-1">
                      {invoice.type === 'CLIENT' ? (invoice.client?.companyName || invoice.client?.name) : invoice.vendor?.name}
                    </div>
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
                        onClick={async (e) => { 
                          e.stopPropagation(); 
                          if(await confirmDialog({ title: 'Confirm Action', message: 'Delete this invoice?' })) deleteMutation.mutate(invoice.id); 
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
          <div className="clay-card w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6 animate-in fade-in zoom-in-95 duration-200">
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
              <div className="flex items-center gap-4 p-1 bg-slate-100/50 rounded-xl w-fit mx-auto mb-4 border border-slate-200/50">
                <button
                  type="button"
                  onClick={() => setNewInvoice({ ...newInvoice, type: 'CLIENT', vendorId: '' })}
                  className={`px-4 py-1.5 text-sm font-bold rounded-lg transition-all ${newInvoice.type === 'CLIENT' ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Client Invoice (Income)
                </button>
                <button
                  type="button"
                  onClick={() => setNewInvoice({ ...newInvoice, type: 'VENDOR', clientId: '' })}
                  className={`px-4 py-1.5 text-sm font-bold rounded-lg transition-all ${newInvoice.type === 'VENDOR' ? 'bg-white text-orange-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Vendor Invoice (Expense)
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">{newInvoice.type === 'CLIENT' ? 'Billed By (Client)' : 'Billed To (Vendor)'} *</label>
                  {newInvoice.type === 'CLIENT' ? (
                    <AutocompleteInput
                      value={newInvoice.clientId}
                      onChange={(val) => setNewInvoice({ ...newInvoice, clientId: val })}
                      options={clients.map(c => ({ id: c.id, name: c.name, companyName: c.companyName }))}
                      renderOption={(c) => (
                        <div>
                          <div className="font-bold">{c.name}</div>
                          {c.companyName && <div className="text-[10px] text-slate-500">{c.companyName}</div>}
                        </div>
                      )}
                      placeholder="Search Client..."
                    />
                  ) : (
                    <AutocompleteInput
                      value={newInvoice.vendorId}
                      onChange={(val) => setNewInvoice({ ...newInvoice, vendorId: val })}
                      options={vendors.map(v => ({ id: v.id, name: v.name }))}
                      placeholder="Search Vendor..."
                    />
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Project (Optional)</label>
                  <AutocompleteInput
                    value={newInvoice.projectId}
                    onChange={(val) => setNewInvoice({ ...newInvoice, projectId: val })}
                    options={projects.map(p => ({ id: p.id, name: p.name }))}
                    placeholder="Search Project..."
                  />
                </div>
              </div>

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
              
              <div className="pt-2">
                <label className="text-sm font-semibold text-slate-800 block mb-2">Invoice Items</label>
                <div className="space-y-3">
                  {newInvoice.items.map((item, idx) => (
                    <div key={idx} className="flex flex-col gap-2 p-3 bg-white/50 border border-violet-100 rounded-xl relative group">
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                        <div className="sm:col-span-5 space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Description</label>
                          <input
                            type="text"
                            placeholder="Service/Product Name"
                            value={item.description}
                            onChange={(e) => {
                              const items = [...newInvoice.items];
                              items[idx].description = e.target.value;
                              setNewInvoice({ ...newInvoice, items });
                            }}
                            className="clay-input w-full !text-sm !py-1.5"
                          />
                        </div>
                        <div className="sm:col-span-4 space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Rate / Amount</label>
                          <input
                            type="number"
                            placeholder="Rate"
                            value={item.rate}
                            onChange={(e) => {
                              const items = [...newInvoice.items];
                              items[idx].rate = e.target.value;
                              items[idx].amount = String(Number(items[idx].rate) || 0);
                              setNewInvoice({ ...newInvoice, items });
                            }}
                            className="clay-input w-full !text-sm !py-1.5 font-mono"
                          />
                        </div>
                        <div className="sm:col-span-3 space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Total</label>
                          <div className="w-full text-sm py-1.5 font-mono font-bold text-slate-800 bg-white/50 px-3 rounded-lg border border-slate-100 flex items-center justify-end">
                            {Number(item.amount || 0).toLocaleString('en-IN')}
                          </div>
                        </div>
                      </div>
                      {newInvoice.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const items = newInvoice.items.filter((_, i) => i !== idx);
                            setNewInvoice({ ...newInvoice, items });
                          }}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-white border border-rose-100 rounded-full flex items-center justify-center text-rose-500 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-50 hover:scale-110"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addItem}
                    className="text-xs font-bold text-[#7C6EF0] hover:text-[#7C6EF0]/80 mt-2 flex items-center gap-1 bg-white/50 px-3 py-1.5 rounded-lg border border-violet-100 hover:bg-white transition-colors"
                  >
                    <Plus className="w-3 h-3" /> Add Item
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-violet-100/40">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">GST Mode</label>
                  <select
                    value={newInvoice.gstMode}
                    onChange={(e) => setNewInvoice({ ...newInvoice, gstMode: e.target.value })}
                    className="clay-input w-full"
                    disabled={settings?.allowOperatorOverride === false}
                  >
                    {!settings?.gstMandatory && <option value="NONE">No GST</option>}
                    <option value="PERCENTAGE">GST %</option>
                    {settings?.allowManualGstAmount !== false && <option value="AMOUNT">Manual GST (₹)</option>}
                  </select>
                </div>

                {newInvoice.gstMode === 'PERCENTAGE' && (
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">GST %</label>
                    <select
                      value={newInvoice.gstPercentage}
                      onChange={(e) => setNewInvoice({ ...newInvoice, gstPercentage: Number(e.target.value) })}
                      className="clay-input w-full"
                      disabled={settings?.allowOperatorOverride === false}
                    >
                      <option value="0">0%</option>
                      <option value="5">5%</option>
                      <option value="12">12%</option>
                      <option value="18">18%</option>
                      <option value="28">28%</option>
                    </select>
                  </div>
                )}

                {newInvoice.gstMode === 'AMOUNT' && (
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">GST Amount</label>
                    <input
                      type="number"
                      placeholder="GST Amount (₹)"
                      value={newInvoice.gstAmount}
                      onChange={(e) => setNewInvoice({ ...newInvoice, gstAmount: e.target.value })}
                      className="clay-input w-full font-mono"
                    />
                  </div>
                )}
              </div>

              <div className="bg-[#7C6EF0]/10 p-3 rounded-xl border border-[#7C6EF0]/20 flex justify-between items-center text-[#7C6EF0] mt-4">
                <span className="text-sm font-bold uppercase tracking-wider">Total Invoice Amount:</span>
                <span className="font-mono font-bold text-lg">
                  {(
                    newInvoice.items.reduce((s, i) => s + (Number(i.amount) || 0), 0) + 
                    (newInvoice.gstMode === 'PERCENTAGE' ? (newInvoice.items.reduce((s, i) => s + (Number(i.amount) || 0), 0) * newInvoice.gstPercentage) / 100 : 
                     newInvoice.gstMode === 'AMOUNT' ? Number(newInvoice.gstAmount) : 0)
                  ).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-violet-100/40">
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
