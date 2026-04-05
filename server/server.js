const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const cors = require('cors')

const app = express()
app.use(cors())
app.use(express.json())

const server = http.createServer(app)

const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
})

const WORDS = [
  'apple', 'banana', 'guitar', 'elephant', 'rainbow',
  'pizza', 'dragon', 'castle', 'rocket', 'ocean',
  'butterfly', 'volcano', 'cactus', 'penguin', 'diamond',
  'umbrella', 'popcorn', 'lighthouse', 'snowflake', 'telescope',
  'waterfall', 'spider', 'cupcake', 'ambulance', 'treasure',
  'flamingo', 'skateboard', 'pineapple', 'submarine', 'compass',
  'fireworks', 'jellyfish', 'motorcycle', 'mushroom', 'parachute',
  'starfish', 'sunflower', 'unicorn', 'avocado', 'broccoli',
  'chocolate', 'dinosaur', 'escalator', 'football', 'glasses',
  'hamster', 'island', 'jungle', 'ketchup', 'lemon',
  'magnet', 'notebook', 'octopus', 'pancake', 'sandwich',
  'turtle', 'airplane', 'balloon', 'camera', 'envelope',
  'anchor', 'bridge', 'candle', 'dolphin', 'feather',
  'globe', 'helmet', 'igloo', 'ladder', 'mirror',
  'samosa', 'cricket bat', 'autorickshaw', 'chai', 'dosa'
]

const rooms = {}
const playerInfo = {}

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  let code = ''

  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }

  return rooms[code] ? generateRoomCode() : code
}

function getRandomWords(count = 3) {
  const arr = [...WORDS].sort(() => Math.random() - 0.5)
  return arr.slice(0, count)
}

function getHint(word, revealed = []) {
  return word
    .split('')
    .map((ch, i) => {
      if (ch === ' ') return ' '
      if (revealed.includes(i)) return ch
      return '_'
    })
    .join(' ')
}

function getRoomPlayers(room) {
  return room.players.map(p => ({
    id: p.id,
    name: p.name,
    score: p.score,
    isDrawing: p.isDrawing
  }))
}

function pickHintIndex(word, revealed) {
  const pool = []

  for (let i = 0; i < word.length; i++) {
    if (word[i] !== ' ' && !revealed.includes(i)) {
      pool.push(i)
    }
  }

  if (!pool.length) return null
  return pool[Math.floor(Math.random() * pool.length)]
}

function startNextTurn(roomCode) {
  const room = rooms[roomCode]
  if (!room) return

  clearTimeout(room.roundTimer)
  clearTimeout(room.hintTimer)

  room.currentDrawerIndex++

  if (room.currentDrawerIndex >= room.players.length) {
    room.currentRound++
    room.currentDrawerIndex = 0

    if (room.currentRound > room.settings.rounds) {
      endGame(roomCode)
      return
    }
  }

  room.correctGuessers = []
  room.currentWord = null
  room.wordChoices = []
  room.revealedHintIndices = []
  room.state = 'choosing'

  room.players.forEach((p, i) => {
    p.isDrawing = i === room.currentDrawerIndex
  })

  const drawer = room.players[room.currentDrawerIndex]
  const choices = getRandomWords(3)
  room.wordChoices = choices

  io.to(roomCode).emit('round_start', {
    round: room.currentRound,
    totalRounds: room.settings.rounds,
    drawerName: drawer.name,
    drawerId: drawer.id,
    players: getRoomPlayers(room)
  })

  io.to(drawer.id).emit('choose_word', { words: choices })

  room.chooseTimer = setTimeout(() => {
    if (room.state === 'choosing') {
      handleWordChosen(roomCode, drawer.id, choices[0])
    }
  }, 15000)
}

function handleWordChosen(roomCode, drawerId, word) {
  const room = rooms[roomCode]
  if (!room || room.state !== 'choosing') return

  clearTimeout(room.chooseTimer)

  room.currentWord = word
  room.state = 'drawing'
  room.correctGuessers = []
  room.revealedHintIndices = []

  const duration = room.settings.drawTime * 1000
  const hint = getHint(word, [])

  io.to(drawerId).emit('word_chosen', { word, hint })

  room.players.forEach(p => {
    if (p.id !== drawerId) {
      io.to(p.id).emit('word_chosen', {
        word: null,
        hint,
        wordLength: word.length
      })
    }
  })

  room.hintTimer = setTimeout(() => {
    if (room.state !== 'drawing') return

    const idx = pickHintIndex(room.currentWord, room.revealedHintIndices)
    if (idx === null) return

    room.revealedHintIndices.push(idx)
    const newHint = getHint(room.currentWord, room.revealedHintIndices)

    room.players.forEach(p => {
      if (!p.isDrawing) {
        io.to(p.id).emit('hint_update', { hint: newHint })
      }
    })
  }, duration / 2)

  room.roundTimer = setTimeout(() => {
    endRound(roomCode)
  }, duration)
}

