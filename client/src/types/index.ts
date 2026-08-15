// ============================================================
// Vastu Construction ERP - TypeScript Type Definitions
// ============================================================

// ---- Enums ----

export type Role = 'ADMIN' | 'ACCOUNTANT' | 'ENGINEER' | 'SUPER_ADMIN';

export type LeadStatus =
  | 'NEW'
  | 'CONTACTED'
  | 'SITE_VISIT'
  | 'FOLLOW_UP'
  | 'PROPOSAL_SENT'
  | 'NEGOTIATION'
  | 'WON'
  | 'LOST';

export type LeadSource =
  | 'WALK_IN'
  | 'REFERRAL'
  | 'WEBSITE'
  | 'SOCIAL_MEDIA'
  | 'JUSTDIAL'
  | 'INDIAMART'
  | 'NEWSPAPER'
  | 'HOARDING'
  | 'OTHER';

export type ProjectStatus =
  | 'PLANNING'
  | 'IN_PROGRESS'
  | 'ON_HOLD'
  | 'COMPLETED'
  | 'CANCELLED';

export type ProjectType =
  | 'RESIDENTIAL'
  | 'COMMERCIAL'
  | 'INDUSTRIAL'
  | 'RENOVATION'
  | 'INTERIOR'
  | 'INFRASTRUCTURE';

export type SiteStatus = 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CLOSED';

export type ExpenseCategory =
  | 'MATERIAL'
  | 'LABOUR'
  | 'TRANSPORT'
  | 'EQUIPMENT'
  | 'OVERHEAD'
  | 'PERMIT'
  | 'UTILITY'
  | 'PROFESSIONAL_FEE'
  | 'MISCELLANEOUS';

export type PaymentMode = 'CASH' | 'UPI' | 'BANK_TRANSFER' | 'CHEQUE' | 'CARD' | 'OTHER';

export type PaymentStatus = 'PENDING' | 'PARTIAL' | 'COMPLETED' | 'OVERDUE';

export type IncomeType =
  | 'CLIENT_PAYMENT'
  | 'ADVANCE'
  | 'MILESTONE'
  | 'FINAL_PAYMENT'
  | 'RETENTION'
  | 'OTHER';

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type DocumentType =
  | 'SITE_PHOTO'
  | 'DAILY_REPORT'
  | 'DRAWING'
  | 'INVOICE'
  | 'GST_BILL'
  | 'PURCHASE_ORDER'
  | 'VENDOR_RECEIPT'
  | 'CONTRACT'
  | 'CLIENT_DOCUMENT'
  | 'LABOUR_DOCUMENT'
  | 'OTHER';

export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'OVERTIME' | 'LEAVE';

export type MaterialUnit = 'KG' | 'TON' | 'BAG' | 'PIECE' | 'SQFT' | 'CUFT' | 'METER' | 'LITER' | 'BUNDLE' | 'LOAD' | 'OTHER';

export type OrderStatus = 'REQUESTED' | 'APPROVED' | 'ORDERED' | 'DISPATCHED' | 'DELIVERED' | 'CANCELLED';

export type AccountType = 'BANK' | 'CASH' | 'UPI' | 'CREDIT';

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'EXPORT' | 'STATUS_CHANGE';

// ---- Core Entities ----

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: Role;
  avatar?: string;
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
  tempAdminUntil?: string;
  tempAdminPages?: string[];
}

