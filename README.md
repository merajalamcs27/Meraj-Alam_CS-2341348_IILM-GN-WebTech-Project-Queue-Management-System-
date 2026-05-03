# 🎫 Smart Queue Management System (v2.0)

A professional, real-time hospital queue management solution built with Node.js, Socket.io, and MongoDB Atlas. Designed to reduce patient anxiety through transparency and live updates.

🚀 **Live Demo**: [https://meraj-alam-cs-2341348-iilm-gn-webtech.onrender.com/](https://meraj-alam-cs-2341348-iilm-gn-webtech.onrender.com/)

---

## ✨ Core Features

### 👨‍⚕️ For Patients
-   **Instant Token Generation**: Get a digital token in seconds.
-   **Live Wait Time Estimates**: Watch your estimated wait time decrease in real-time as others are served.
-   **Appointment Scheduling**: Pick a preferred time slot directly from the form.
-   **AI Health Assistant**: Integrated chatbot to answer common hospital inquiries.
-   **Mobile-First Design**: Responsive UI that works perfectly on any smartphone.

### 🛠 For Admins
-   **Secure Dashboard**: Protected by a secure login system.
-   **One-Click Call**: Call the next patient with priority logic (Emergency cases first).
-   **Free WhatsApp Notifications**: Notify patients manually with a pre-filled message—no paid API required.
-   **Live Analytics**: Track total tokens, served patients, and average service time in real-time.
-   **Global Reset**: Clear the queue for a new business day with one click.

---

## 🛠 Tech Stack

-   **Frontend**: HTML5, Vanilla CSS3 (Glassmorphism UI), JavaScript (ES6+).
-   **Backend**: Node.js, Express.js.
-   **Real-time**: Socket.io (WebSockets).
-   **Database**: MongoDB Atlas (Cloud Database).
-   **Security**: Express-Session (Admin Authentication).
-   **Deployment**: Render.com.

---

## 🚀 Local Setup

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/merajalamcs27/Meraj-Alam_CS-2341348_IILM-GN-WebTech-Project-Queue-Management-System-.git
    cd queue-system
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Configure Environment Variables**:
    Create a `.env` file in the root directory:
    ```env
    MONGO_URI=your_mongodb_atlas_uri
    PORT=3000
    ADMIN_USER=admin
    ADMIN_PASS=hospital123
    ```

4.  **Run the application**:
    ```bash
    npm start
    ```
    Open `http://localhost:3000` in your browser.

---

## 🔐 Admin Access
To access the management panel, go to:
👉 `/admin.html`
-   **Username**: `admin`
-   **Password**: `hospital123`

---

## 👨‍💻 Author
**Meraj Alam**
*CS-2341348 | IILM University, GN*
*Web Technology Project - Semester 6*
