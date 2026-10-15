# PulseTask — Persistent Multi-Tenant Task & Reminder Portal

A production-ready, Todoist-inspired multi-user task portal built with **Next.js (App Router)**, **MongoDB (Mongoose + `@auth/mongodb-adapter`)**, **NextAuth.js**, and **Tailwind CSS**.

## Live Deployments
- **GitHub Pages**: Automatically built and deployed via `.github/workflows/deploy-pages.yml` to `https://internetmisuser.github.io/reminderapp/`
- **Vercel Serverless + Cron**: Ready for one-click import on Vercel with `/api/cron/reminders` schedule via `vercel.json`.

## Core Features
1. **Multi-Tenant Authentication**:
   - Local Email & Password login and registration (`/api/auth/register` with `bcryptjs` 12-round password hashing).
   - OAuth providers configured for **Google**, **GitHub**, **Facebook**, and **Apple**.
   - Strict tenant isolation (`userId` scoping on every MongoDB query and mutation).
2. **Todoist-Inspired Responsive Dashboard**:
   - **Inbox**, **Today**, and **Upcoming** views with responsive mobile drawer navigation.
3. **High-Frequency Persistent Reminder Engine**:
   - Monthly recurring tasks support custom overdue persistence intervals:
     - **2x a day** (9:00 AM & 6:00 PM)
     - **3x a day** (9:00 AM, 2:00 PM & 7:00 PM)
     - **Hourly** (Waking hours: 8:00 AM – 8:00 PM)
   - Triggers persistent desktop notifications via the **Web Notifications API** (`requireInteraction: true`) until completed.
   - **State Reset**: Completing a recurring monthly task silences active alerts and automatically advances `baseDueDate` to the next calendar month.

## Quick Start
```bash
npm install
cp .env.example .env.local
npm run dev
```

### Building for GitHub Pages
```bash
npm run build:pages
```
