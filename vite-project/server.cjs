// // const express = require('express');
// // const app = express();
// // const http = require('http').createServer(app);
// // const { Server } = require('socket.io');
// // const cors = require('cors');

// // app.use(cors());

// // const io = new Server(http, {
// //   cors: {
// //     origin: "http://localhost:5174", // Vite's default port
// //     methods: ["GET", "POST"]
// //   }
// // });

// // // Game state management
// // const rooms = new Map();
// // const playerStates = new Map();

// // io.on('connection', (socket) => {
// //     console.log('Player connected:', socket.id);

// //     socket.on('joinGame', () => {
// //         let roomId = findAvailableRoom();
// //         socket.join(roomId);

// //         if (!rooms.has(roomId)) {
// //             rooms.set(roomId, [socket.id]);
// //             socket.emit('waitingForOpponent');
// //         } else {
// //             rooms.get(roomId).push(socket.id);
// //             if (rooms.get(roomId).length === 2) {
// //                 io.to(roomId).emit('gameStart', {
// //                     player1: rooms.get(roomId)[0],
// //                     player2: rooms.get(roomId)[1]
// //                 });
// //             }
// //         }
// //     });

// //     socket.on('shipsPlaced', (shipData) => {
// //         const roomId = getRoomBySocketId(socket.id);
// //         if (!playerStates.has(roomId)) {
// //             playerStates.set(roomId, new Map());
// //         }
// //         playerStates.get(roomId).set(socket.id, shipData);

// //         if (playerStates.get(roomId).size === 2) {
// //             io.to(roomId).emit('allShipsPlaced');
// //             const players = rooms.get(roomId);
// //             const firstPlayer = players[Math.floor(Math.random() * players.length)];
// //             io.to(roomId).emit('playerTurn', firstPlayer);
// //         }
// //     });

// //     socket.on('attack', (coordinates) => {
// //         const roomId = getRoomBySocketId(socket.id);
// //         const players = rooms.get(roomId);
// //         const opponent = players.find(id => id !== socket.id);
// //         const opponentShips = playerStates.get(roomId).get(opponent);

// //         const result = checkHit(coordinates, opponentShips);
// //         io.to(roomId).emit('attackResult', {
// //             attacker: socket.id,
// //             coordinates,
// //             hit: result.hit,
// //             sunk: result.sunk,
// //             gameOver: result.gameOver
// //         });

// //         if (!result.gameOver) {
// //             io.to(roomId).emit('playerTurn', opponent);
// //         }
// //     });

// //     socket.on('disconnect', () => {
// //         handlePlayerDisconnect(socket);
// //     });
// // });

// // // Helper functions
// // function findAvailableRoom() {
// //     for (const [roomId, players] of rooms) {
// //         if (players.length < 2) return roomId;
// //     }
// //     return 'room-' + Date.now();
// // }

// // function getRoomBySocketId(socketId) {
// //     for (const [roomId, players] of rooms) {
// //         if (players.includes(socketId)) return roomId;
// //     }
// //     return null;
// // }

// // function checkHit(coordinates, ships) {
// //     let hit = false;
// //     let sunk = false;
// //     let gameOver = false;
// //     let hitShip = null;

// //     // Implement your hit detection logic here based on your ship data structure
// //     // This is a basic example - modify according to your actual ship data structure
// //     ships.forEach(ship => {
// //         ship.positions.forEach(pos => {
// //             if (pos.x === coordinates.x && pos.z === coordinates.z) {
// //                 hit = true;
// //                 hitShip = ship;
// //             }
// //         });
// //     });

// //     return { hit, sunk, gameOver };
// // }

// // function handlePlayerDisconnect(socket) {
// //     const roomId = getRoomBySocketId(socket.id);
// //     if (roomId) {
// //         io.to(roomId).emit('playerDisconnected');
// //         rooms.delete(roomId);
// //         playerStates.delete(roomId);
// //     }
// // }

// // const PORT = process.env.PORT || 3000;
// // http.listen(PORT, () => {
// //     console.log(`Server running on port ${PORT}`);
// // });

// const express = require('express');
// const app = express();
// const http = require('http').createServer(app);
// const { Server } = require('socket.io');
// const cors = require('cors');

// app.use(cors());

