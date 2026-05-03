// Initialize Socket.io
const socket = io();

const form = document.getElementById("queueForm");
const queueList = document.getElementById("queueList");
const tokenDisplay = document.getElementById("tokenDisplay");
let myToken = null;

if (form) {
    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const name = document.getElementById("name").value;
        const service = document.getElementById("service").value;
        const phone = document.getElementById("phone") ? document.getElementById("phone").value : null;
        const isPriority = document.getElementById("priority") ? document.getElementById("priority").checked : false;
        const appointmentTime = document.getElementById("appointmentTime") ? document.getElementById("appointmentTime").value : null;

        const res = await fetch("/addToken", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, service, phone, isPriority, appointmentTime })
        });

        const data = await res.json();
        myToken = data.token; // Store token for live updates

        tokenDisplay.innerHTML =
            `<div class="token-card">
                <h3>🎫 Token: ${data.token}</h3>
                <p>⏳ Estimated Wait: <strong>${data.estimatedTime}</strong> minutes</p>
                ${data.appointmentTime ? `<p>📅 Appointment: ${data.appointmentTime}</p>` : ''}
                ${data.priority ? '<span class="priority-badge">⚡ Priority Case</span>' : ''}
            </div>`;

        form.reset();
    });
}

async function loadQueue() {
    const res = await fetch("/queue");
    const data = await res.json();
    renderQueue(data);
}

function renderQueue(data) {
    const list = Array.isArray(data) ? data : data.queue;
    const isAdmin = window.location.pathname.includes("admin.html");

    if (queueList) {
        queueList.innerHTML = "";
        list.forEach(item => {
            const li = document.createElement("li");
            li.className = item.status;
            if (item.priority) li.classList.add("priority-item");

            // WhatsApp Notification Logic
            const whatsappMsg = encodeURIComponent(`Hi ${item.name}, your token #${item.token} for ${item.service} is coming up soon! Please head to the waiting area.`);
            const whatsappLink = `https://wa.me/${item.phone}?text=${whatsappMsg}`;

            li.innerHTML = `
                <span class="token-id">#${item.token}</span>
                <div class="user-info">
                    <strong>${item.name}</strong>
                    <small>${item.service} ${item.appointmentTime ? `[${item.appointmentTime}]` : ''}</small>
                </div>
                <div class="actions">
                    ${isAdmin && item.status === 'waiting' ? `<a href="${whatsappLink}" target="_blank" class="wa-btn">💬 Notify</a>` : ''}
                    <span class="status-tag">${item.status}</span>
                </div>
            `;
            queueList.appendChild(li);
        });
    }
}

// Feature 2: Socket.io Real-time Listening
socket.on("queueUpdated", (data) => {
    console.log("⚡ Queue Updated via Socket");
    const queue = data.queue || data;
    const avgWaitTime = data.avgWaitTime || 5;

    renderQueue(queue);

    // Live recalculation of my estimated time
    if (myToken) {
        const waitingBefore = queue.filter(item => item.status === "waiting" && item.token < myToken).length;
        const newEstimate = Math.round(waitingBefore * avgWaitTime);
        const estElement = document.querySelector("#tokenDisplay strong");
        if (estElement) estElement.innerText = newEstimate;
    }
});

/* Admin Logic */
async function callNext() { await fetch("/next", { method: "POST" }); }
async function resetQueue() { if (confirm("Clear entire queue?")) { await fetch("/reset", { method: "POST" }); } }

async function checkAuth() {
    const res = await fetch("/check-auth");
    const data = await res.json();
    if (document.getElementById("login-overlay")) {
        if (data.isAdmin) document.getElementById("login-overlay").classList.add("hidden");
        else document.getElementById("login-overlay").classList.remove("hidden");
    }
}

async function login() {
    const username = document.getElementById("admin-user").value;
    const password = document.getElementById("admin-pass").value;
    const res = await fetch("/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (data.success) {
        checkAuth();
    } else {
        document.getElementById("login-error").classList.remove("hidden");
    }
}

async function logout() {
    await fetch("/logout", { method: "POST" });
    checkAuth();
}

if (window.location.pathname.includes("admin.html")) {
    checkAuth();
}

// Initial Load
loadQueue();

/* Chatbot Logic */
function toggleChat() { document.getElementById('chat-window').classList.toggle('hidden'); }
async function sendMessage() { const input = document.getElementById('user-input'); const text = input.value; if(!text) return; appendMessage('user', text); input.value = ''; const res = await fetch('/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: text }) }); const data = await res.json(); setTimeout(() => appendMessage('bot', data.response), 500); }
function appendMessage(sender, text) { const container = document.getElementById('chat-messages'); const div = document.createElement('div'); div.className = 'message ' + (sender === 'user' ? 'user-msg' : 'bot-msg'); div.innerText = text; container.appendChild(div); container.scrollTop = container.scrollHeight; }
function askOption(text) { const input = document.getElementById('user-input'); input.value = text; sendMessage(); }
