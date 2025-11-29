// server.js - Backend server for IP logging
const express = require('express');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = 3000;
const DB_FILE = path.join(__dirname, 'database.json');

app.use(express.json());
app.use(express.static('public'));

// Initialize database file if it doesn't exist
async function initDB() {
  try {
    await fs.access(DB_FILE);
  } catch {
    await fs.writeFile(DB_FILE, JSON.stringify({}, null, 2));
  }
}

// Get client IP address
function getClientIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0].trim() || 
         req.headers['x-real-ip'] || 
         req.connection.remoteAddress || 
         req.socket.remoteAddress;
}

// Load database
async function loadDB() {
  const data = await fs.readFile(DB_FILE, 'utf8');
  return JSON.parse(data);
}

// Save database
async function saveDB(data) {
  await fs.writeFile(DB_FILE, JSON.stringify(data, null, 2));
}

// Main route - logs IP with Discord ID from URL parameter
app.get('/verify/:discordId', async (req, res) => {
  const discordId = req.params.discordId;
  const ip = getClientIP(req);
  
  try {
    const db = await loadDB();
    
    // Store Discord ID -> IP mapping
    db[discordId] = {
      ip: ip,
      timestamp: new Date().toISOString(),
      userAgent: req.headers['user-agent']
    };
    
    await saveDB(db);
    
    console.log(`✅ Logged: Discord ID ${discordId} -> IP ${ip}`);
    
    // Send the HTML response
    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verification Complete</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
        }
        .container {
            background: white;
            padding: 50px 40px;
            border-radius: 16px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            max-width: 500px;
            width: 100%;
            text-align: center;
        }
        .checkmark {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            background: #4CAF50;
            margin: 0 auto 30px;
            display: flex;
            align-items: center;
            justify-content: center;
            animation: scaleIn 0.5s ease-out;
        }
        .checkmark::after {
            content: "✓";
            color: white;
            font-size: 50px;
            font-weight: bold;
        }
        @keyframes scaleIn {
            from { transform: scale(0); }
            to { transform: scale(1); }
        }
        h1 {
            color: #333;
            margin-bottom: 15px;
            font-size: 28px;
        }
        p {
            color: #666;
            line-height: 1.6;
            margin-bottom: 10px;
        }
        .info-box {
            background: #f5f5f5;
            padding: 20px;
            border-radius: 8px;
            margin-top: 30px;
        }
        .ip {
            color: #667eea;
            font-weight: bold;
            font-family: 'Courier New', monospace;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="checkmark"></div>
        <h1>✅ Verification Complete!</h1>
        <p>Your IP address has been successfully logged.</p>
        <p>You can now close this window and return to Discord.</p>
        
        <div class="info-box">
            <p><strong>Your IP Address:</strong></p>
            <p class="ip">${ip}</p>
        </div>
    </div>
</body>
</html>
    `);
  } catch (err) {
    console.error('Error:', err);
    res.status(500).send('Error logging IP address');
  }
});

// Get all logs (admin endpoint)
app.get('/api/logs', async (req, res) => {
  const db = await loadDB();
  res.json(db);
});

// Home page
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>IP Logger</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            color: white;
            text-align: center;
            padding: 20px;
        }
        h1 { font-size: 48px; margin-bottom: 20px; }
        p { font-size: 20px; }
    </style>
</head>
<body>
    <div>
        <h1>🔒 IP Logger</h1>
        <p>Use the /verify command in Discord to get your verification link.</p>
    </div>
</body>
</html>
  `);
});

app.listen(PORT, async () => {
  await initDB();
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Database file: ${DB_FILE}`);
});