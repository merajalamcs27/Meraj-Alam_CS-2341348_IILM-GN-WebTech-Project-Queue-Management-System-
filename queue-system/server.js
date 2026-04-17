const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
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
    createdAt: { type: Date, default: Date.now },
    servedAt: { type: Date, default: null }
});

const Token = mongoose.model("Token", TokenSchema);

app.use(cors());
app.use(bodyParser.json());
app.use(express.static("public"));

/* ================= TWILIO CONFIG ================= */
const twilio = require('twilio');
const accountSid = process.env.TWILIO_SID; 
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhone = process.env.TWILIO_PHONE;

const sendSMS = (to, body) => {
    if (!accountSid || !authToken) return;
    const client = twilio(accountSid, authToken);
    client.messages.create({ body, from: twilioPhone, to })
        .catch(err => console.error("❌ SMS Failed:", err));
};

/* ================= UTILITY LOGIC ================= */

async function getAverageServiceTime() {
    const served = await Token.find({ status: "served", servedAt: { $ne: null } });
    if (served.length === 0) return 5;
    const totalTime = served.reduce((sum, q) => sum + ((new Date(q.servedAt) - new Date(q.createdAt)) / 60000), 0);
    return totalTime / served.length;
}

async function calculateEstimatedTime(tokenNumber) {
    const avgTime = await getAverageServiceTime();
    const waitingBefore = await Token.countDocuments({ status: "waiting", token: { $lt: tokenNumber } });
    return Math.round(waitingBefore * avgTime);
}

const notifyUpdates = async () => {
    // Only send public fields to the frontend
    const publicQueue = await Token.find({}, 'token name service status priority createdAt');
    io.emit("queueUpdated", publicQueue);
};

/* ================= ROUTES ================= */

app.post("/addToken", async (req, res) => {
    try {
        const { name, service, phone, isPriority } = req.body;
        const count = await Token.countDocuments();
        
        const newToken = new Token({
            token: count + 1,
            name,
            service,
            phone,
            priority: isPriority
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

            // Notify next person
            const nextInLine = await Token.findOne({ status: "waiting" }).sort({ token: 1 });
            if (nextInLine && nextInLine.phone) {
                sendSMS(nextInLine.phone, `Hi ${nextInLine.name}, you are next up!`);
            }

            notifyUpdates();
            res.json(nextToken);
        } else {
            res.json({ message: "No waiting tokens" });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
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

app.post("/chat", (req, res) => {
    const message = req.body.message.toLowerCase();
    let response = "I'm sorry, I don't have information on that. You can ask about our visiting hours, specialties, or emergency services.";

    const knowledgeBase = {
        hours: "Our visiting hours are 10:00 AM – 1:00 PM and 4:00 PM – 8:00 PM daily.",
        location: "We are located at 123 Health Avenue, City Center, near the Metro Station.",
        emergency: "Yes, we have 24/7 Trauma and Emergency Care. For immediate help, please use the Emergency button in the queue system.",
        doctors: "We have top specialists in Cardiology, Pediatrics, Orthopedics, and Oncology.",
        specialty: "We specialize in Cardiology, Pediatrics, Orthopedics, and Oncology.",
        appointment: "You can book an appointment by calling +1-800-HEALTHY or just take a token here for immediate consultation.",
        hello: "Hello! I am your Global Health Assistant. How can I help you today?",
        hi: "Hi there! How can I assist you with our hospital services?",
        billing: "Our billing counter is open 24/7, but major insurance processing happens between 9 AM and 5 PM."
    };

    for (let key in knowledgeBase) {
        if (message.includes(key)) {
            response = knowledgeBase[key];
            break;
        }
    }

    res.json({ response });
});

io.on("connection", () => console.log("📱 Real-time Client Connected"));

server.listen(PORT, () => {
    console.log(`🚀 Smart Queue Server running at http://localhost:${PORT}`);
});