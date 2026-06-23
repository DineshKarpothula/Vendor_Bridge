# VendorBridge: Next-Gen Enterprise Procurement Ecosystem

**VendorBridge** is an institutional-grade procurement management platform designed to streamline the entire supply chain lifecycle—from vendor onboarding and RFQ (Request for Quotation) dispatch to bid evaluation and automated Purchase Order generation.

Built with a high-density, professional aesthetic, VendorBridge ensures transparency, compliance, and efficiency for enterprises managing complex procurement cycles.

---

## 🚀 Key Features

- **Dynamic Role-Based Portals**: Dedicated interfaces for Admins, Officers, Managers, and Vendors.
- **Smart Bid Evaluation**: Automated L1 (Lowest Bidder) identification and side-by-side technical comparison.
- **PO & Invoice Automation**: Instant generation of professional Purchase Orders and tax-compliant invoices upon approval.
- **Immutable Audit Trail**: Chronological logging of every system action for full regulatory compliance.
- **Glassmorphism Premium UI**: A modern, high-trust interface built with React and Tailwind CSS.

---

## 👥 Roles & Responsibilities

### 1. Admin (The Orchestrator)
- Manages the **Vendor Registry**.
- Monitors the full **Audit Trail** and system health.
- Has global visibility into all procurement activities and analytics.

### 2. Procurement Officer (The Executor)
- Drafts and dispatches **RFQs** to the vendor network.
- Performs **Bid Evaluation** using the comparison matrix.
- Initiates the approval workflow for selected quotations.

### 3. Manager / Approver (The Authorizer)
- Reviews pending procurement submissions in the **Approvals Queue**.
- Authorizes or rejects contracts based on compliance and budget.
- Triggers automated Purchase Order generation.

### 4. Vendor (The Partner)
- Accesses the **Bidding Opportunities** dashboard.
- Submits commercial and technical bids for open RFQs.
- Manages invoices and communicates with procurement officers.

---

## 🧪 Testing & Credentials

Use the following credentials to explore the system. All accounts share the same password for testing convenience.

**Password for all accounts:** `Password@123`

| Role | Email Address | Primary View |
| :--- | :--- | :--- |
| **Admin** | `admin@vendorbridge.com` | Registry & Audit |
| **Procurement Officer** | `officer@vendorbridge.com` | RFQ & Evaluation |
| **Manager** | `manager@vendorbridge.com` | Approval Queue |
| **Vendor** | `vendor@vendorbridge.com` | Bidding Portal |

---

## 🛠️ Technology Stack

- **Frontend**: React.js, Vite, Tailwind CSS (Vanilla CSS & Glassmorphism)
- **Backend**: Node.js, Express.js
- **Database**: MongoDB (Mongoose ODM)
- **Authentication**: JWT (JSON Web Tokens) with Secure Local Persistence

---

## 📦 Installation & Setup

1. **Clone the Repository**
   ```bash
   git clone https://github.com/DineshKarpothula/Vendor_Bridge.git
   ```

2. **Backend Configuration**
   - Create a `.env` file in the `backend` folder.
   - Add your `MONGODB_URI` and `JWT_SECRET`.

3. **Install Dependencies**
   ```bash
   npm install
   cd backend && npm install
   ```

4. **Seed the Database**
   ```bash
   node seed_roles.js
   ```

5. **Run the Application**
   - Backend: `npm run server:dev`
   - Frontend: `npm run dev`

---

## 📜 License
© 2026 VendorBridge Enterprise Core. All Rights Reserved. Built for excellence in procurement.
