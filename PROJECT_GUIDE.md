# 🏥 Smart Queue Management System: Full Project Documentation

This guide serves as a comprehensive technical and conceptual reference for the Smart Queue Management System, providing all the necessary details for academic reports and presentations.

---

## 1. 📋 Project Overview

### Problem Statement
In traditional hospital environments, patients often face long, uncertain waiting times, leading to crowded waiting rooms and increased stress. Lack of transparency regarding queue status is a major factor in patient dissatisfaction.

### Objective
To build a real-time, transparent, and secure digital queue management system that allows patients to monitor their status remotely and enables administrators to manage patient flow efficiently.

---

## 2. 🚀 Key Features (For PPT Slides)

-   **Real-Time Bidirectional Sync**: Uses WebSockets (Socket.io) to update all connected clients instantly when a token is called.
-   **Smart Wait Time Prediction**: Calculates estimated wait times based on historical service data and live queue length.
-   **AI-Powered Smart Assistant**: Integrated **Google Gemini AI** that understands symptoms and suggests the correct department (e.g., Cardiology, Pediatrics).
-   **Zero-Cost Patient Notifications**: Implements a manual WhatsApp notification bridge to keep patients informed without external API costs.
-   **Secure Administrative Control**: Role-based access with session-managed authentication for the management dashboard.
-   **Cloud-Native Persistence**: Global data availability using MongoDB Atlas.
-   **Emergency Prioritization**: Allows admins to flag urgent cases and bring them to the front of the queue automatically.

---

## 🏗 3. System Architecture & Tech Stack

### Frontend (User Interface)
-   **HTML5/CSS3**: Structured with semantic HTML and styled with a modern **Glassmorphism** aesthetic.
-   **JavaScript (ES6+)**: Handles client-side logic, form validation, and real-time UI updates.
-   **Socket.io Client**: Listens for server broadcasts to refresh the queue list without page reloads.

### Backend (Server Logic)
-   **Node.js & Express**: Provides a robust, scalable environment for the REST API and static file serving.
-   **Express-Session**: Manages secure admin states.
-   **Mongoose**: Acts as an Object Data Modeling (ODM) layer for MongoDB, ensuring schema-based data validation.

### Database (Data Layer)
-   **MongoDB Atlas**: A distributed NoSQL database used for storing token records, timestamps, and patient metadata.

---

## 🔄 4. Data Model (Database Schema)

| Field | Type | Description |
| :--- | :--- | :--- |
| `token` | Number | Unique, auto-incrementing identifier for the patient. |
| `name` | String | Full name of the patient. |
| `phone` | String | Contact number (used for WhatsApp notifications). |
| `service` | String | Department selected (Consultation, Billing, etc.). |
| `status` | String | Current state: `waiting` or `served`. |
| `priority`| Boolean| Flag for emergency/urgent cases. |
| `appointmentTime`| String | User-selected preferred time slot. |
| `createdAt` | Date | Timestamp of when the token was generated. |

---

## 🛠 5. Implementation Challenges & Solutions

### Challenge 1: Unpredictable Wait Times
-   **Solution**: Implemented a moving average algorithm in the backend that calculates `totalServedTime / totalPatients` to provide a realistic, dynamic estimate.

### Challenge 2: Security of the Admin Dashboard
-   **Solution**: Implemented a "Gatekeeper" login overlay. Instead of protecting just the URL, the system protects the **Data Endpoints** and uses `express-session` to keep the admin logged in securely.

### Challenge 3: Real-Time Syncing Across Devices
-   **Solution**: Used Socket.io rooms to broadcast a `queueUpdated` event whenever any change occurs in the database, ensuring 100% synchronization across all patient and admin screens.

---

## 🔮 6. Future Scope

1.  **Multilingual Support**: Adding support for Hindi and other regional languages to make the system accessible to everyone.
2.  **Voice Announcement System**: Using the Web Speech API to announce token numbers in the hospital lobby automatically.
3.  **Digital Receipts**: Generating QR-coded PDF tokens for patients to carry on their phones.

---

**Lead Developer**: Meraj Alam  
**Academic Year**: 2026 | Semester 6  
**Institution**: IILM University, GN  
