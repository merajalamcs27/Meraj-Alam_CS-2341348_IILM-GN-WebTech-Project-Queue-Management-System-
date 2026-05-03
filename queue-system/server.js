const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const session = require("express-session");
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;

// Database Connection
mongoose.connect(MONGO_URI)
    .then(() => console.log("✅ MongoDB Connected Successfully"))
    .catch(err => console.error("❌ MongoDB Connection Error:", err));

// MongoDB Schema
const TokenSchema = new mongoose.Schema({
    token: Number,
    name: String,
    service: String,
    phone: String,
    status: { type: String, default: "waiting" },
    priority: { type: Boolean, default: false },
    appointmentTime: { type: String, default: null }, // Feature 3: Appointment Time
    createdAt: { type: Date, default: Date.now },
    servedAt: { type: Date, default: null }
});

const Token = mongoose.model("Token", TokenSchema);

app.use(cors());
app.use(bodyParser.json());
app.use(express.static("public"));

// Feature 1: Simple Admin Session
app.use(session({
    secret: 'queue-system-secret',
    resave: false,
    saveUninitialized: true
}));

/* ================= UTILITY LOGIC ================= */

async function getAverageServiceTime() {
    const served = await Token.find({ status: "served", servedAt: { $ne: null } });
    if (served.length === 0) return 5; // Default 5 mins if nobody served
    const totalTime = served.reduce((sum, q) => sum + ((new Date(q.servedAt) - new Date(q.createdAt)) / 60000), 0);
    const avg = totalTime / served.length;
    return avg < 3 ? 3 : Math.round(avg); // Minimum 3 minutes for realism
}

async function calculateEstimatedTime(tokenNumber) {
    const avgTime = await getAverageServiceTime();
    const waitingBefore = await Token.countDocuments({ status: "waiting", token: { $lt: tokenNumber } });
    return Math.round(waitingBefore * avgTime);
}

const notifyUpdates = async () => {
    const avgWaitTime = await getAverageServiceTime();
    // Only send public fields to the frontend, sorted by token number
    const publicQueue = await Token.find({}, 'token name service status priority createdAt').sort({ token: 1 });
    io.emit("queueUpdated", { queue: publicQueue, avgWaitTime });
};

/* ================= ROUTES ================= */

app.post("/addToken", async (req, res) => {
    try {
        const { name, service, phone, isPriority, appointmentTime } = req.body;

        // Get the last token number to ensure uniqueness
        const lastToken = await Token.findOne().sort({ token: -1 });
        const nextTokenNumber = lastToken ? lastToken.token + 1 : 1;

        const newToken = new Token({
            token: nextTokenNumber,
            name,
            service,
            phone,
            priority: isPriority,
            appointmentTime: appointmentTime || null
        });

        await newToken.save();
        const avgWait = await getAverageServiceTime();
        const waitingBefore = await Token.countDocuments({ status: "waiting", token: { $lt: newToken.token } });
        const estimatedTime = Math.round(waitingBefore * avgWait);

        notifyUpdates();

        // Return only what the user needs to see
        const responseData = newToken.toObject();
        delete responseData.phone;
        res.json({ ...responseData, estimatedTime });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get("/queue", async (req, res) => {
    // SECURITY: Never return phone numbers in the public list
    const queue = await Token.find({}, 'token name service status priority createdAt');
    res.json(queue);
});

app.post("/next", async (req, res) => {
    try {
        // Find priority first, then others
        let nextToken = await Token.findOne({ status: "waiting", priority: true }).sort({ token: 1 });
        if (!nextToken) {
            nextToken = await Token.findOne({ status: "waiting" }).sort({ token: 1 });
        }

        if (nextToken) {
            nextToken.status = "served";
            nextToken.servedAt = Date.now();
            await nextToken.save();

            notifyUpdates();
            res.json(nextToken);
        } else {
            res.json({ message: "No waiting tokens" });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post("/reset", async (req, res) => {
    try {
        await Token.deleteMany({});
        notifyUpdates();
        res.json({ message: "Queue Reset Successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Feature 1: Login Route
app.post("/login", (req, res) => {
    const { username, password } = req.body;
    if (username === process.env.ADMIN_USER && password === process.env.ADMIN_PASS) {
        req.session.isAdmin = true;
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false, message: "Invalid credentials" });
    }
});

app.get("/check-auth", (req, res) => {
    res.json({ isAdmin: !!req.session.isAdmin });
});

app.post("/logout", (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

app.get("/analytics", async (req, res) => {
    const total = await Token.countDocuments();
    const servedCount = await Token.countDocuments({ status: "served" });
    const avgWait = await getAverageServiceTime();

    res.json({
        totalTokens: total,
        totalServed: servedCount,
        avgWaitTime: Math.round(avgWait)
    });
});

const { GoogleGenerativeAI } = require("@google/generative-ai");

app.post("/chat", async (req, res) => {
    const message = req.body.message;
    const apiKey = process.env.GEMINI_API_KEY;

    // Fallback Keyword Logic (Used if API Key is missing or AI fails)
    const getFallbackResponse = (msg) => {
        const lowerMsg = msg.toLowerCase();
        const knowledgeBase = {
            hours: "Our visiting hours are 10:00 AM – 1:00 PM and 4:00 PM – 8:00 PM daily.",
            location: "We are located at 123 Health Avenue, City Center, near the Metro Station.",
            emergency: "Yes, we have 24/7 Trauma and Emergency Care.",
            hello: "Hello! I am your Global Health Assistant. How can I help you today?",
            billing: "Our billing counter is open 24/7."
        };
        for (let key in knowledgeBase) {
            if (lowerMsg.includes(key)) return knowledgeBase[key];
        }
        return "I'm sorry, I don't have information on that. You can ask about our hours, specialties, or emergency services.";
    };

    if (!apiKey || apiKey === "your_key_here") {
        return res.json({ response: getFallbackResponse(message) });
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `You are the official Global Health Assistant for the Smart Hospital Queue System. 

        YOUR CORE RULES:
        1. NEVER say "I don't know" or "I am not sure".
        2. Always provide a helpful, professional, and detailed answer.
        3. If a user asks something general, relate it back to health, wellness, or hospital services.
        4. Be proactive: Add relevant health tips or comforting details to your answers.

        HOSPITAL DETAILS (Priority Info):
        - Visiting Hours: 10:00 AM – 1:00 PM and 4:00 PM – 8:00 PM daily.
        - Location: 123 Health Avenue, City Center, near the Metro Station.
        - Emergency: 24/7 Trauma and Emergency Care available.
        - Specialties: Cardiology, Pediatrics, Orthopedics, and Oncology.
        - Appointments: Users can take a token on this website or call +1-800-HEALTHY.
        - Billing: Counter open 24/7.

        EXAMPLE BEHAVIOR:
        - If they ask about symptoms: Suggest a department AND give a quick health tip (e.g., "Stay hydrated").
        - If they ask about something off-topic: Find a creative way to link it to health or hospital care.

        User Question: "${message}"`;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        res.json({ response: responseText });
    } catch (err) {
        console.error("❌ Gemini Error:", err);
        res.json({ response: getFallbackResponse(message) });
    }
});

io.on("connection", () => console.log("📱 Real-time Client Connected"));

server.listen(PORT, () => {
    console.log(`🚀 Smart Queue Server running at http://localhost:${PORT}`);
});