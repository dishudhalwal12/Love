export const dashboardData = {
  kpis: {
    todaysLeads: 24,
    hotLeads: 8,
    revenueToday: 3450,
    pendingPayments: 1200,
    activeProjects: 45,
    deadlinesThisWeek: 12,
    topPartner: "Alex T.",
    monthlyNet: 18500,
  },
  liveActivity: [
    { id: 1, type: "lead", message: "New lead from Stanford", time: "2 min ago", status: "new" },
    { id: 2, type: "payment", message: "Payment received ₹450", time: "15 min ago", status: "success" },
    { id: 3, type: "order", message: "Order #4092 submitted", time: "1 hour ago", status: "pending" },
    { id: 4, type: "partner", message: "Alex T. referred 2 leads", time: "2 hours ago", status: "active" },
    { id: 5, type: "task", message: "Draft for Order #4088 ready", time: "3 hours ago", status: "success" },
  ],
  urgentActions: [
    { id: 1, message: "Review pending payment for #4090", type: "payment" },
    { id: 2, message: "Deadline in 24h for Order #4085", type: "deadline" },
    { id: 3, message: "Client requested revision #4082", type: "task" },
  ],
};

export const leadsData = [
  { id: "L-101", name: "Sarah Jenkins", college: "NYU", source: "Instagram", deadline: "Oct 24", budget: "₹500", status: "Hot", score: 95 },
  { id: "L-102", name: "Michael Chang", college: "Stanford", source: "Referral", deadline: "Oct 28", budget: "₹350", status: "Negotiating", score: 82 },
  { id: "L-103", name: "Emma Wilson", college: "UCLA", source: "Website", deadline: "Nov 2", budget: "₹200", status: "New", score: 60 },
  { id: "L-104", name: "David Kim", college: "UC Berkeley", source: "Partner", deadline: "Oct 25", budget: "₹800", status: "Lost", score: 10 },
  { id: "L-105", name: "Sophia Martinez", college: "UT Austin", source: "Instagram", deadline: "Oct 30", budget: "₹450", status: "Hot", score: 88 },
];

export const ordersData = [
  { id: "ORD-4092", college: "Columbia", topic: "Machine Learning Ethics", paidPercent: 50, deadline: "Oct 25", status: "In Progress" },
  { id: "ORD-4091", college: "NYU", topic: "Macroeconomics Essay", paidPercent: 100, deadline: "Oct 24", status: "Review" },
  { id: "ORD-4090", college: "Stanford", topic: "Data Structures Project", paidPercent: 0, deadline: "Oct 28", status: "Pending Payment" },
  { id: "ORD-4089", college: "UCLA", topic: "History Dissertation Chapter", paidPercent: 100, deadline: "Nov 5", status: "Active" },
  { id: "ORD-4088", college: "UC Berkeley", topic: "Business Plan Analysis", paidPercent: 50, deadline: "Oct 23", status: "Urgent" },
  { id: "ORD-4087", college: "Harvard", topic: "Literature Review", paidPercent: 100, deadline: "Oct 22", status: "Done" },
];

export const paymentsData = {
  stats: {
    collectedToday: 1250,
    pending: 3400,
    thisMonth: 24500,
  },
  transactions: [
    { id: "TX-901", orderId: "ORD-4091", client: "Sarah J.", amount: 250, method: "Stripe", date: "Today", status: "Paid" },
    { id: "TX-902", orderId: "ORD-4090", client: "Michael C.", amount: 400, method: "PayPal", date: "Today", status: "Pending" },
    { id: "TX-903", orderId: "ORD-4088", client: "David K.", amount: 150, method: "Zelle", date: "Yesterday", status: "Paid" },
    { id: "TX-904", orderId: "ORD-4085", client: "Emma W.", amount: 300, method: "Crypto", date: "Oct 20", status: "Paid" },
    { id: "TX-905", orderId: "ORD-4082", client: "Sophia M.", amount: 500, method: "Stripe", date: "Oct 19", status: "Failed" },
  ],
};

export const partnersData = [
  { id: "P-01", name: "Alex Thompson", college: "NYU", leads: 45, converted: 22, commissionDue: 850, trustScore: 98 },
  { id: "P-02", name: "Jessica Lee", college: "UCLA", leads: 32, converted: 15, commissionDue: 400, trustScore: 92 },
  { id: "P-03", name: "Marcus Johnson", college: "Stanford", leads: 18, converted: 5, commissionDue: 150, trustScore: 75 },
  { id: "P-04", name: "Elena Rodriguez", college: "UT Austin", leads: 56, converted: 30, commissionDue: 1200, trustScore: 99 },
];

export const tasksData = {
  today: [
    { id: "T-1", title: "Review Draft for ORD-4091", tags: ["Review", "NYU"] },
    { id: "T-2", title: "Send Quote to Emma W.", tags: ["Lead", "Sales"] },
  ],
  urgent: [
    { id: "T-3", title: "Finalize ORD-4088", tags: ["Editing", "UC Berkeley"] },
    { id: "T-4", title: "Follow up failed TX-905", tags: ["Payment"] },
  ],
  waitingClient: [
    { id: "T-5", title: "Awaiting clarification ORD-4089", tags: ["Question"] },
    { id: "T-6", title: "Pending initial deposit ORD-4090", tags: ["Payment"] },
  ],
  done: [
    { id: "T-7", title: "Deliver ORD-4087", tags: ["Delivery"] },
    { id: "T-8", title: "Onboard new partner Jessica L.", tags: ["Partner"] },
  ],
};
