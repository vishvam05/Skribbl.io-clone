import { useState } from 'react'
import socket from '../socket'

function HomeScreen({ onRoomCreated, onRoomJoined, setMyName }) {
  const [name, setName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [error, setError] = useState('')
  const [tab, setTab] = useState('create')

  const handleCreate = () => {
    const trimmed = name.trim()

    if (!trimmed) {
      setError('Enter your name first!')
      return
    }

    if (trimmed.length > 16) {
      setError('Name too long!')
      return
    }

    setMyName(trimmed)
    socket.emit('create_room', { playerName: trimmed })

    socket.once('room_created', (data) => {
      onRoomCreated(data)
    })
  }

  const handleJoin = () => {
    const trimmedName = name.trim()
    const code = joinCode.trim().toUpperCase()

    if (!trimmedName) {
      setError('Enter your name first!')
      return
    }

    if (!code) {
      setError('Enter a room code!')
      return
    }

    setMyName(trimmedName)

    socket.emit('join_room', {
      playerName: trimmedName,
      roomCode: code
    })

    socket.once('room_joined', (data) => {
      setError('')
      onRoomJoined(data)
    })

    socket.once('join_error', ({ message }) => {
      setError(message)
    })
  }

  const handleKeyDown = (e) => {
    if (e.key !== 'Enter') return
    tab === 'create' ? handleCreate() : handleJoin()
  }

  const switchTab = (value) => {
    setTab(value)
    if (error) setError('')
  }

  return (
    <div className="home-screen">
      <div className="home-card">
        <h1 className="game-title">🎨 Skribbl Clone</h1>
        <p className="subtitle">Draw and guess with friends</p>

        <input
          className="text-input"
          type="text"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          maxLength={16}
          style={{ marginBottom: 20 }}
        />

        <div className="tab-buttons">
          <button
            className={`tab-btn ${tab === 'create' ? 'active' : ''}`}
            onClick={() => switchTab('create')}
          >
            Create Room
          </button>
          <button
            className={`tab-btn ${tab === 'join' ? 'active' : ''}`}
            onClick={() => switchTab('join')}
          >
            Join Room
          </button>
        </div>

        {tab === 'create' && (
          <div className="tab-content">
            <p style={{ color: '#888', fontSize: 14, marginBottom: 14 }}>
              Create a room and share the code
            </p>
            <button className="btn-primary" onClick={handleCreate}>
              Create Room
            </button>
          </div>
        )}

        {tab === 'join' && (
          <div className="tab-content">
            <input
              className="text-input"
              type="text"
              placeholder="Room code (e.g. ABCD)"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              onKeyDown={handleKeyDown}
              maxLength={4}
              style={{ marginBottom: 14 }}
            />
            <button className="btn-primary" onClick={handleJoin}>
              Join Room
            </button>
          </div>
        )}

        {error && <p className="error-msg">{error}</p>}
      </div>
    </div>
  )
}

export default HomeScreen