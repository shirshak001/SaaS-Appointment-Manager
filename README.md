# ReminderFlow — SaaS Appointment Manager

ReminderFlow is a premium, state-of-the-art SaaS Appointment and Customer Relationship Management (CRM) platform. It features automated multi-stage notifications, real-time status updates, active session audit logs, and diagnostic integrations.

---

## 🚀 Technology Stack

### Frontend (SPA Client)
* **Core:** React 18, Vite, ES6 Javascript
* **Styling:** Tailwind CSS, Glassmorphic & Dark-Mode Premium Aesthetics
* **Routing:** React Router DOM (v6) with Role-Based Route Guards
* **Icons:** Lucide React
* **State Management:** Custom React Context providers (`AuthContext`, `ToastContext`)

### Backend (REST API Server)
* **Core:** Node.js, Express
* **Database:** NeDB-Promises (embedded datastore persistence utilizing plain JSON files: `appointments.db`, `users.db`, `messages.db`, `notes.db`, `notifications.db`)
* **Security:** JWT (JSON Web Tokens), BCrypt.js for hashing credentials
* **Engines:** Automated cron-polling scheduler for multi-stage reminders
* **Outbound Communications:**
  * **Meta WhatsApp Cloud API:** Direct HTTP Graph API template integrations
  * **Twilio WhatsApp API:** Legacy/Fallback messaging
  * **Twilio SMS API:** Automated fallback channels if WhatsApp fails
  * **Nodemailer SMTP:** Transactional emails (verification, reset codes)

---

## 🖥️ Frontend Pages & Functionality Map

ReminderFlow's user interface is structured to separate administrative diagnostics, CRM flows, and scheduling interfaces.

### 1. Dashboard (`Dashboard.jsx`)
* **Purpose:** The main operational hub for staff and admins.
* **Key Features:**
  * **Analytical Widgets:** Displays four real-time counts: Today's Bookings, Total Scheduled Appointments, Outbound Message Logs, and Pending Reminders.
  * **Quick Actions Panel:** Easy buttons to jump directly to "New Appointment" or "Verify Integrations".
  * **Live Stream Activity Log:** Real-time updates utilizing Server-Sent Events (SSE) that pop up as reminders get dispatched by the backend loop (complete with wa.me text helper links and diagnostic delivery tags).

### 2. Appointments Directory (`Appointments.jsx`)
* **Purpose:** Searchable data table containing all client bookings.
* **Key Features:**
  * **Search & Filters:** Search by customer name or phone number; filter list by booking status (`Scheduled`, `Confirmed`, `Cancelled`) or dates.
  * **Manual Dispatch Triggers:** Directly trigger manual WhatsApp/SMS reminders for an appointment from the list row.
  * **Status Toggles:** Instantly change statuses (e.g. mark an appointment as `Confirmed` or `Cancelled`).

### 3. Create Appointment Form (`CreateAppointment.jsx`)
* **Purpose:** Booking creation page with conflict protection.
* **Key Features:**
  * **Real-time Conflict Checking:** Sends validation requests (`POST /appointments/check-conflict`) as you input times to check if other appointments overlap.
  * **Suggestion Slots:** If a scheduling conflict is found, the system suggests the next 3 available time slots automatically.
  * **Outbound Confirmations:** On successful creation, it automatically triggers a WhatsApp Template (or SMS fallback) confirmation message.

### 4. Appointment Details View (`AppointmentDetails.jsx`)
* **Purpose:** Granular details view of a single appointment record.
* **Key Features:**
  * **Communication Logs:** Displays a list of all emails, WhatsApps, or SMS messages sent specifically for this appointment, complete with SIDs and delivery errors.
  * **Reminder Progress Timeline:** Interactive checklist showing the status of the 3 automatic reminder stages (24h, 1h, 15m), stating whether they are queued, completed, or failed.

### 5. Customers Directory / CRM (`Customers.jsx`)
* **Purpose:** A CRM view grouping appointments into distinct customer accounts.
* **Key Features:**
  * **Customer Profiles aggregation:** Automatically groups appointment records by phone number to create customer lists.
  * **Loyalty & Attendance Stats:** Tracks total booked slots, completed sessions, and cancellation rates.
  * **Automatic Risk Indicator:** Renders colored badges (`High`, `Medium`, `Low`) based on attendance history (cancellations and no-shows).

