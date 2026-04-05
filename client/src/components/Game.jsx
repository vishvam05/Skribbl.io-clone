import { useState, useEffect, useRef } from 'react'
import socket from '../socket'
import DrawingCanvas from './DrawingCanvas'
import Chat from './Chat'

function Game({ roomCode, initialPlayers, myName, settings }) {
  const [players, setPlayers] = useState(initialPlayers)
  const [phase, setPhase] = useState('waiting')
  const [currentRound, setCurrentRound] = useState(1)
  const [totalRounds, setTotalRounds] = useState(settings.rounds)
  const [drawerName, setDrawerName] = useState('')
  const [drawerId, setDrawerId] = useState('')
  const [wordHint, setWordHint] = useState('')
  const [myWord, setMyWord] = useState('')
  const [wordChoices, setWordChoices] = useState([])
  const [timeLeft, setTimeLeft] = useState(settings.drawTime)
  const [guessedCorrectly, setGuessedCorrectly] = useState(false)
  const [roundWord, setRoundWord] = useState('')
  const [notif, setNotif] = useState('')

  const timerRef = useRef(null)
  const amDrawing = socket.id === drawerId

  useEffect(() => {
    const handleRoundStart = ({ round, totalRounds, drawerName, drawerId, players }) => {
      setCurrentRound(round)
      setTotalRounds(totalRounds)
      setDrawerName(drawerName)
      setDrawerId(drawerId)
      setPlayers(players)

      setPhase('choosing')
      setGuessedCorrectly(false)
      setMyWord('')
      setWordHint('')
      setWordChoices([])
      setRoundWord('')

      clearInterval(timerRef.current)
      setTimeLeft(settings.drawTime)
    }

    const handleChooseWord = ({ words }) => {
      setWordChoices(words)
    }

    const handleWordChosen = ({ word, hint }) => {
      setPhase('drawing')
      setWordChoices([])

      if (word) {
        setMyWord(word)
        setWordHint(word)
      } else {
        setMyWord('')
        setWordHint(hint)
      }

      clearInterval(timerRef.current)

      let t = settings.drawTime
      setTimeLeft(t)

      timerRef.current = setInterval(() => {
        t -= 1
        setTimeLeft(t)
        if (t <= 0) clearInterval(timerRef.current)
      }, 1000)
    }

    const handleHintUpdate = ({ hint }) => {
      setWordHint(hint)
    }

    const handleGuessCorrect = ({ playerName, points, players }) => {
      setPlayers(players)

      if (playerName === myName) {
        setGuessedCorrectly(true)
        showNotif(`+${points} points`)
      } else {
        showNotif(`${playerName} guessed it`)
      }
    }

    const handleRoundEnd = ({ word, players }) => {
      clearInterval(timerRef.current)
      setPhase('between_rounds')
      setRoundWord(word)
      setPlayers(players)
      setMyWord('')
    }

    const handlePlayerJoin = ({ players }) => {
      setPlayers(players)
    }

    const handlePlayerLeave = ({ players, playerName }) => {
      setPlayers(players)
      showNotif(`${playerName} left`)
    }

    socket.on('round_start', handleRoundStart)
    socket.on('choose_word', handleChooseWord)
    socket.on('word_chosen', handleWordChosen)
    socket.on('hint_update', handleHintUpdate)
    socket.on('guess_correct', handleGuessCorrect)
    socket.on('round_end', handleRoundEnd)
    socket.on('player_joined', handlePlayerJoin)
    socket.on('player_left', handlePlayerLeave)

    return () => {
      socket.off('round_start', handleRoundStart)
      socket.off('choose_word', handleChooseWord)
      socket.off('word_chosen', handleWordChosen)
      socket.off('hint_update', handleHintUpdate)
      socket.off('guess_correct', handleGuessCorrect)
      socket.off('round_end', handleRoundEnd)
      socket.off('player_joined', handlePlayerJoin)
      socket.off('player_left', handlePlayerLeave)
      clearInterval(timerRef.current)
    }
  }, [myName, settings.drawTime])

  const showNotif = (msg) => {
    setNotif(msg)
    setTimeout(() => setNotif(''), 3000)
  }

  const handleWordChoice = (word) => {
    socket.emit('word_chosen', { word })
    setMyWord(word)
    setWordHint(word)
    setWordChoices([])
  }

  const renderWordArea = () => {
    if (phase === 'choosing') {
      if (amDrawing && wordChoices.length) {
        return (
          <div className="word-choice-area">
            <p>Pick a word:</p>
            <div className="word-choices">
              {wordChoices.map((w) => (
                <button
                  key={w}
                  className="word-choice-btn"
                  onClick={() => handleWordChoice(w)}
                >
                  {w}
                </button>
              ))}
            </div>
          </div>
        )
      }
      return <div className="word-display">⏳ {drawerName} is choosing...</div>
    }

    if (phase === 'drawing') {
      if (amDrawing) {
        return (
          <div className="word-display">
            Draw: <strong>{myWord}</strong>
          </div>
        )
      }

      return (
        <div className="word-display">
          {wordHint.split('').map((ch, i) => (
            <span
              key={i}
              className={ch !== '_' && ch !== ' ' ? 'hint-revealed' : 'hint-blank'}
            >
              {ch === '_' ? '_' : ch === ' ' ? '\u00A0\u00A0' : ch}
            </span>
          ))}
        </div>
      )
    }

    if (phase === 'between_rounds') {
      return (
        <div className="word-display">
          Word was: <strong>{roundWord}</strong>
        </div>
      )
    }

    return <div className="word-display">Starting...</div>
  }

  return (
    <div className="game-screen">
      <div className="game-header">
        <div className="round-info">
          Round {currentRound} / {totalRounds}
        </div>

        <div className="word-area">{renderWordArea()}</div>

        <div
          className="timer-display"
          style={{ color: timeLeft <= 10 ? 'red' : 'inherit' }}
        >
          {phase === 'drawing' ? `⏱ ${timeLeft}s` : ''}
        </div>
      </div>

      {notif && <div className="notification">{notif}</div>}

      {phase === 'choosing' && amDrawing && wordChoices.length > 0 && (
        <div className="word-choice-overlay">
          <div className="word-choice-modal">
            <h3>Choose a word</h3>
            <p style={{ color: '#888', fontSize: '13px' }}>
              You have limited time
            </p>
            <div className="word-choices">
              {wordChoices.map((w) => (
                <button
                  key={w}
                  className="word-choice-btn"
                  onClick={() => handleWordChoice(w)}
                >
                  {w}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="game-main">
        <div className="players-sidebar">
          <h4>Players</h4>
          {[...players]
            .sort((a, b) => b.score - a.score)
            .map((p) => (
              <div
                key={p.id}
                className={`sidebar-player ${p.isDrawing ? 'is-drawing' : ''} ${
                  p.name === myName ? 'is-me' : ''
                }`}
              >
                <span className="p-name">
                  {p.isDrawing ? '✏️ ' : ''}
                  {p.name}
                  {p.name === myName ? ' (you)' : ''}
                </span>
                <span className="p-score">{p.score}</span>
              </div>
            ))}
        </div>

        <div className="canvas-area">
          {phase === 'between_rounds' && (
            <div className="between-rounds-overlay">
              <div className="between-rounds-msg">
                <p>
                  The word was: <strong>{roundWord}</strong>
                </p>
                <p style={{ color: '#888' }}>Next turn soon...</p>
              </div>
            </div>
          )}

          <DrawingCanvas isDrawing={amDrawing && phase === 'drawing'} />

          {!amDrawing && phase === 'drawing' && (
            <p
              style={{
                textAlign: 'center',
                color: '#888',
                fontSize: '12px',
                marginTop: '4px'
              }}
            >
              {drawerName} is drawing...
            </p>
          )}
        </div>

        <Chat
          isDrawing={amDrawing}
          hasGuessedCorrectly={guessedCorrectly}
          myName={myName}
        />
      </div>
    </div>
  )
}

export default Game