import { useState, useEffect, useRef } from 'react'
import socket from '../socket'

function Chat({ isDrawing, hasGuessedCorrectly, myName }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const bottomRef = useRef(null)

  useEffect(() => {
    const handleChat = ({ type, message, playerName, playerId }) => {
      setMessages(prev => [
        ...prev,
        {
          type,
          message,
          playerName,
          playerId,
          id: Date.now() + Math.random()
        }
      ])
    }

    const handleRound = () => {
      setMessages(prev => [
        ...prev,
        {
          type: 'system',
          message: '--- new turn ---',
          playerName: 'System',
          id: Date.now()
        }
      ])
    }

    socket.on('chat_message', handleChat)
    socket.on('round_start', handleRound)

    return () => {
      socket.off('chat_message', handleChat)
      socket.off('round_start', handleRound)
    }
  }, [])

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  const handleSend = () => {
    const text = input.trim()
    if (!text) return
    if (isDrawing || hasGuessedCorrectly) return

    socket.emit('guess', { message: text })
    setInput('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSend()
    }
  }

  const getMsgClass = (msg) => {
    if (msg.type === 'correct') return 'msg-correct'
    if (msg.type === 'system') return 'msg-system'
    if (msg.playerName === myName) return 'msg-mine'
    return 'msg-normal'
  }

  const placeholder = isDrawing
    ? "You're drawing!"
    : hasGuessedCorrectly
    ? 'Nice! Wait for others...'
    : 'Type your guess...'

  return (
    <div className="chat-container">
      <div className="chat-messages">
        {messages.map((msg) => (
          <div key={msg.id} className={`chat-msg ${getMsgClass(msg)}`}>
            {msg.type !== 'system' && msg.type !== 'correct' && (
              <span className="msg-name">{msg.playerName}: </span>
            )}
            <span className="msg-text">{msg.message}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="chat-input-row">
        <input
          className="chat-input"
          type="text"
          placeholder={placeholder}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isDrawing || hasGuessedCorrectly}
          maxLength={50}
        />
        <button
          className="send-btn"
          onClick={handleSend}
          disabled={isDrawing || hasGuessedCorrectly}
        >
          Send
        </button>
      </div>
    </div>
  )
}

export default Chat