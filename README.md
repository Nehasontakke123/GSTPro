# GST Reconciliation System Pro 🇮🇳

A production-ready full-stack MERN application for reconciling Purchase data against GSTR2B records.

## 🏗️ Architecture

```
GSTPro/
├── backend/          # Node.js + Express + MongoDB
│   ├── src/
│   │   ├── config/      # DB connection
│   │   ├── controllers/ # Route handlers
│   │   ├── middleware/  # Auth, Upload, Error
│   │   ├── models/      # Mongoose schemas
│   │   ├── routes/      # Express routers
│   │   ├── services/    # Reconciliation engine
│   │   └── utils/       # File parser, seeder
│   └── uploads/         # Uploaded files (auto-created)
└── frontend/         # React + Vite + Tailwind CSS
    └── src/
        ├── components/  # Layout, ProtectedRoute
        ├── lib/         # Axios instance
        ├── pages/       # Login, Register, Dashboards
        └── store/       # Zustand (auth + theme)
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB running locally on port 27017

### 1. Setup Backend
```bash
cd backend
npm install
# Edit .env if needed
npm run seed      # Creates 3 demo users
npm run dev       # Starts on port 5000
```

### 2. Setup Frontend
```bash
cd frontend
npm install
npm run dev       # Starts on port 5173
```

## 🔑 Demo Credentials

| Role    | Email                  | Password    |
|---------|------------------------|-------------|
| Admin   | admin@gstpro.com       | Admin@123   |
| Client  | client@gstpro.com      | Client@123  |
| Officer | officer@gstpro.com     | Officer@123 |

## 📋 CSV Format

### GSTR2B Upload (Admin)
```csv
GSTIN,Invoice Number,Supplier GSTIN,Supplier Name,Taxable Amount,IGST,CGST,SGST,Total Amount,Return Period
27AAAPL1234C1ZT,INV-001,27AABCU9603R1ZX,Supplier Co,10000,1800,0,0,11800,032024
```

### Purchase Upload (Client)
```csv
GSTIN,Invoice Number,Supplier GSTIN,Supplier Name,Taxable Amount,IGST,CGST,SGST,Total Amount
27AAAPL1234C1ZT,INV-001,27AABCU9603R1ZX,Supplier Co,10000,1800,0,0,11800
```

## 🔌 API Endpoints

| Method | Endpoint                              | Access  |
|--------|---------------------------------------|---------|
| POST   | /api/auth/register                    | Public  |
| POST   | /api/auth/login                       | Public  |
| POST   | /api/admin/upload-gstr2b              | Admin   |
| GET    | /api/admin/gstr2b-history             | Admin   |
| GET    | /api/admin/users                      | Admin   |
| GET    | /api/admin/stats                      | Admin   |
| POST   | /api/client/upload-purchase           | Client  |
| GET    | /api/client/results                   | Client  |
| GET    | /api/client/results/:id/download      | Client  |
| GET    | /api/officer/matched                  | Officer |
| GET    | /api/officer/matched/download         | Officer |
| GET    | /api/officer/reconciliations          | Officer |
| GET    | /api/officer/stats                    | Officer |

## ✨ Features
- JWT Authentication + RBAC (Admin/Client/Officer)
- Drag & Drop CSV/Excel Upload
- Auto-reconciliation on upload
- Match logic: GSTIN + Invoice Number
- Reason codes: missing, amount mismatch, tax mismatch
- CSV export of unmatched/matched records
- Charts (Pie + Bar) on Officer dashboard
- Dark Mode toggle
- Framer Motion animations
- Glassmorphism UI design
- Fully responsive (mobile + tablet + desktop)