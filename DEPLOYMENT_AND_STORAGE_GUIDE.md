# Vastu Construction Control Tower — Enterprise Deployment, Storage & Database Guide

**System Owner & Admin Executive:** Sandeep Jadhav  
**Version:** 2.4 Enterprise Gold  
**Architecture:** Modern Full-Stack (React 19 + Vite Frontend, Node.js + Express + Prisma ORM Backend, Cloud/Local Hybrid Storage)

---

## 1. System Architecture & Core Modules

Vastu Construction Control Tower is a high-performance, real-time construction ERP designed to manage multi-site operations, financial telemetry, workforce attendance, material logistics, and compliance auditing.

### Tech Stack Breakdown
* **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, TanStack React Query (`v5`), Framer Motion, Lucide Icons, Sonner (`toast`).
* **Backend:** Node.js (`v20+`), Express (`v4.21`), Prisma ORM (`v6.3`), Zod validation, JSON Web Tokens (JWT Access + Refresh tokens).
* **Database:** PostgreSQL (with automated schema migration and relation integrity via Prisma).
* **Cloud & Storage:** Cloudinary Cloud Storage SDK with automated local disk buffering (`multer`) and resilient fallback.

---

## 2. Storage & Cloud Infrastructure Guide

### Cloudinary Integration vs. Local Storage
The file upload pipeline (`server/src/routes/upload.routes.ts`) uses a hybrid, zero-downtime storage architecture:
1. **Primary Cloud Pipeline (Cloudinary):**  
   If valid credentials (`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`) are present in `.env`, uploaded documents, blueprints, site photos, and vendor bills are automatically sent over secure TLS (`resource_type: 'auto'`, folder: `vastu-construction`). The server returns the permanent CDN URL (`secure_url`) and cleans up temporary local files.
2. **Resilient Local Disk Fallback:**  
   If Cloudinary is unconfigured or unreachable due to network partition, the upload controller automatically falls back to local storage inside `server/uploads/` without failing the user request.

### Environment Configuration for Cloud Storage
Add the following keys to your `server/.env` file:
```env
# Cloud Storage Credentials (Cloudinary)
CLOUDINARY_CLOUD_NAME=your_cloud_name_here
CLOUDINARY_API_KEY=your_api_key_here
CLOUDINARY_API_SECRET=your_api_secret_here
```

---

## 3. Database Management & Prisma ORM

The system uses **Prisma ORM** connecting to a PostgreSQL database (`DATABASE_URL`).

### Key Database Entities (`prisma/schema.prisma`)
* **`User` & `RefreshToken`:** Stores executive credentials, roles (`ADMIN`, `ENGINEER`, `SUPERVISOR`, `CLIENT`), and active session refresh tokens.
* **`Client` & `Project`:** Tracks site projects, budget variance, contract values, stages (`PLANNED`, `IN_PROGRESS`, `COMPLETED`), and client receivables.
* **`Expense` & `ExpenseCategory`:** Granular cost reporting tied to specific sites and vendors (`MATERIAL`, `LABOUR`, `EQUIPMENT`, `SUBCONTRACT`, `OVERHEAD`).
* **`Labour` & `Attendance` & `LabourPayment`:** Manages site workers across specialized trades (`MASON`, `CARPENTER`, `ELECTRICIAN`, `PLUMBER`, `WELDER`, `HELPER`), daily wages (`₹`), muster rolls, and cash advances/settlements.
* **`Material` & `MaterialOrder` & `MaterialCategory`:** Real-time stock alerts, directory of building materials, purchase orders, and supplier receipts.
* **`Vendor` & `VendorCategory`:** Contractor and supplier directory with running balances and payment histories.
* **`Task` & `TaskCategory`:** Engineering assignment board with priority levels and site associations.
* **`AuditLog`:** Immutable telemetry recording **exact user names** (`Sandeep Jadhav`), timestamps, source IP, mutated fields list, and full JSON state diffs (`oldData` $\rightarrow$ `newData`).

