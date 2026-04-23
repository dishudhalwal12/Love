# LOVE - Product Requirements Document (PRD) V1

## Product Name

**LOVE**

## Product Type

Internal operations system for **Love Assignment**.
A private command-center dashboard to manage leads, payments, projects, partners, automations, communication, files, and business intelligence.

## Product Goal

Build a dark premium internal dashboard that helps a small founder team operate a high-volume seasonal student project business efficiently.

The system should reduce chaos, increase conversion, improve collections, track delivery, and provide actionable intelligence.

## Product Inspiration

* Paperclip layout structure
* Linear speed + spacing
* Notion clarity
* Slack sidebar navigation
* WhatsApp communication flow
* Stripe-grade dashboard cleanliness

---

# Core Users

## Primary User

Founder / Admin

## Secondary User

Partner / Sales Operator

## Future Users

* Delivery Manager
* Finance Operator
* Campus Partner Manager

---

# Design Language

## Theme

* Dark mode only (v1)
* Matte black background
* White primary text
* Gray secondary text
* Green = success / paid / healthy
* Red = overdue / failed / urgent
* Yellow = pending / review
* Blue = new / active

## Feel

* Premium
* Fast
* Minimal
* High trust
* Sharp typography
* No clutter
* Dense but readable

## UI Rules

* Sidebar always visible on desktop
* Responsive mobile drawer menu
* Rounded cards
* Smooth subtle transitions
* Keyboard shortcuts supported
* Search-first workflow

---

# Tech Stack

## Frontend

* Next.js (App Router)
* TypeScript
* Tailwind CSS
* shadcn/ui
* Framer Motion (light usage)

## Backend

* Firebase Auth
* Firestore
* Firebase Storage
* Firebase Cloud Functions (optional later)

## Automation

* n8n webhooks

## Integrations

* WhatsApp wa.me links
* Razorpay (later optional)
* Google Drive (optional)
* GitHub links (project delivery)

---

# Main Navigation Sidebar

```text
LOVE

Dashboard
Inbox
Leads
Orders
Projects
Payments
Partners
Tasks
Files
Automations
Analytics
Templates
Settings
```

Bottom Sidebar:

```text
Founder Profile
Online Status
Season Mode Toggle
```

---

# Core Modules

---

# 1. Dashboard

## Purpose

Give founder instant visibility.

## Components

### KPI Cards

* Today's Leads
* Hot Leads
* Revenue Today
* Pending Payments
* Active Projects
* Deadlines This Week
* Top Partner
* Monthly Net

### Live Intelligence Feed

Examples:

* Synopsis sent but unpaid after 6h
* JIMS college converting best
* 2 projects due in 3 days
* Hot lead active now
* Partner inactive 5 days

### Urgent Actions Panel

* Pending final balances
* Overdue synopsis
* Unreplied hot leads
* Delayed projects

---

# 2. Inbox

## Purpose

Unified communication center.

## Layout

Left:

* Lead chats
* Client chats
* Partner chats
* Unread filter

Right:
Conversation panel

## Action Buttons

* Call
* WhatsApp
* Send Quote
* Request Advance
* Generate Reply
* Convert to Order
* Add Reminder
* Create Group

---

# 3. Leads CRM

## Purpose

Manage all prospects.

## Table Columns

* Name
* Phone
* College
* Course
* Source
* Deadline
* Budget
* Status
* Lead Score
* Owner

## Pipeline Status

```text
New
Contacted
Interested
Negotiating
Booked
Lost
```

## Lead Drawer Detail

* Full notes
* Chat history
* Last contacted
* Next reminder
* Suggested action

## Buttons Per Lead

* Call
* WhatsApp
* Onboard
* Send Quote
* Mark Hot
* Convert
* Lost

---

# 4. Onboarding Flow

## Trigger

When lead becomes booked.

## Button: ONBOARD

## Workflow

1. Popup asks:

   * Team members names
   * Numbers
   * Topic selected?
   * Amount
2. Generate Order ID
3. Open WhatsApp group link flow
4. Prefilled welcome message
5. Mark onboard complete
6. Disable duplicate onboard button

## Welcome Message

