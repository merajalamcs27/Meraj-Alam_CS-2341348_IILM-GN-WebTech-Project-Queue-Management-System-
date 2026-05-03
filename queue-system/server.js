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

            // Notify next person
            const nextInLine = await Token.findOne({ status: "waiting" }).sort({ token: 1 });
            if (nextInLine && nextInLine.phone) {
                sendSMS(nextInLine.phone, `Hi ${nextInLine.name}, you are next up!`);
            }

            // Feature 5: Notify the person 2 spots away that their turn is coming
            const soonInLine = await Token.find({ status: "waiting" }).sort({ token: 1 }).limit(3);
            if (soonInLine[2] && soonInLine[2].phone) {
                sendSMS(soonInLine[2].phone, `Hi ${soonInLine[2].name}, you are 3rd in line. Please head to the waiting area!`);
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