// // Serve static files directly from the main project folder
// app.use(express.static(__dirname)); // __dirname points to the current directory

// const io = new Server(http, {
//   cors: {
//     origin: "*", // Adjust this if necessary
//     methods: ["GET", "POST"]
//   }
// });

// // Game state management
// const rooms = new Map();
// const playerStates = new Map();

// io.on('connection', (socket) => {
//     console.log('Player connected:', socket.id);

//     socket.on('joinGame', () => {
//         let roomId = findAvailableRoom();
//         socket.join(roomId);

//         if (!rooms.has(roomId)) {
//             rooms.set(roomId, [socket.id]);
//             socket.emit('waitingForOpponent');
//         } else {
//             rooms.get(roomId).push(socket.id);
//             if (rooms.get(roomId).length === 2) {
//                 io.to(roomId).emit('gameStart', {
//                     player1: rooms.get(roomId)[0],
//                     player2: rooms.get(roomId)[1]
//                 });
//             }
//         }
//     });

//     socket.on('shipsPlaced', (shipData) => {
//         const roomId = getRoomBySocketId(socket.id);
//         if (!playerStates.has(roomId)) {
//             playerStates.set(roomId, new Map());
//         }
//         playerStates.get(roomId).set(socket.id, shipData);

//         if (playerStates.get(roomId).size === 2) {
//             io.to(roomId).emit('allShipsPlaced');
//             const players = rooms.get(roomId);
//             const firstPlayer = players[Math.floor(Math.random() * players.length)];
//             io.to(roomId).emit('playerTurn', firstPlayer);
//         }
//     });

//     socket.on('attack', (coordinates) => {
//         const roomId = getRoomBySocketId(socket.id);
//         const players = rooms.get(roomId);
//         const opponent = players.find(id => id !== socket.id);
//         const opponentShips = playerStates.get(roomId).get(opponent);

//         const result = checkHit(coordinates, opponentShips);
//         io.to(roomId).emit('attackResult', {
//             attacker: socket.id,
//             coordinates,
//             hit: result.hit,
//             sunk: result.sunk,
//             gameOver: result.gameOver
//         });

//         if (!result.gameOver) {
//             io.to(roomId).emit('playerTurn', opponent);
//         }
//     });

//     socket.on('disconnect', () => {
//         handlePlayerDisconnect(socket);
//     });
// });

// // Helper functions
// function findAvailableRoom() {
//     for (const [roomId, players] of rooms) {
//         if (players.length < 2) return roomId;
//     }
//     return 'room-' + Date.now();
// }

// function getRoomBySocketId(socketId) {
//     for (const [roomId, players] of rooms) {
//         if (players.includes(socketId)) return roomId;
//     }
//     return null;
// }

// function checkHit(coordinates, ships) {
//     let hit = false;
//     let sunk = false;
//     let gameOver = false;

//     ships.forEach(ship => {
//         ship.positions.forEach(pos => {
//             if (pos.x === coordinates.x && pos.z === coordinates.z) {
//                 hit = true;
//                 // Logic for sunk and gameOver goes here...
//             }
//         });
//     });

//     return { hit, sunk, gameOver };
// }

// function handlePlayerDisconnect(socket) {
//     const roomId = getRoomBySocketId(socket.id);
//     if (roomId) {
//         io.to(roomId).emit('playerDisconnected');
//         rooms.delete(roomId);
//         playerStates.delete(roomId);
//     }
// }

// const PORT = process.env.PORT || 3000;
// http.listen(PORT, () => {
//     console.log(`Server running on port ${PORT}`);
// });

const express = require('express');
const app = express();
const http = require('http').createServer(app);
const { Server } = require('socket.io');
const path = require('path');

// Enable CORS and static file serving
app.use(express.static(path.join(__dirname)));

const io = new Server(http, {
  cors: {
    origin: '*', // Be more restrictive in production
    methods: ['GET', 'POST'],
  },
});

// Game state management
const rooms = new Map();
const playerStates = new Map();

// Debug logging
function logGameState(roomId) {
  console.log(`Room ${roomId} state:`, {
    players: rooms.get(roomId),
    hasPlayerStates: playerStates.has(roomId),
    playerStatesSize: playerStates.has(roomId)
      ? playerStates.get(roomId).size
      : 0,
  });
}

