const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');

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

const wss = new WebSocket.Server({ server });
const players = new Map();

wss.on('connection', (ws) => {
  const playerId = Date.now();

  ws.send(JSON.stringify({
    type: 'init',
    id: playerId
  }));

  players.forEach((playerData, existingId) => {
    ws.send(JSON.stringify({
      type: 'playerJoined',
      id: existingId,
      position: playerData.position || { x: 0, y: 0, z: 0 },
      username: playerData.username || `Player ${existingId}` // Send username
    }));
  });

  wss.clients.forEach(client => {
    if (client !== ws && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({
        type: 'playerJoined',
        id: playerId,
        position: { x: 0, y: 0, z: 0 },
        username: `Player ${playerId}` // Initial username
      }));
    }
  });

  ws.on('message', (message) => {
    const data = JSON.parse(message);

    if (data.type === 'update') {
      players.set(playerId, {
        position: data.position,
        message: data.message,
        username: data.username || players.get(playerId)?.username || `Player ${playerId}` // Store username
      });

      wss.clients.forEach(client => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'update',
            id: playerId,
            position: data.position,
            message: data.message,
            username: data.username // Broadcast username
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

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
