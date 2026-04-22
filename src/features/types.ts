export interface Lead {
  id?: string;
  name: string;
  college: string;
  source: string;
  deadline: string;
  budget: number;
  status: "New" | "Contacted" | "Interested" | "Negotiating" | "Booked" | "Lost";
  phone?: string;
  score: number;
  createdAt: number;
}

export interface OrderTimelineEvent {
  id: string;
  title: string;
  description?: string;
  status: "completed" | "current" | "upcoming";
  date: number;
}

export interface FileItem {
  id: string;
  name: string;
  url: string;
  size: number;
  type: string;
  uploadedAt: number;
  orderId: string;
}

export interface Order {
  id?: string;
  orderId: string;
  leadId?: string;
  clientName: string;
  college: string;
  topic: string;
  amount: number;
  amountPaid: number;
  status: "Booked" | "Synopsis" | "Development" | "Review" | "Final Payment" | "Delivered" | "Closed";
  deadline: string;
  createdAt: number;
  timeline?: OrderTimelineEvent[];
  riskScore?: number;
  clientNotes?: string;
  tasksLinked?: string[]; // array of task IDs
}

export interface Payment {
  id?: string;
  orderId: string;
  amount: number;
  method: string;
  note?: string;
  paidAt: number;
  clientName: string;
  status: "Paid" | "Pending" | "Failed";
}

export interface Partner {
  id?: string;
  name: string;
  college: string;
  phone: string;
  leadsSent: number;
  converted: number;
  commissionDue: number;
  trustScore: number;
  status: "Active" | "Inactive";
}

export interface Task {
  id: string;
  title: string;
  tags: string[];
  columnId: string; // 'today', 'urgent', 'waitingClient', 'done'
  createdAt: number;
  order: number;
}

export interface ActivityLog {
  id?: string;
  message: string;
  status: "new" | "success" | "pending" | "active" | "urgent";
  timestamp: number;
  type: string;
}

export interface WhatsAppTemplate {
  id: string;
  name: string;
  text: string;
}

export interface AppSettings {
  id?: string;
  pricingTiers: { name: string; price: number }[];
  defaultBookingAmount: number;
  whatsappTemplates: WhatsAppTemplate[];
  webhookUrls: { name: string; url: string }[];
  founderProfile: { name: string; email: string; phone: string };
  seasonModeEnabled: boolean;
  commissionSlabs: { minLeads: number; maxLeads: number; percentage: number }[];
  themePreferences: { primaryColor: string; darkMode: boolean };
}