### Essential Database Commands
Run these commands from the `server/` directory:
```bash
# 1. Apply schema migrations to PostgreSQL database
npm run db:migrate

# 2. Push schema sync directly (for local staging/development)
npm run db:push

# 3. Seed database with default admin account ('Sandeep Jadhav') & demo data
npm run db:seed

# 4. Open interactive Prisma Studio (Database GUI)
npm run db:studio
```

---

## 4. Custom Category Management & Data Persistence

Vastu Construction Control Tower enables **Admin Sandeep Jadhav** to dynamically define and permanently retain custom categories across all operational modules:
* **Storage Layer:** Custom categories are saved to `localStorage` under key `vastu-custom-categories-v1` using the `useCustomCategories` hook (`client/src/hooks/useCustomCategories.ts`).
* **Cross-Component Reactivity:** Whenever an admin adds or deletes a category in any dropdown (via `CategorySelect.tsx`), the system emits a custom event (`custom-categories-changed`), instantly synchronizing the category options across `Materials`, `Tasks`, `Expenses`, `Vendors`, and `Labour` screens without a browser reload.

---

## 5. Security & Identity Enforcement

* **Executive Normalization:** System identity is strictly normalized to **Admin Sandeep Jadhav** across the application (`authStore.ts`, `Header.tsx`, site logs, and telemetry). Any legacy or fallback names are automatically intercepted and replaced on state hydration.
* **Telemetry & Compliance:** The `AuditLogsPage` features a live inspection engine (`Inspect Diff` modal) that shows side-by-side snapshots (`oldData` vs `newData`) and highlights exactly which fields (`changedFields`) were mutated during an operation.

---

## 6. Step-by-Step Production Deployment Guide

### A. Backend Deployment (Node.js / Express on Render / AWS / Railway / DigitalOcean)
1. **Set Environment Variables:**
   ```env
   PORT=3001
   NODE_ENV=production
   DATABASE_URL="postgresql://user:password@host:5432/vastu_db?sslmode=require"
   ACCESS_TOKEN_SECRET="generate_secure_random_hex_key_here_64_chars"
   REFRESH_TOKEN_SECRET="generate_secure_random_hex_key_here_64_chars"
   ACCESS_TOKEN_EXPIRY="15m"
   REFRESH_TOKEN_EXPIRY="7d"
   CLIENT_URL="https://vastuconstruction.in"
   CLOUDINARY_CLOUD_NAME="your_cloud_name"
   CLOUDINARY_API_KEY="your_api_key"
   CLOUDINARY_API_SECRET="your_api_secret"
   ```
2. **Build & Start Service:**
   ```bash
   cd server
   npm install
   npx prisma generate
   npm run db:migrate
   npm run build
   npm start
   ```

### B. Frontend Deployment (Vite / React 19 on Vercel / Netlify / Cloudflare Pages)
1. **Set Build Environment Variable:**
   ```env
   VITE_API_URL="https://api.vastuconstruction.in/api"
   ```
2. **Build Static Assets:**
   ```bash
   cd client
   npm install
   npm run build
   ```
3. **Configure Routing (`vercel.json` / `_redirects`):**  
   Ensure all client-side routes redirect to `index.html` for React Router SPA navigation:
   ```json
   {
     "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
   }
   ```

---

## 7. Verification Checklist for Admin
- [x] **Quick Add Action:** Top bar `Quick Add` button opens the exact creation modal (`Project`, `Expense`, `Material Order`, `Labour Check-in`, `Task Assignment`, `Document Upload`, `Lead`) across any active route (`?action=create` listener).
- [x] **Invalid Data Notifications:** Field-level parsing (`errorHandler.ts`) provides precise feedback (`Validation Error: amount: Expected number`) instead of generic alerts.
- [x] **Cloud Storage:** Files upload to Cloudinary with CDN URLs or buffer safely to local disk.
- [x] **Trade & Skill Categories:** Workers, Materials, Vendors, Expenses, and Tasks support permanent `+ Add Custom Category` and deletion directly from the dropdown UI.
- [x] **Audit Log Diffs:** Full inspection modal showing exact executive (`Sandeep Jadhav`), action, timestamp, mutated fields, and side-by-side data comparison.