```text
Welcome to Love 🎓

Your project is booked.

Order ID: LA-241
Status: Topic Selection

Please add all team members in this group.
We’ll guide you step by step.
```

---

# 5. Orders

## Purpose

Track all converted customers.

## Card Fields

* Order ID
* College
* Team Size
* Topic
* Deadline
* Amount
* Paid %
* Risk Score
* Status
* Last Activity

## Stages

```text
Booked
Synopsis
Development
Review
Report
Final Payment
Delivered
Closed
```

---

# 6. Projects

## Purpose

Internal production board.

## Kanban Columns

```text
To Build
Building
Waiting Client Input
QA Check
Ready
Delivered
```

## Card Fields

* Order ID
* Stack
* Template Used
* ETA
* Priority

---

# 7. Payments

## Purpose

Money control center.

## Metrics

* Collected Today
* Pending Total
* This Month Revenue
* Partner Commission Due

## Buttons

* Send UPI Link
* Generate Invoice
* Payment Reminder
* Mark Partial
* Mark Paid

## Rules

If unpaid > 48h after reminder → alert.

---

# 8. Partners

## Purpose

Manage ambassadors / campus partners.

## Table Columns

* Name
* College
* Leads Sent
* Converted
* Revenue Generated
* Commission Due
* Trust Score
* Status

## Features

* Monthly leaderboard
* Replace inactive partner suggestions

---

# 9. Tasks

## Purpose

Daily operations queue.

## Columns

```text
Today
Urgent
Waiting Client
Waiting Payment
Done
```

Tasks can be auto-generated.

---

# 10. Files

## Purpose

Store client assets.

## Searchable by Order ID

Folder Example:

```text
LA-241
 synopsis.pdf
 report.docx
 source.zip
 receipt.png
```

---

# 11. Automations

## Purpose

Webhook control center.

## Cards

* New Lead Webhook
* Payment Success
* Generate Synopsis
* Reminder Flow
* Ghost Lead Follow-up
* Partner Signup

## Each Shows

* Status green/red
* Last run
* Failures
* Edit webhook

---

# 12. Analytics

## Charts

* Leads by College
* Conversion Rate
* Revenue Weekly
* Best Source
* Avg Order Value
* Collection Speed
* Partner Performance

---

# 13. Templates

## Internal inventory of ready projects.

Fields:

* Template Name
* Stack
* Category
* Customization Time
* Sold Count

---

# 14. Global Search (Critical)

## Shortcut

Cmd + K / Ctrl + K

## Search:

* Order ID
* Name
* College
* Topic
* Partner

## Result Example

```text
LA-241
Paid 40%
Synopsis sent Apr 18
Deadline May 12
Next Step: Collect Balance
```

---

# Intelligence Engine (Rules Based v1)

## Alerts

### If synopsis sent + unpaid 6h

Suggest reminder.

### If lead replies after 10pm

Mark hot lead.

### If same college high conversion

Suggest more focus.

### If project due in 3 days

Move urgent.

### If partner inactive 7 days

Suggest replacement.

---

# Data Model (Firestore Collections)

```text
users
leads
orders
projects
payments
partners
messages
tasks
files
templates
analytics_events
settings
```

---

# Security

* Firebase Auth login required
* Admin-only access v1
* Secure webhook secret tokens
* Role permissions later
* Daily backup export option

---

# Mobile Experience

## Priority

Founder should manage from phone.

## Quick Actions

* Call lead
* Mark paid
* View urgent tasks
* Search order
* Send reminder

---

# MVP Scope (Build First)

1. Auth
2. Sidebar Layout
3. Dashboard
4. Leads CRM
5. Orders
6. Payments
7. Partners
8. Search
9. Automations
10. Dark theme polish

---

# Post-MVP

* WhatsApp API sync
* AI auto replies
* ML lead scoring
* Team roles
* Auto invoices PDF
* Revenue forecasting

---

# Success Metrics

* Faster lead response time
* Higher conversion rate
* Lower payment leakage
* Better deadline management
* Higher seasonal revenue
* Lower founder chaos

---

# Final Product Principle

LOVE should feel like:

> A silent operations manager that helps the founder print money calmly.
