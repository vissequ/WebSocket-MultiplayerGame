const WebSocket = require('ws');
const server = new WebSocket.Server({ port: 8080 });

const players = new Map();

server.on('connection', (ws) => {
    const playerId = Date.now();
    
    // Send new player their ID
    ws.send(JSON.stringify({
        type: 'init',
        id: playerId
    }));

    // Broadcast new player to others
    server.clients.forEach(client => {
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
            server.clients.forEach(client => {
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
        server.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                    type: 'playerLeft',
                    id: playerId
                }));
            }
        });
    });
});

console.log('Server running on port 8080');