export interface Lead {
  id: string;
  name: string;
  email?: string;
  phone: string;
  alternatePhone?: string;
  address?: string;
  city?: string;
  state?: string;
  source: LeadSource;
  status: LeadStatus;
  serviceType?: string;
  budget?: number;
  plotSize?: string;
  requirements?: string;
  notes?: string;
  followUpDate?: string;
  assignedToId?: string;
  assignedTo?: User;
  convertedToClientId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Client {
  id: string;
  name: string;
  email?: string;
  phone: string;
  alternatePhone?: string;
  address?: string;
  city?: string;
  state?: string;
  panNumber?: string;
  aadharNumber?: string;
  gstNumber?: string;
  companyName?: string;
  notes?: string;
  totalProjects: number;
  totalPaid: number;
  totalDue: number;
  leadId?: string;
  projects?: Project[];
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  type: ProjectType;
  status: ProjectStatus;
  clientId: string;
  client?: Client;
  siteAddress: string;
  city: string;
  state?: string;
  estimatedBudget: number;
  actualBudget?: number;
  startDate: string;
  expectedEndDate?: string;
  actualEndDate?: string;
  progress: number;
  managerId?: string;
  manager?: User;
  sites?: Site[];
  totalIncome: number;
  totalExpense: number;
  profit: number;
  createdAt: string;
  updatedAt: string;
}

export interface Site {
  id: string;
  name: string;
  projectId: string;
  project?: Project;
  address: string;
  city: string;
  status: SiteStatus;
  supervisorId?: string;
  supervisor?: User;
  startDate: string;
  expectedEndDate?: string;
  progress: number;
  totalIncome: number;
  totalExpense: number;
  profit: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Vendor {
  id: string;
  name: string;
  companyName?: string;
  email?: string;
  phone: string;
  alternatePhone?: string;
  address?: string;
  city?: string;
  state?: string;
  gstNumber?: string;
  panNumber?: string;
  category: string;
  rating?: number;
  totalOrders: number;
  totalPaid: number;
  totalDue: number;
  isActive: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Material {
  id: string;
  name: string;
  category: string;
  unit: MaterialUnit;
  currentStock: number;
  minStockLevel: number;
  unitPrice: number;
  lastPurchasePrice?: number;
  vendorId?: string;
  vendor?: Vendor;
  hsnCode?: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MaterialOrder {
  id: string;
  orderNumber: string;
  materialId: string;
  material?: Material;
  vendorId: string;
  vendor?: Vendor;
  projectId?: string;
  project?: Project;
  siteId?: string;
  site?: Site;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  status: OrderStatus;
  orderDate: string;
  expectedDelivery?: string;
  actualDelivery?: string;
  notes?: string;
  approvedById?: string;
  approvedBy?: User;
  createdAt: string;
  updatedAt: string;
}

export interface Labour {
  id: string;
  name: string;
  phone: string;
  alternatePhone?: string;
  address?: string;
  city?: string;
  aadharNumber?: string;
  skillType: string;
  dailyWage: number;
  overtimeRate?: number;
  bankAccountNo?: string;
  ifscCode?: string;
  isActive: boolean;
  projectId?: string;
  project?: Project;
  siteId?: string;
  site?: Site;
  totalPaid: number;
  totalDue: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Attendance {
  id: string;
  labourId: string;
  labour?: Labour;
  siteId: string;
  site?: Site;
  date: string;
  status: AttendanceStatus;
  hoursWorked?: number;
  overtimeHours?: number;
  wage: number;
  notes?: string;
  markedById: string;
  markedBy?: User;
  createdAt: string;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: ExpenseCategory;
  projectId?: string;
  project?: Project;
  siteId?: string;
  site?: Site;
  vendorId?: string;
  vendor?: Vendor;
  labourId?: string;
  labour?: Labour;
  paymentMode: PaymentMode;
  paymentStatus: PaymentStatus;
  bankAccountId?: string;
  bankAccount?: BankAccount;
  billNumber?: string;
  billDate?: string;
  receiptUrl?: string;
  date: string;
  approvedById?: string;
  approvedBy?: User;
  notes?: string;
  createdById: string;
  createdBy?: User;
  createdAt: string;
  updatedAt: string;
}

export interface Income {
  id: string;
  description: string;
  amount: number;
  type: IncomeType;
  projectId?: string;
  project?: Project;
  siteId?: string;
  site?: Site;
  clientId?: string;
  client?: Client;
  paymentMode: PaymentMode;
  paymentStatus: PaymentStatus;
  bankAccountId?: string;
  bankAccount?: BankAccount;
  referenceNumber?: string;
  receiptUrl?: string;
  date: string;
  dueDate?: string;
  notes?: string;
  receivedById: string;
  receivedBy?: User;
  createdAt: string;
  updatedAt: string;
}

export interface BankAccount {
  id: string;
  accountName: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  branch?: string;
  type: AccountType;
  balance: number;
  isActive: boolean;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  bankAccountId: string;
  bankAccount?: BankAccount;
  type: 'CREDIT' | 'DEBIT';
  amount: number;
  balance: number;
  description: string;
  referenceNumber?: string;
  date: string;
  relatedExpenseId?: string;
  relatedIncomeId?: string;
  createdAt: string;
}

export interface Document {
  id: string;
  name: string;
  type: DocumentType;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  projectId?: string;
  project?: Project;
  siteId?: string;
  site?: Site;
  uploadedById: string;
  uploadedBy?: User;
  tags?: string[];
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  projectId?: string;
  project?: Project;
  siteId?: string;
  site?: Site;
  assignedToId?: string;
  assignedTo?: User;
  createdById: string;
  createdBy?: User;
  dueDate?: string;
  completedAt?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate?: string;
  allDay: boolean;
  type: 'MEETING' | 'SITE_VISIT' | 'CLIENT_CALL' | 'PAYMENT_REMINDER' | 'TASK_DEADLINE' | 'OTHER';
  color?: string;
  projectId?: string;
  project?: Project;
  createdById: string;
  createdBy?: User;
  attendeeIds?: string[];
  location?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'LABOUR_PAYMENT_DUE' | 'CLIENT_PAYMENT_DUE' | 'UPCOMING_MEETING' | 'SITE_VISIT_REMINDER' | 'MATERIAL_PENDING' | 'TASK_REMINDER' | 'GENERAL';
  isRead: boolean;
  userId: string;
  link?: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  user?: User;
  action: AuditAction;
  entity: string;
  entityId?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  description: string;
  createdAt: string;
}

export interface Employee {
  id: string;
  userId: string;
  user?: User;
  employeeId: string;
  department: string;
  designation: string;
  joiningDate: string;
  salary: number;
  bankAccountNo?: string;
  ifscCode?: string;
  panNumber?: string;
  aadharNumber?: string;
  address?: string;
  emergencyContact?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ---- Dashboard ----

export interface DashboardStats {
  totalLeads: number;
  newLeadsThisMonth: number;
  leadsGrowth: number;
  activeProjects: number;
  projectsGrowth: number;
  activeSites: number;
  sitesGrowth: number;
  monthlyIncome: number;
  incomeGrowth: number;
  monthlyExpenses: number;
  expenseGrowth: number;
  cashInHand: number;
  bankBalance: number;
  clientReceivable: number;
  vendorPayable: number;
  overallProfit: number;
  profitGrowth: number;
  profitHistory: { month: string; profit: number }[];
  siteWiseProfitLoss: SiteProfitLoss[];
  expenseByCategory: CategoryBreakdown[];
  paymentModeSummary: CategoryBreakdown[];
  topMaterialPurchases: MaterialPurchaseSummary[];
  recentLeads: Lead[];
}

export interface SiteProfitLoss {
  siteName: string;
  income: number;
  expense: number;
  profit: number;
}

export interface CategoryBreakdown {
  name: string;
  value: number;
  color: string;
}

export interface MaterialPurchaseSummary {
  materialName: string;
  quantity: number;
  unit: string;
  totalAmount: number;
  vendorName: string;
}

export interface RecentActivity {
  id: string;
  type: 'lead' | 'project' | 'expense' | 'income' | 'task' | 'document' | 'site';
  description: string;
  userName: string;
  timestamp: string;
  color: string;
}

export interface TodayTask {
  id: string;
  title: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueTime?: string;
  projectName?: string;
  assignedTo?: string;
}

export interface Reminder {
  id: string;
  title: string;
  description?: string;
  date: string;
  type: 'follow_up' | 'payment' | 'delivery' | 'meeting' | 'deadline';
}

// ---- API Response Wrappers ----

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

export interface RefreshResponse {
  accessToken: string;
}

// ---- Filter Interfaces ----

export interface LeadFilters extends PaginationParams {
  status?: LeadStatus;
  source?: LeadSource;
  assignedToId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface ExpenseFilters extends PaginationParams {
  category?: ExpenseCategory;
  projectId?: string;
  siteId?: string;
  vendorId?: string;
  paymentMode?: PaymentMode;
  paymentStatus?: PaymentStatus;
  dateFrom?: string;
  dateTo?: string;
}

export interface IncomeFilters extends PaginationParams {
  type?: IncomeType;
  projectId?: string;
  clientId?: string;
  paymentMode?: PaymentMode;
  paymentStatus?: PaymentStatus;
  dateFrom?: string;
  dateTo?: string;
}

export interface ProjectFilters extends PaginationParams {
  status?: ProjectStatus;
  type?: ProjectType;
  clientId?: string;
  managerId?: string;
}

export interface TaskFilters extends PaginationParams {
  status?: TaskStatus;
  priority?: TaskPriority;
  projectId?: string;
  assignedToId?: string;
}

export interface AuditLogFilters extends PaginationParams {
  userId?: string;
  action?: AuditAction;
  entity?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface ReportParams {
  type: 'profit_loss' | 'expense_summary' | 'income_summary' | 'project_wise' | 'site_wise' | 'vendor_wise' | 'material_usage';
  dateFrom: string;
  dateTo: string;
  projectId?: string;
  siteId?: string;
}

// ---- Payment History ----

export interface PaymentHistoryRecord {
  id: string;
  direction: 'INFLOW' | 'OUTFLOW';
  paymentType: string;
  paymentDate: string;
  amount: number;
  paymentMethod: PaymentMode;
  reference?: string;
  remarks?: string;
  status: PaymentStatus;
  createdAt: string;
  source: string;
  clientId?: string;
  clientName?: string;
  projectId?: string;
  projectName?: string;
  vendorId?: string;
  vendorName?: string;
  employeeId?: string;
  employeeName?: string;
  labourId?: string;
  labourName?: string;
  accountId?: string;
  accountName?: string;
  accountNo?: string;
  createdById?: string;
  createdByName?: string;
}

export interface PaymentHistorySummary {
  todayInflow: number;
  todayOutflow: number;
  pendingPayments: number;
  completedPayments: number;
  cancelledPayments: number;
}
