const form = document.getElementById("queueForm");
const queueList = document.getElementById("queueList");
const tokenDisplay = document.getElementById("tokenDisplay");

if (form) {
    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const name = document.getElementById("name").value;
        const service = document.getElementById("service").value;

        const res = await fetch("/addToken", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, service })
        });

        const data = await res.json();

        tokenDisplay.innerHTML =
            `🎫 Token: ${data.token} <br>
             ⏳ Estimated Wait: ${data.estimatedTime} minutes`;

        form.reset();
        loadQueue();
    });
}

async function loadQueue() {
    const res = await fetch("/queue");
    const data = await res.json();

    if (queueList) {
        queueList.innerHTML = "";

        data.forEach(item => {
            const li = document.createElement("li");

            li.innerText =
                `Token ${item.token} - ${item.name} 
                (${item.service}) - ${item.status}`;

            queueList.appendChild(li);
        });
    }
}

async function callNext() {
    await fetch("/next", { method: "POST" });
    loadQueue();
}

async function resetQueue() {
    await fetch("/reset", { method: "POST" });
    loadQueue();
}

loadQueue();
setInterval(loadQueue, 2000);