### 6. Customer CRM Profile (`CustomerProfile.jsx`)
* **Purpose:** Full timeline and profiling of an individual customer.
* **Key Features:**
  * **Dynamic Risk Score:** Analyzes no-shows (+35 points), cancellations (+25 points), and unresponded reminders (+15 points) vs. successful sessions (-10 points) to output a 0-100 risk level grade.
  * **Timeline of Visits:** Displays a chronological feed of all past and upcoming visits.
  * **Customer Notes Feed:** Log client notes, preferences, or staff comments (saved in NeDB notes database).

### 7. Interactive Calendar (`Calendar.jsx`)
* **Purpose:** Visual month-view appointment grid.
* **Key Features:**
  * **Event Color Coding:** Displays bookings colored by status.
  * **Detail Previews:** Click on any calendar date/event to view card summaries and navigate to details.

### 8. Message Logs Auditor (`Messages.jsx`)
* **Purpose:** System audit trail tracking all outgoing communications.
* **Key Features:**
  * **Channel Mapping:** Clear indicators showing if a message was sent via `email`, `whatsapp`, or `sms`.
  * **Delivery Status Reports:** Shows states (`sent`, `delivered`, `failed`) and the raw error messages if an API failed.

### 9. Settings Dashboard (`Settings.jsx`)
* **Purpose:** Business configurations, session auditing, and testing.
* **Key Features:**
  * **Business Metadata:** Configure default business name, support phone number, and addresses appended to reminders.
  * **Default Reminders Interval:** Set global scheduler rules.
  * **Diagnostics & Message Testing Card:** Direct testing utility enabling admins to send test WhatsApp templates, Twilio SMS fallbacks, and Nodemailer SMTP emails while displaying raw JSON outputs on the UI.
  * **Active Session Manager:** Audits logged-in devices, displaying IP addresses, OS headers, login times, and token expirations.
  * **Database Reset Zone:** Password/confirm-protected clean-slate option.

### 10. Authentication Flow (`Login.jsx`, `VerifyEmail.jsx`, `ForgotPassword.jsx`, `ResetPassword.jsx`)
* **Purpose:** Access control and account security.
* **Key Features:**
  * **Role-Based Guards:** Restricts access to Settings and Analytical Reports to users registered as `admin`.
  * **OTP Email Verification:** New sign-ups are set as `verified: false` and are locked out of the dashboard until verifying the 6-digit OTP code sent to their email.

---

## 🛠️ Third-Party Service Configurations

### 1. WhatsApp Template Messages (Meta Cloud API)
To comply with Meta's **24-hour customer initiation policy**, outbound messages sent outside the customer conversation window must use pre-approved templates. ReminderFlow supports direct template formatting.

#### Confirmation Template Structure (Utility Category)
* **Default Template Body Idea:** 
  `Hello {{1}}, your appointment at {{2}} has been confirmed for {{3}} on {{4}}. For any queries, contact us at {{5}}. Thank you.`
* **In-Code Parameters Mapping (`components[0].parameters`):**
  * `{{1}}` - Customer's First Name
  * `{{2}}` - Business Name (e.g. settings database entry)
  * `{{3}}` - Time (e.g., `10:30 AM`)
  * `{{4}}` - Date (e.g., `June 4`)
  * `{{5}}` - Support Phone Number

#### Reminder Template Structure (Utility Category)
* **Default Template Body Idea:** 
  `Hello {{1}}, this is a reminder that your appointment at {{2}} is scheduled {{3}} — at {{4}} on {{5}}. For any queries, contact us at {{6}}. Thank you.`
* **In-Code Parameters Mapping (`components[0].parameters`):**
  * `{{1}}` - Customer's First Name
  * `{{2}}` - Business Name
  * `{{3}}` - Stage Context (automatically passes `'tomorrow'`, `'in 1 hour'`, `'in 15 minutes'`, or `'soon'`)
  * `{{4}}` - Time (e.g., `10:30 AM`)
  * `{{5}}` - Date (e.g., `June 4`)
  * `{{6}}` - Support Phone Number

### 2. SMS Fallback (Twilio SMS)
If direct Meta Graph API attempts return errors (such as `131030` - user is not on WhatsApp, or auth exceptions), the server intercepts the failure and dispatches a standard text message using Twilio SMS.

---

## 📋 Environment Variables (.env)

Define these variables in your backend service configuration (e.g. Render Dashboard):

