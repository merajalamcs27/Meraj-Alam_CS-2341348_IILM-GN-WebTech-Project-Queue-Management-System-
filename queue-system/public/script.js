// Initialize Socket.io
const socket = io();

const form = document.getElementById("queueForm");
const queueList = document.getElementById("queueList");
const tokenDisplay = document.getElementById("tokenDisplay");

if (form) {
    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const name = document.getElementById("name").value;
        const service = document.getElementById("service").value;
        const phone = document.getElementById("phone") ? document.getElementById("phone").value : null;
        const isPriority = document.getElementById("priority") ? document.getElementById("priority").checked : false;

        const res = await fetch("/addToken", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, service, phone, isPriority })
        });

        const data = await res.json();

        tokenDisplay.innerHTML =
            `<div class="token-card">
                <h3>🎫 Token: ${data.token}</h3>
                <p>⏳ Estimated Wait: <strong>${data.estimatedTime}</strong> minutes</p>
                ${data.priority ? '<span class="priority-badge">⚡ Priority Case</span>' : ''}
            </div>`;

        form.reset();
        // loadQueue() is now handled by Socket.io
    });
}

async function loadQueue() {
    const res = await fetch("/queue");
    const data = await res.json();
    renderQueue(data);
}

function renderQueue(data) {
    if (queueList) {
        queueList.innerHTML = "";

        data.forEach(item => {
            const li = document.createElement("li");
            li.className = item.status;
            if (item.priority) li.classList.add("priority-item");

            li.innerHTML = `
                <span class="token-id">#${item.token}</span>
                <div class="user-info">
                    <strong>${item.name}</strong>
                    <small>${item.service}</small>
                </div>
                <span class="status-tag">${item.status}</span>
            `;

            queueList.appendChild(li);
        });
    }
}

// Feature 2: Socket.io Real-time Listening
socket.on("queueUpdated", (data) => {
    console.log("⚡ Queue Updated via Socket");
    renderQueue(data);
});

async function callNext() {
    await fetch("/next", { method: "POST" });
}

async function resetQueue() {
    if (confirm("Are you sure you want to clear the entire queue?")) {
        await fetch("/reset", { method: "POST" });
    }
}

// Initial Load
loadQueue();