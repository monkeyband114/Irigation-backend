const express = require("express");
const cors = require("cors");
const fs = require("fs").promises;
const path = require("path");

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

const dbPath = path.join(__dirname, "db.json");

// Initialize db.json if it doesn't exist
async function initDB() {
  try {
    await fs.access(dbPath);
  } catch (error) {
    await fs.writeFile(dbPath, JSON.stringify({ sensorData: {} }));
  }
}

initDB();

// Endpoint for ESP8266 to send data
app.post("/sensor-data", async (req, res) => {
  const sensorData = {
    ...req.body,
    timestamp: new Date().toISOString(),
  };

  try {
    const data = JSON.parse(await fs.readFile(dbPath, "utf-8"));
    data.sensorData = sensorData;
    await fs.writeFile(dbPath, JSON.stringify(data));
    res.status(200).send("Data received");
  } catch (error) {
    console.error("Error writing to db.json:", error);
    res.status(500).send("Error saving data");
  }
});

// SSE endpoint for real-time updates
app.get("/events", (req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  const sendData = async () => {
    try {
      const data = JSON.parse(await fs.readFile(dbPath, "utf-8"));
      res.write(`data: ${JSON.stringify(data.sensorData)}\n\n`);
    } catch (error) {
      console.error("Error reading from db.json:", error);
    }
  };

  // Send data immediately and then every 5 seconds
  sendData();
  const intervalId = setInterval(sendData, 5000);

  // Clean up on client disconnect
  req.on("close", () => {
    clearInterval(intervalId);
  });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
