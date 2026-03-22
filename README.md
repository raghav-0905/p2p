# 📦 P2P OrgNet – React + Supabase Dashboard

A modern **peer-to-peer organization dashboard** built with **React + Vite**, using **Supabase Auth + PostgreSQL** for secure, role-based access control.

---

## ✨ Features

- SaaS-style landing page
- Email/password authentication
- Organization-based onboarding using **Organization Code**
- Role-based dashboards (Admin / User)
- Protected routes
- Modern ERP-style UI with Material UI

---

## 🧰 Tech Stack

- **React 18**
- **Vite**
- **React Router v6**
- **Material UI (MUI)**
- **Supabase Auth**
- **PostgreSQL (Supabase)**

---

## 🗂️ Project Structure

src/
│
├── pages/
│ ├── Home.jsx
│ ├── auth/
│ │ ├── SignIn.jsx
│ │ └── SignUp.jsx
│ ├── admin/
│ │ └── AdminDashboard.jsx
│ └── user/
│ └── UserDashboard.jsx
│
├── components/
│ └── ProtectedRoute.jsx
│
├── context/
│ └── AuthContext.jsx
│
├── lib/
│ └── supabase.js
│
├── theme/
│ └── theme.js
│
├── App.jsx
├── main.jsx
└── index.css
---


---

## 🔐 Authentication & Authorization

### Authentication
Handled via **Supabase Auth** (email/password).

### Authorization
Managed using organization-based mapping.

---

## 🏢 Database Model (Supabase)

### `organizations`

| Column | Description |
|------|-------------|
| id | Organization UUID |
| legal_name | Legal entity name |
| trade_name | Optional display name |
| org_code | **Admin-defined unique join code** |
| is_active | Organization status |

> `org_code` is manually created by admins and used during signup.

---

### `organization_users`

| Column | Description |
|------|-------------|
| user_id | Supabase auth user ID |
| org_id | Organization UUID |
| role | `org_admin`, `finance`, `procurement`, `viewer` |
| status | `active`, `invited`, `suspended` |

---

## 📝 Signup Flow (Important)

1. User enters **Organization Code**
2. Code is validated against `organizations.org_code`
3. User account is created via Supabase Auth
4. Entry added to `organization_users`
5. User is redirected to **Sign In**

> No auto-generation of org codes — fully admin controlled.

---

## 🛂 Role-Based Routing

| Role | Route |
|----|------|
| `org_admin` | `/admin` |
| `finance`, `procurement`, `viewer` | `/user` |

Routing is enforced using `ProtectedRoute`.

---

## 🌐 Routes

| Route | Access |
|------|--------|
| `/` | Public landing page |
| `/signin` | Public |
| `/signup` | Public |
| `/admin` | Admin only |
| `/user` | Active non-admin users |

---

## 🔒 Supabase RLS Policies (Required)

- Allow reading organizations (for org code validation)
- Allow users to insert **only their own** row into `organization_users`

---

## 📦 Installation

```bash
git clone <repo-url>
cd <project-folder>
npm install

## ⚙️ Environment Setup

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

---

## 🔒 Protected Routes

The `ProtectedRoute` component ensures:

- User authentication
- Active organization membership
- Role-based access enforcement

Unauthorized users are redirected automatically.

---



## 📄 License

MIT License — feel free to use and modify.

---

## 🤝 Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss your proposal.

---

## 💬 Support

If you encounter issues, open a GitHub issue or reach out to the maintainers.

---

**Built with ❤️ using React + Supabase**