io.on('connection', (socket) => {
  console.log('New connection:', socket.id);

  // Send initial connection success to client
  socket.emit('connectionConfirmed', { id: socket.id });

  socket.on('joinGame', () => {
    console.log('Player requesting to join:', socket.id);
    let roomId = findAvailableRoom();
    socket.join(roomId);

    if (!rooms.has(roomId)) {
      // First player in room
      rooms.set(roomId, [socket.id]);
      socket.emit('waitingForOpponent');
      console.log(`Player ${socket.id} waiting in room ${roomId}`);
    } else {
      // Second player joining
      const players = rooms.get(roomId);
      if (players.length < 2) {
        players.push(socket.id);
        console.log(`Game starting in room ${roomId} between`, players);

        // Notify both players
        io.to(roomId).emit('gameStart', {
          player1: players[0],
          player2: players[1],
          roomId: roomId,
        });
      }
    }
    logGameState(roomId);
  });

  socket.on('sceneLoaded', () => {
    const roomId = getRoomBySocketId(socket.id);
    if (roomId) {
      socket.to(roomId).emit('opponentSceneReady');
      console.log(`Player ${socket.id} scene loaded in room ${roomId}`);
    }
  });

  socket.on('shipsPlaced', (shipData) => {
    const roomId = getRoomBySocketId(socket.id);
    if (!roomId) {
      console.error('No room found for player:', socket.id);
      return;
    }

    if (!playerStates.has(roomId)) {
      playerStates.set(roomId, new Map());
    }
    playerStates.get(roomId).set(socket.id, shipData);
    console.log(`Player ${socket.id} placed ships in room ${roomId}`);

    // Check if both players have placed their ships
    if (playerStates.get(roomId).size === 2) {
      const players = rooms.get(roomId);
      const firstPlayer = players[Math.floor(Math.random() * players.length)];
      io.to(roomId).emit('allShipsPlaced');
      io.to(roomId).emit('playerTurn', firstPlayer);
      console.log(
        `All ships placed in room ${roomId}, first turn: ${firstPlayer}`
      );
    }
    logGameState(roomId);
  });

  socket.on('attack', (coordinates) => {
    const roomId = getRoomBySocketId(socket.id);
    if (!roomId) return;

    const players = rooms.get(roomId);
    const opponent = players.find((id) => id !== socket.id);
    const opponentShips = playerStates.get(roomId)?.get(opponent);

    if (!opponentShips) {
      console.error('No opponent ships found for attack');
      return;
    }

    const result = checkHit(coordinates, opponentShips);
    console.log(`Attack result in room ${roomId}:`, result);

    io.to(roomId).emit('attackResult', {
      attacker: socket.id,
      coordinates,
      ...result,
    });

    if (!result.gameOver) {
      io.to(roomId).emit('playerTurn', opponent);
    }
  });

  socket.on('disconnect', () => {
    handlePlayerDisconnect(socket);
  });
});

function findAvailableRoom() {
  for (const [roomId, players] of rooms) {
    if (players.length < 2) return roomId;
  }
  return 'room-' + Date.now();
}

function getRoomBySocketId(socketId) {
  for (const [roomId, players] of rooms) {
    if (players.includes(socketId)) return roomId;
  }
  return null;
}

function checkHit(coordinates, ships) {
  let hit = false;
  let sunk = false;
  let gameOver = false;

  // Track hits on ships
  ships.forEach((ship) => {
    const shipHit = ship.positions.some(
      (pos) => pos.x === coordinates.x && pos.z === coordinates.z
    );

    if (shipHit) {
      hit = true;
      ship.hits = (ship.hits || 0) + 1;
      sunk = ship.hits === ship.positions.length;

      // Check if all ships are sunk
      if (sunk) {
        gameOver = ships.every((s) => (s.hits || 0) === s.positions.length);
      }
    }
  });

  return { hit, sunk, gameOver };
}

function handlePlayerDisconnect(socket) {
  const roomId = getRoomBySocketId(socket.id);
  if (roomId) {
    console.log(`Player ${socket.id} disconnected from room ${roomId}`);
    io.to(roomId).emit('playerDisconnected', socket.id);
    rooms.delete(roomId);
    playerStates.delete(roomId);
  }
}

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Access the game at http://localhost:5173`);
});
