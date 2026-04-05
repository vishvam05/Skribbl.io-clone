import { io } from 'socket.io-client'

const URL = import.meta.env.VITE_SERVER_URL || 
  (import.meta.env.PROD ? window.location.origin : 'http://localhost:3001')

const socket = io(URL)

export default socket