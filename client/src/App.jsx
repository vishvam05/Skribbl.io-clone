import { useEffect, useState } from 'react'
import socket from './socket'
import HomeScreen from './components/HomeScreen'
import Lobby from './components/Lobby'
import Game from './components/Game'
import GameOver from './components/GameOver'

function App() {
  const [screen, setScreen] = useState('home')
  const [roomCode, setRoomCode] = useState('')
  const [players, setPlayers] = useState([])
  const [isHost, setIsHost] = useState(false)
  const [settings, setSettings] = useState({ rounds: 3, drawTime: 60 })
  const [myName, setMyName] = useState('')
  const [gameOverData, setGameOverData] = useState(null)

  useEffect(() => {
    const handleHostTransfer = () => setIsHost(true)
    const handleSettingsUpdate = ({ settings }) => setSettings(settings)
    const handleGameStarting = () => setScreen('game')
    const handleGameOver = (data) => {
      setGameOverData(data)
      setScreen('gameover')
    }
    const handlePlayerUpdate = ({ players }) => setPlayers(players)

    socket.on('you_are_host', handleHostTransfer)
    socket.on('settings_updated', handleSettingsUpdate)
    socket.on('game_starting', handleGameStarting)
    socket.on('game_over', handleGameOver)
    socket.on('player_joined', handlePlayerUpdate)
    socket.on('player_left', handlePlayerUpdate)

    return () => {
      socket.off('you_are_host', handleHostTransfer)
      socket.off('settings_updated', handleSettingsUpdate)
      socket.off('game_starting', handleGameStarting)
      socket.off('game_over', handleGameOver)
      socket.off('player_joined', handlePlayerUpdate)
      socket.off('player_left', handlePlayerUpdate)
    }
  }, [])

  const handleRoomCreated = ({ roomCode, players, settings, isHost }) => {
    setRoomCode(roomCode)
    setPlayers(players)
    setSettings(settings)
    setIsHost(isHost)
    setScreen('lobby')
  }

  const handleRoomJoined = ({ roomCode, players, settings }) => {
    setRoomCode(roomCode)
    setPlayers(players)
    setSettings(settings)
    setIsHost(false)
    setScreen('lobby')
  }

  const handlePlayAgain = () => {
    setScreen('home')
    setRoomCode('')
    setPlayers([])
    setIsHost(false)
    setGameOverData(null)
  }

  return (
    <div className="app">
      {screen === 'home' && (
        <HomeScreen
          onRoomCreated={handleRoomCreated}
          onRoomJoined={handleRoomJoined}
          setMyName={setMyName}
        />
      )}

      {screen === 'lobby' && (
        <Lobby
          roomCode={roomCode}
          players={players}
          isHost={isHost}
          settings={settings}
          myName={myName}
        />
      )}

      {screen === 'game' && (
        <Game
          roomCode={roomCode}
          initialPlayers={players}
          myName={myName}
          settings={settings}
        />
      )}

      {screen === 'gameover' && (
        <GameOver
          data={gameOverData}
          myName={myName}
          onPlayAgain={handlePlayAgain}
        />
      )}
    </div>
  )
}

export default App