function endRound(roomCode) {
  const room = rooms[roomCode]
  if (!room) return
  if (room.state === 'between_rounds' || room.state === 'game_over') return

  clearTimeout(room.hintTimer)
  clearTimeout(room.roundTimer)

  room.state = 'between_rounds'

  io.to(roomCode).emit('round_end', {
    word: room.currentWord,
    players: getRoomPlayers(room)
  })

  setTimeout(() => {
    if (rooms[roomCode]) startNextTurn(roomCode)
  }, 4000)
}

function endGame(roomCode) {
  const room = rooms[roomCode]
  if (!room) return

  room.state = 'game_over'

  const sorted = [...room.players].sort((a, b) => b.score - a.score)

  io.to(roomCode).emit('game_over', {
    players: sorted.map(p => ({
      id: p.id,
      name: p.name,
      score: p.score
    })),
    winner: sorted[0]
  })
}

io.on('connection', (socket) => {
  console.log('connected:', socket.id)

  socket.on('create_room', ({ playerName }) => {
    const roomCode = generateRoomCode()

    const player = {
      id: socket.id,
      name: playerName,
      score: 0,
      isDrawing: false
    }

    rooms[roomCode] = {
      host: socket.id,
      players: [player],
      settings: { rounds: 3, drawTime: 60 },
      state: 'lobby',
      currentRound: 1,
      currentDrawerIndex: -1,
      currentWord: null,
      wordChoices: [],
      correctGuessers: [],
      revealedHintIndices: [],
      roundTimer: null,
      hintTimer: null,
      chooseTimer: null,
      drawHistory: []
    }

    playerInfo[socket.id] = { name: playerName, roomCode }
    socket.join(roomCode)

    socket.emit('room_created', {
      roomCode,
      players: getRoomPlayers(rooms[roomCode]),
      settings: rooms[roomCode].settings,
      isHost: true
    })
  })

  socket.on('join_room', ({ playerName, roomCode }) => {
    const room = rooms[roomCode]

    if (!room) {
      socket.emit('join_error', { message: 'Room not found' })
      return
    }

    if (room.state !== 'lobby') {
      socket.emit('join_error', { message: 'Game already started' })
      return
    }

    if (room.players.length >= 8) {
      socket.emit('join_error', { message: 'Room is full' })
      return
    }

    const player = {
      id: socket.id,
      name: playerName,
      score: 0,
      isDrawing: false
    }

    room.players.push(player)
    playerInfo[socket.id] = { name: playerName, roomCode }
    socket.join(roomCode)

    socket.emit('room_joined', {
      roomCode,
      players: getRoomPlayers(room),
      settings: room.settings,
      isHost: false
    })

    socket.to(roomCode).emit('player_joined', {
      player,
      players: getRoomPlayers(room)
    })
  })

  socket.on('update_settings', ({ rounds, drawTime }) => {
    const info = playerInfo[socket.id]
    if (!info) return

    const room = rooms[info.roomCode]
    if (!room || room.host !== socket.id) return

    room.settings.rounds = Math.min(Math.max(parseInt(rounds) || 3, 2), 5)
    room.settings.drawTime = Math.min(Math.max(parseInt(drawTime) || 60, 30), 120)

    io.to(info.roomCode).emit('settings_updated', { settings: room.settings })
  })

  socket.on('start_game', () => {
    const info = playerInfo[socket.id]
    if (!info) return

    const room = rooms[info.roomCode]
    if (!room || room.host !== socket.id) return

    if (room.players.length < 2) {
      socket.emit('start_error', { message: 'Need at least 2 players' })
      return
    }

    if (room.state !== 'lobby') return

    room.state = 'starting'
    room.currentRound = 1
    room.currentDrawerIndex = -1

    io.to(info.roomCode).emit('game_starting')

    setTimeout(() => startNextTurn(info.roomCode), 2000)
  })

  socket.on('word_chosen', ({ word }) => {
    const info = playerInfo[socket.id]
    if (!info) return

    const room = rooms[info.roomCode]
    if (!room || room.state !== 'choosing') return

    const player = room.players.find(p => p.id === socket.id)
    if (!player?.isDrawing) return

    if (!room.wordChoices.includes(word)) return

    handleWordChosen(info.roomCode, socket.id, word)
  })

  socket.on('draw_start', (data) => {
    const info = playerInfo[socket.id]
    if (!info) return

    const room = rooms[info.roomCode]
    if (!room || room.state !== 'drawing') return

    const player = room.players.find(p => p.id === socket.id)
    if (!player?.isDrawing) return

    socket.to(info.roomCode).emit('draw_start', data)
    room.drawHistory.push({ type: 'start', data })
  })

  socket.on('draw_move', (data) => {
    const info = playerInfo[socket.id]
    if (!info) return

    const room = rooms[info.roomCode]
    if (!room || room.state !== 'drawing') return

    const player = room.players.find(p => p.id === socket.id)
    if (!player?.isDrawing) return

    socket.to(info.roomCode).emit('draw_move', data)
    room.drawHistory.push({ type: 'move', data })
  })

  socket.on('draw_end', () => {
    const info = playerInfo[socket.id]
    if (!info) return

    socket.to(info.roomCode).emit('draw_end')

    if (rooms[info.roomCode]) {
      rooms[info.roomCode].drawHistory.push({ type: 'end' })
    }
  })

  socket.on('canvas_clear', () => {
    const info = playerInfo[socket.id]
    if (!info) return

    const room = rooms[info.roomCode]
    if (!room) return

    const player = room.players.find(p => p.id === socket.id)
    if (!player?.isDrawing) return

    room.drawHistory = []
    io.to(info.roomCode).emit('canvas_clear')
  })

  socket.on('draw_undo', () => {
    const info = playerInfo[socket.id]
    if (!info) return

    const room = rooms[info.roomCode]
    if (!room) return

    const player = room.players.find(p => p.id === socket.id)
    if (!player?.isDrawing) return

    io.to(info.roomCode).emit('draw_undo')
  })

  socket.on('guess', ({ message }) => {
    const info = playerInfo[socket.id]
    if (!info) return

    const room = rooms[info.roomCode]
    if (!room || room.state !== 'drawing') return

    const player = room.players.find(p => p.id === socket.id)
    if (!player || player.isDrawing) return

    if (room.correctGuessers.includes(socket.id)) return

    const guess = message.trim().toLowerCase()
    const word = room.currentWord?.toLowerCase() || ''

    if (guess === word) {
      room.correctGuessers.push(socket.id)

      const order = room.correctGuessers.length
      const points = Math.max(100 - (order - 1) * 20, 20)
      player.score += points

      const drawer = room.players.find(p => p.isDrawing)
      if (drawer) drawer.score += 15

      io.to(info.roomCode).emit('guess_correct', {
        playerId: socket.id,
        playerName: player.name,
        points,
        players: getRoomPlayers(room)
      })

      io.to(info.roomCode).emit('chat_message', {
        type: 'correct',
        message: `${player.name} guessed the word`,
        playerName: 'System'
      })

      const nonDrawers = room.players.filter(p => !p.isDrawing)
      if (room.correctGuessers.length >= nonDrawers.length) {
        endRound(info.roomCode)
      }
    } else {
      io.to(info.roomCode).emit('chat_message', {
        type: 'normal',
        message,
        playerName: player.name,
        playerId: socket.id
      })
    }
  })

  socket.on('chat_message', ({ message }) => {
    const info = playerInfo[socket.id]
    if (!info) return

    const room = rooms[info.roomCode]
    if (!room) return

    const player = room.players.find(p => p.id === socket.id)
    if (!player) return

    io.to(info.roomCode).emit('chat_message', {
      type: 'normal',
      message,
      playerName: player.name,
      playerId: socket.id
    })
  })

  socket.on('disconnect', () => {
    const info = playerInfo[socket.id]
    if (!info) return

    const { roomCode } = info
    const room = rooms[roomCode]

    if (room) {
      const leaving = room.players.find(p => p.id === socket.id)
      const wasDrawing = leaving?.isDrawing

      room.players = room.players.filter(p => p.id !== socket.id)

      if (!room.players.length) {
        clearTimeout(room.roundTimer)
        clearTimeout(room.hintTimer)
        clearTimeout(room.chooseTimer)
        delete rooms[roomCode]
      } else {
        if (room.host === socket.id) {
          room.host = room.players[0].id
          io.to(room.host).emit('you_are_host')
        }

        io.to(roomCode).emit('player_left', {
          playerId: socket.id,
          playerName: info.name,
          players: getRoomPlayers(room)
        })

        if (wasDrawing && (room.state === 'drawing' || room.state === 'choosing')) {
          io.to(roomCode).emit('chat_message', {
            type: 'system',
            message: `${info.name} left, skipping turn`,
            playerName: 'System'
          })
          endRound(roomCode)
        }
      }
    }

    delete playerInfo[socket.id]
  })
})

app.get('/', (req, res) => {
  res.json({ status: 'ok', rooms: Object.keys(rooms).length })
})

const PORT = 3001

server.listen(PORT, () => {
  console.log(`server running on ${PORT}`)
})