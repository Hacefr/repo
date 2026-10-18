const { WebSocketServer } = require("ws");
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 8000;

const MIME_TYPES = {
    ".html": "text/html",
    ".js": "text/javascript",
    ".css": "text/css",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".gif": "image/gif",
    ".mp3": "audio/mpeg",
    ".json": "application/json"
};

const server = http.createServer((req, res) => {
    let cleanUrl = req.url.split("?")[0];
    if (cleanUrl === "/") {
        cleanUrl = "/index.html";
    }
    
    let filePath = path.join(__dirname, cleanUrl);

    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404);
            res.end("Not Found: " + cleanUrl);
            return;
        }
        const ext = path.extname(filePath).toLowerCase();
        res.writeHead(200, { "Content-Type": MIME_TYPES[ext] || "application/octet-stream" });
        res.end(data);
    });
});

const wss = new WebSocketServer({ server });
const rooms = {};

wss.on("connection", (ws) => {
    let myRoom = null;
    let myPlayer = null;

    ws.on("message", (raw) => {
        try {
            const data = JSON.parse(raw.toString());

            if (data.type === "CREATE_ROOM") {
                const code = Math.random().toString(36).substring(2, 6).toUpperCase();
                rooms[code] = { p1: ws, p2: null, p1Ready: false, p2Ready: false };
                myRoom = code;
                myPlayer = 1;
                ws.send(JSON.stringify({ type: "ROOM_CREATED", code, player: 1 }));
            } 
            else if (data.type === "JOIN_ROOM") {
                const code = data.code.toUpperCase();
                if (rooms[code] && !rooms[code].p2) {
                    rooms[code].p2 = ws;
                    myRoom = code;
                    myPlayer = 2;
                    ws.send(JSON.stringify({ type: "ROOM_JOINED", code, player: 2 }));
                    if (rooms[code].p1 && rooms[code].p1.readyState === 1) {
                        rooms[code].p1.send(JSON.stringify({ type: "OPPONENT_READY", code }));
                    }
                } else {
                    ws.send(JSON.stringify({ type: "ERROR", message: "Room not found or full!" }));
                }
            } 
            else if (data.type === "READY_ROCK") {
                if (myRoom && rooms[myRoom]) {
                    if (myPlayer === 1) rooms[myRoom].p1Ready = true;
                    if (myPlayer === 2) rooms[myRoom].p2Ready = true;
                    if (rooms[myRoom].p1Ready && rooms[myRoom].p2Ready) {
                        rooms[myRoom].p1.send(JSON.stringify({ type: "ALL_READY_ROCK" }));
                        rooms[myRoom].p2.send(JSON.stringify({ type: "ALL_READY_ROCK" }));
                    }
                }
            } 
            else if (myRoom && rooms[myRoom]) {
                const teammate = myPlayer === 1 ? rooms[myRoom].p2 : rooms[myRoom].p1;
                if (teammate && teammate.readyState === 1) {
                    teammate.send(raw.toString());
                }
            }
        } catch (e) {
            console.error("WS error:", e);
        }
    });

    ws.on("close", () => {
        if (myRoom && rooms[myRoom]) {
            delete rooms[myRoom];
        }
    });
});

server.listen(PORT, () => {
    console.log(`PvZ Co-op Server live on port ${PORT}`);
});
