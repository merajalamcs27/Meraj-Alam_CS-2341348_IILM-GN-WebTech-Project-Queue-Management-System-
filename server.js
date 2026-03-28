const express = require("express");
const fs = require("fs");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static("public"));

const dataFile = "queueData.json";

/* ================= FILE HANDLING ================= */

function readQueue() {
    if (!fs.existsSync(dataFile)) {
        return [];
    }
    const data = fs.readFileSync(dataFile, "utf-8");
    return JSON.parse(data);
}

function writeQueue(data) {
    fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
}

/* ================= AI LOGIC ================= */

// Average service time
function getAverageServiceTime(queue) {
    const served = queue.filter(q => q.servedAt);

    if (served.length === 0) return 5; // default 5 min

    const totalTime = served.reduce((sum, q) => {
        return sum + ((q.servedAt - q.createdAt) / 60000);
    }, 0);

    return totalTime / served.length;
}

// Estimated waiting time
function calculateEstimatedTime(queue, tokenNumber) {
    const avgTime = getAverageServiceTime(queue);

    const waitingBefore = queue.filter(q =>
        q.status === "waiting" && q.token < tokenNumber
    ).length;

    return Math.round(waitingBefore * avgTime);
}

/* ================= ROUTES ================= */

// Add Token
app.post("/addToken", (req, res) => {
    const { name, service } = req.body;

    if (!name || !service) {
        return res.status(400).json({ error: "Missing data" });
    }

    let queue = readQueue();

    const newToken = {
        token: queue.length + 1,
        name,
        service,
        status: "waiting",
        createdAt: Date.now(),
        servedAt: null
    };

    queue.push(newToken);

    // AI Estimated Time
    const estimatedTime = calculateEstimatedTime(queue, newToken.token);
    newToken.estimatedTime = estimatedTime;

    writeQueue(queue);

    res.json(newToken);
});

// Get Queue
app.get("/queue", (req, res) => {
    res.json(readQueue());
});

// Call Next
app.post("/next", (req, res) => {
    let queue = readQueue();
    const next = queue.find(q => q.status === "waiting");

    if (next) {
        next.status = "served";
        next.servedAt = Date.now();
        writeQueue(queue);
        res.json(next);
    } else {
        res.json({ message: "No waiting tokens" });
    }
});

// Reset Queue
app.post("/reset", (req, res) => {
    writeQueue([]);
    res.json({ message: "Queue reset" });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});