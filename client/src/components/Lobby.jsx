import { useState, useEffect } from 'react'
import socket from '../socket'

function Lobby({ roomCode, players: initialPlayers, isHost, settings: initialSettings, myName }) {
  const [players, setPlayers] = useState(initialPlayers)
  const [settings, setSettings] = useState(initialSettings)
  const [error, setError] = useState('')
  const [amHost, setAmHost] = useState(isHost)

  useEffect(() => {
    const updatePlayers = ({ players }) => setPlayers(players)
    const updateSettings = ({ settings }) => setSettings(settings)
    const makeHost = () => setAmHost(true)
    const handleError = ({ message }) => setError(message)

    socket.on('player_joined', updatePlayers)
    socket.on('player_left', updatePlayers)
    socket.on('settings_updated', updateSettings)
    socket.on('you_are_host', makeHost)
    socket.on('start_error', handleError)

    return () => {
      socket.off('player_joined', updatePlayers)
      socket.off('player_left', updatePlayers)
      socket.off('settings_updated', updateSettings)
      socket.off('you_are_host', makeHost)
      socket.off('start_error', handleError)
    }
  }, [])

  const handleSettingChange = (key, value) => {
    const updated = { ...settings, [key]: value }
    setSettings(updated)
    socket.emit('update_settings', updated)
  }

  const handleStart = () => {
    if (error) setError('')
    socket.emit('start_game')
  }

  const copyCode = () => {
    navigator.clipboard.writeText(roomCode).catch(() => {})
  }

  return (
    <div className="lobby-screen">
      <div className="lobby-card">
        <h2>Waiting Room</h2>

        <div className="room-code-display">
          <span>Room Code: </span>
          <strong className="room-code">{roomCode}</strong>
          <button className="copy-btn" onClick={copyCode}>
            Copy
          </button>
        </div>

        <p style={{ color: '#888', fontSize: 13, marginBottom: 18 }}>
          Share this with your friends
        </p>

        <div className="lobby-content">
          <div className="players-section">
            <h3>Players ({players.length}/8)</h3>

            <ul className="player-list">
              {players.map((p) => (
                <li key={p.id} className="player-item">
                  <span className="player-dot">●</span>
                  {p.name}
                  {p.name === myName && (
                    <span className="you-badge"> (you)</span>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div className="settings-section">
            <h3>Settings</h3>

            <div className="setting-row">
              <label>Rounds:</label>
              {amHost ? (
                <select
                  value={settings.rounds}
                  onChange={(e) =>
                    handleSettingChange('rounds', parseInt(e.target.value))
                  }
                >
                  {[2, 3, 4, 5].map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="setting-value">{settings.rounds}</span>
              )}
            </div>

            <div className="setting-row">
              <label>Draw Time:</label>
              {amHost ? (
                <select
                  value={settings.drawTime}
                  onChange={(e) =>
                    handleSettingChange('drawTime', parseInt(e.target.value))
                  }
                >
                  {[30, 45, 60, 90, 120].map((t) => (
                    <option key={t} value={t}>
                      {t}s
                    </option>
                  ))}
                </select>
              ) : (
                <span className="setting-value">{settings.drawTime}s</span>
              )}
            </div>

            {!amHost && (
              <p style={{ color: '#888', fontSize: 12, marginTop: 8 }}>
                Only the host can change settings
              </p>
            )}
          </div>
        </div>

        {error && <p className="error-msg">{error}</p>}

        {amHost ? (
          <button
            className="btn-primary start-btn"
            onClick={handleStart}
            disabled={players.length < 2}
          >
            {players.length < 2 ? 'Need 2+ players' : 'Start Game'}
          </button>
        ) : (
          <p className="waiting-text">⏳ Waiting for host...</p>
        )}
      </div>
    </div>
  )
}

export default Lobby