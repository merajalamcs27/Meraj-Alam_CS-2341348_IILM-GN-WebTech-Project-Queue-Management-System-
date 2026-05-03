# 📘 Developer Guide: Professional Smart Queue Management System

This document provides a comprehensive overview of the system architecture, real-time data flow, and advanced features implemented in the Smart Queue Management System.

---

## 🏗 System Architecture

The project follows a **Monolithic MVC (Model-View-Controller)** architecture, enhanced with real-time bidirectional communication and cloud persistence.

-   **Frontend (View)**: Static assets served via Express. Uses a **Glassmorphism Design System** with a professional hospital-themed color palette (`#355872` / `#F7F8F0`).
-   **Backend (Controller)**: `server.js` manages HTTP REST endpoints, WebSocket events via Socket.io, and user sessions for admin security.
-   **Persistence (Model)**: MongoDB Atlas (Cloud) stores token data. Mongoose schemas ensure data integrity and support advanced fields like `appointmentTime`.

---

## 🔄 Advanced Workflows

### 1. Secure Admin Lifecycle (Feature 1)
To protect sensitive patient data and management tools:
-   **Authentication**: Implemented using `express-session`. Admin credentials are kept in secure environment variables.
-   **Authorization**: The `/admin.html` dashboard is protected by a login overlay that verifies sessions via the `/check-auth` endpoint.

### 2. Smart Token Request (Feature 3)
1.  **Submission**: User provides Name, Phone, Service, and an optional **Preferred Appointment Time**.
2.  **Logic**: The backend calculates a unique token number and an initial **Estimated Wait Time** based on previous service averages.
3.  **Real-Time Broadcast**: The server emits `queueUpdated`, including the new token and the current `avgWaitTime`.

### 3. Live Wait Time Recalculation
Unlike standard systems, this implementation features **Dynamic Wait Times**:
-   When an admin calls "Next", the `avgWaitTime` is updated.
-   Every connected client receives this update and **recalculates their specific estimate** based on how many people are still in front of them in the live queue.

### 4. Hybrid Notification System (Feature 5)
-   **Automated (Next Up)**: The system automatically sends an SMS (via Twilio) to the next person in line.
-   **Manual (WhatsApp Shortcut)**: Admins have a one-click **💬 Notify** button. This uses the WhatsApp "Click-to-Chat" protocol to open a pre-filled message for any patient without requiring an API account.

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

### Adding New AI Capabilities
The current chatbot uses a keyword-matching engine. To upgrade to a Large Language Model (LLM):
1.  Replace the logic in the `/chat` route in `server.js`.
2.  Integrate the **Google Gemini API** or OpenAI to provide medical advice or more natural conversation.

### Branding & Identity
To change the theme, update the `:root` variables in `style.css`. The entire UI (gradients, buttons, shadows) is linked to these variables for 1-second branding changes.

---

**Current Version**: 2.0.0
**Lead Developer**: Meraj Alam
**Environment**: Production Ready (Render + MongoDB Atlas)
