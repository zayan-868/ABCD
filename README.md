# ABCD Assessment Portal
**College Student Portal & Admin Management System**

A modern, responsive, full-stack college assessment and administrative portal built with a clean SaaS aesthetic, Role-Based Access Control (RBAC), strict anti-cheat lockdown quiz engine, 10-subject attendance/marks audit, and persistent SQLite database.

---

## 🚀 Live Access

The backend server is running and accessible at:
👉 **[http://localhost:3000](http://localhost:3000)**

### Login Credentials:
| Role | Username | Password | Notes |
| :--- | :--- | :--- | :--- |
| **Admin** | `zayan` | `zayan868` | Exclusive Administrator Access (Full control over students, valuations, grace marks, fees, hall tickets, and quizzes) |
| **Student** | `868` | `868868` | Demo Student: Alex Rivera (3-digit ID rule: username `868`, password `868868`) |

### Student ID & Password Rule:
- All student usernames are strictly **3 digits** (e.g. `868`, `101`, `742`).
- The password for every student is always their **3 digits repeated twice** (e.g. `868` &rarr; `868868`).
- Only Admin (`zayan`) can create student accounts. Students cannot self-register.

---

## 🌟 Key Features

1. **Clean Authentication & RBAC**:
   - Clean institutional login form with only Username and Password input fields.
   - Subtle guidance hint on the login screen for students explaining the 3-digit ID and doubled password convention.
   - Only `zayan` has administrator privileges.

2. **10-Subject Valuation & Fixed Grace Marks System**:
   - Exact audit across 10 official semester subjects.
   - Fixed and fully integrated **Grace Marks** workflow:
     - When students submit outreach / publications / certifications, they select their target subject.
     - When Admin approves the evidence and enters bonus grace marks (e.g. `+4.0` or `+5.0`), the marks are saved directly to `academic_marks.grace_marks`, automatically added into the Continuous Evaluation (`cce_total`), their letter grade is dynamically upgraded, and their Cumulative CGPA is recalculated in SQLite!
     - The Marks table displays a dedicated **Grace Marks** column highlighting approved awards.

3. **Strict Anti-Cheat Lockdown Quiz Portal**:
   - Fullscreen enforcement upon start.
   - Sentinel detection for tab switches and window blur (`visibilitychange` and `blur` events):
     - **1st Infraction**: Modal warning with alert.
     - **2nd Infraction**: Immediate termination and auto-submission with full security logs.
   - Context menus, copy, cut, paste (`Ctrl+C`, `Ctrl+V`), and text selection are strictly disabled.
   - Real-time countdown timer with auto-submit.

4. **Hall Ticket Center & Dues Lock**:
   - Examination admit card with timetable for 10 scheduled papers, biometric stamp, and candidate photo.
   - Print/Download to PDF layout.
   - Administrative lock triggered if fee dues exceed permissible limits.

---

## 🛠️ Technology Stack
- **Backend**: Node.js v24 (`node:http`, `node:fs`, `node:path`, `node:crypto`)
- **Database**: SQLite (`node:sqlite` DatabaseSync) in `data/portal.db`
- **Frontend**: Single-Page App (Tailwind CSS, Lucide icons, Chart.js)