| Variable | Description | Example / Default |
|---|---|---|
| `PORT` | API Server Port | `4000` |
| `JWT_SECRET` | Token Sign / Verify Hash Key | `your_secure_secret_key` |
| `META_ACCESS_TOKEN` | Meta Graph API Developer Token | `EAAVl...` |
| `META_PHONE_NUMBER_ID` | Meta Business Sender Number ID | `1130161110182996` |
| `META_CONFIRMATION_TEMPLATE_NAME` | Meta confirmation template | `appointment_confirmation` |
| `META_REMINDER_TEMPLATE_NAME` | Meta reminder template | `appointment_reminder` |
| `META_TEMPLATE_LANGUAGE_CODE` | Code language | `en_US` |
| `TWILIO_ACCOUNT_SID` | Twilio SID | `ACXXXXXXXXXXXXXXXX` |
| `TWILIO_AUTH_TOKEN` | Twilio Auth Token | `your_token` |
| `TWILIO_WHATSAPP_NUMBER` | Twilio WhatsApp sender | `whatsapp:+14155238886` |
| `TWILIO_SMS_NUMBER` | Twilio SMS sender number | `+1XXXXXXXXXX` |
| `SMTP_HOST` | Email Mailbox Server Host | `smtp.gmail.com` |
| `SMTP_PORT` | SMTP Port | `587` |
| `SMTP_SECURE` | Use SSL encryption (465 port) | `false` |
| `SMTP_USER` | SMTP Username/Email | `business@gmail.com` |
| `SMTP_PASS` | App Password generated for SMTP | `your_app_password` |
| `SMTP_FROM` | Outgoing header formatting | `"ReminderFlow" <user@gmail.com>` |

---

## 🤖 AI Context & System Architecture (For AI Agents)

*This section provides details for other AI developers to understand and modify the codebase.*

### Database Datastores (NeDB)
Configured in `backend/config/database.js`. Files are stored inside `backend/data/*.db`.
* **`db.users`**: Fields: `{ _id, email, password (bcrypt), name, role ('admin' | 'staff'), verified (boolean), verification_code, verification_expires_at }`
* **`db.appointments`**: Fields: `{ _id, customer_name, phone, appointment_time, notes, status ('scheduled' | 'confirmed' | 'cancelled'), reminder_sent (bool), reminder_24h (bool), reminder_1h (bool), reminder_15m (bool) }`
* **`db.messages`**: Fields: `{ _id, appointment_id, customer_name, phone, message_type, message_body, delivery_channel ('whatsapp' | 'sms' | 'email'), delivery_status ('sent' | 'delivered' | 'failed'), error_message, message_sid, sent_at }`
* **`db.notes`**: CRM customer profile logs. Fields: `{ _id, customer_phone, note, staff, created_at }`
* **`db.notifications`**: In-app SSE updates.

### API Routes & Endpoint Matrix
All API endpoints are prefixed with `/api`.

#### 1. Authentication (`routes/auth.js`)
* `POST /auth/register` — Creates a new staff/admin user, triggers verification code via SMTP email, stores code in messages.
* `POST /auth/verify-email` — Checks 6-digit code, marks user as verified, signs JWT.
* `POST /auth/login` — Returns a 401 if credentials fail, or a 403 (with verified: false) if verification is pending.
* `GET /auth/me` — Authenticates token in headers and returns active profile.
* `POST /auth/forgot-password` — Issues a recovery token to SMTP.
* `POST /auth/reset-password` — Verifies token and updates user password.
* `GET /auth/sessions` — Parses client request headers (IP and OS) to list active sessions.

#### 2. Appointments Manager (`routes/appointments.js`)
* `GET /appointments` — Lists appointments. Query options: `search`, `status`, `date`.
* `POST /appointments` — Inserts new booking, compiles confirmation template, sends via WhatsApp, and logs fallback to SMS on error.
* `POST /appointments/:id/send-reminder` — Triggers a manual reminder (with template logic and SMS fallback).
* `POST /appointments/check-conflict` — Compares booking times to detect duplicates.

#### 3. Reminder Scheduler (`services/reminderEngine.js`)
* Operates an in-process schedule loop polling the database every 60 seconds (`setInterval`).
* Checks appointments within 3 windows (24h, 1h, 15m).
* Updates flags (`reminder_24h`, `reminder_1h`, `reminder_15m`) and broadcasts real-time updates via Server-Sent Events (SSE) `/api/events`.

#### 4. Settings Diagnostics (`routes/settings.js`)
* `POST /settings/test-messaging` — Directly dispatches testing structures. Evaluates real SMTP or Meta templates, rendering the outcome JSON payload to the UI diagnostics panel.