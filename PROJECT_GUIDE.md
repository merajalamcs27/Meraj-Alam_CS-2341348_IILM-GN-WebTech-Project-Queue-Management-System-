# 📘 Developer Guide: Professional Smart Queue Management System

This document provides a comprehensive overview of the system architecture, real-time data flow, and advanced features implemented in the Smart Queue Management System.

---

## 🏗 System Architecture

The project follows a **Monolithic MVC (Model-View-Controller)** architecture, enhanced with real-time bidirectional communication and cloud persistence.

-   **Frontend (View)**: Static assets served via Express. Uses a **Glassmorphism Design System** with a professional hospital-themed color palette (`#355872` / `#F7F8F0`).
-   **Backend (Controller)**: `server.js` manages HTTP REST endpoints, WebSocket events via Socket.io, and user sessions for admin security.
-   **Persistence (Model)**: MongoDB Atlas (Cloud) stores token data. Mongoose schemas ensure data integrity and support advanced fields like `appointmentTime`.

---

## 🔄 Core Workflows

### 1. Secure Admin Lifecycle
To protect sensitive patient data and management tools:
-   **Authentication**: Implemented using `express-session`. Admin credentials are kept in secure environment variables.
-   **Authorization**: The `/admin.html` dashboard is protected by a login overlay that verifies sessions via the `/check-auth` endpoint.

### 2. Smart Token Request
1.  **Submission**: User provides Name, Phone, Service, and an optional **Preferred Appointment Time**.
2.  **Logic**: The backend calculates a unique token number and an initial **Estimated Wait Time** based on previous service averages.
3.  **Real-Time Broadcast**: The server emits `queueUpdated`, including the new token and the current `avgWaitTime`.

### 3. Live Wait Time Recalculation
This implementation features **Dynamic Wait Times**:
-   When an admin calls "Next", the `avgWaitTime` is updated based on historical service speed.
-   Every connected client receives this update and **recalculates their specific estimate** based on their position in the live queue.

### 4. Zero-Cost Notification System
Instead of expensive automated APIs, this system uses a **Manual WhatsApp Notify** workflow:
-   **Protocol**: Uses the WhatsApp "Click-to-Chat" (`api.whatsapp.com`) link.
-   **Implementation**: The admin dashboard generates a unique link for every waiting patient.
-   **Workflow**: Clicking the button opens WhatsApp with a pre-filled, professional message ready to send to the patient's number.

---

## 📁 Directory Structure

```text
├── queue-system/
│   ├── public/              # Frontend assets
│   │   ├── index.html       # Patient registration (with Appointment picker)
│   │   ├── admin.html       # Secure management dashboard (with Login overlay)
│   │   ├── style.css        # Professional Blue/Cream Design System
│   │   └── script.js        # Core logic: Socket events & Live calculations
│   ├── server.js            # Node.js server (Auth, Mongoose, Socket.io)
│   ├── .env                 # Secret keys (Database, Admin credentials)
│   └── package.json         # Dependencies: express, mongoose, socket.io, express-session
├── README.md                # Project pitch and setup instructions
└── PROJECT_GUIDE.md         # Technical implementation details (This file)
```

---

## 🛠 Extension Guidelines

### Future Automation
While currently manual to avoid costs, the system can be upgraded to automated notifications by:
1.  Re-integrating the **Twilio API for WhatsApp** in the `server.js` file.
2.  Triggering the notification inside the `/next` route after a token is updated.

### Branding & Identity
To change the theme, update the `:root` variables in `style.css`. The entire UI (gradients, buttons, shadows) is linked to these variables for instant rebranding.

---

**Current Version**: 2.1.0
**Lead Developer**: Meraj Alam
**Environment**: Production Ready (Render + MongoDB Atlas)
