const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Create an HTTP server
const server = http.createServer((req, res) => {
  if (req.url === '/' || req.url === '/index.html') {
    fs.readFile(path.join(__dirname, 'public', 'index.html'), (err, data) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Error loading index.html');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(data);
    });
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

// Attach WebSocket server to the HTTP server
const wss = new WebSocket.Server({ server });

const players = new Map();

wss.on('connection', (ws) => {
  const playerId = Date.now();

  // Send new player their ID
  ws.send(JSON.stringify({
    type: 'init',
    id: playerId
  }));

  // Broadcast new player to others
  wss.clients.forEach(client => {
    if (client !== ws && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({
        type: 'playerJoined',
        id: playerId,
        position: { x: 0, y: 0, z: 0 }
      }));
    }
  });

  ws.on('message', (message) => {
    const data = JSON.parse(message);

    if (data.type === 'update') {
      players.set(playerId, {
        position: data.position,
        message: data.message
      });

      // Broadcast update to all other players
      wss.clients.forEach(client => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'update',
            id: playerId,
            position: data.position,
            message: data.message
          }));
        }
      });
    }
  });

  ws.on('close', () => {
    players.delete(playerId);
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'playerLeft',
          id: playerId
        }));
      }
    });
  });
});

// Start the server on Railway's PORT or 8080 locally
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
