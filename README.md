# 📦 React + Supabase Organization Dashboard (Frontend)

A role-based dashboard frontend built with **React + Vite**, using **Supabase Auth + PostgreSQL** for authentication and access control.

This app provides a secure organization-level dashboard with role-aware routing and permissions.

---

## ✨ Features

- Public landing page
- Email/password authentication via Supabase
- Role-based routing (`/admin`, `/user`)
- Organization-level access control
- Protected routes
- Session-aware navigation

---

## 🧰 Tech Stack

- **React 18**
- **Vite**
- **React Router v6**
- **Supabase JS SDK**
- **PostgreSQL** (via Supabase)

---

## 🗂️ Project Structure

```
src/
│
├── pages/
│   ├── Home.jsx
│   ├── auth/
│   │   ├── SignIn.jsx
│   │   └── SignUp.jsx
│   ├── admin/
│   │   └── AdminDashboard.jsx
│   └── user/
│       └── UserDashboard.jsx
│
├── components/
│   └── ProtectedRoute.jsx
│
├── context/
│   └── AuthContext.jsx
│
├── lib/
│   └── supabase.js
│
├── App.jsx
├── main.jsx
└── index.css
```

---

## 🔐 Authentication & Authorization Model

### Authentication

Handled by **Supabase Auth** using email/password login.

---

### Authorization

Access control is managed through a custom database table:

#### `organization_users`

| Column   | Description |
|----------|-------------|
| user_id  | Supabase auth user ID |
| org_id   | Organization UUID |
| role     | `org_admin`, `finance`, `procurement`, `viewer` |
| status   | `active`, `invited`, `suspended` |

---

### Role-Based Routing

| Role | Route |
|------|-------|
| `org_admin` | `/admin` |
| All other active roles | `/user` |

Navigation occurs immediately after login — no redirect logic exists on `/`.

---

## 🌐 Routes

| Route | Access |
|-------|--------|
| `/` | Public landing page |
| `/signin` | Public |
| `/signup` | Public |
| `/admin` | org_admin only |
| `/user` | Non-admin active roles |

---

## 📦 Installation

Clone the repository:

```bash
git clone <your-repo-url>
cd <repo-name>
```

Install dependencies:

```bash
npm install
```

---

### Main Dependencies

```bash
npm install react react-dom
npm install react-router-dom
npm install @supabase/supabase-js
```

---

### Dev Dependencies (via Vite)

```bash
npm install -D vite
```

---

## ▶ Running the App

Start the development server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Preview production build:

```bash
npm run preview
```

---

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

## 🚀 Future Enhancements

- Multi-organization switching
- Role management UI
- Admin invite system
- Audit logging
- Permission granularity
- Dashboard analytics

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
