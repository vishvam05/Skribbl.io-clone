import { useRef, useEffect, useState, useCallback } from 'react'
import socket from '../socket'

const COLORS = [
  '#000000', '#ffffff', '#ff0000', '#ff6600',
  '#ffff00', '#00cc00', '#0000ff', '#9900cc',
  '#ff99cc', '#996633', '#999999', '#cccccc'
]

function DrawingCanvas({ isDrawing: canDraw }) {
  const canvasRef = useRef(null)
  const isMouseDown = useRef(false)
  const currentStroke = useRef(null)

  const [strokes, setStrokes] = useState([])
  const [color, setColor] = useState('#000000')
  const [brushSize, setBrushSize] = useState(4)

  const redrawCanvas = useCallback((list) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    list.forEach((stroke) => {
      if (!stroke.points?.length) return

      ctx.beginPath()
      ctx.strokeStyle = stroke.color
      ctx.lineWidth = stroke.size
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      if (stroke.points.length === 1) {
        const p = stroke.points[0]
        ctx.arc(p.x, p.y, stroke.size / 2, 0, Math.PI * 2)
        ctx.fillStyle = stroke.color
        ctx.fill()
        return
      }

      ctx.moveTo(stroke.points[0].x, stroke.points[0].y)
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y)
      }
      ctx.stroke()
    })
  }, [])

  const getPos = (e) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    }
  }

  const getTouchPos = (e) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const touch = e.touches[0]

    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    return {
      x: (touch.clientX - rect.left) * scaleX,
      y: (touch.clientY - rect.top) * scaleY
    }
  }

  const drawLine = (ctx, x, y, px, py, c, size) => {
    ctx.beginPath()
    ctx.strokeStyle = c
    ctx.lineWidth = size
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.moveTo(px, py)
    ctx.lineTo(x, y)
    ctx.stroke()
  }

  const handleMouseDown = (e) => {
    if (!canDraw) return

    isMouseDown.current = true
    const pos = getPos(e)

    currentStroke.current = {
      color,
      size: brushSize,
      points: [pos]
    }

    socket.emit('draw_start', { x: pos.x, y: pos.y, color, size: brushSize })
  }

  const handleMouseMove = (e) => {
    if (!canDraw || !isMouseDown.current || !currentStroke.current) return

    const pos = getPos(e)
    const prev = currentStroke.current.points.at(-1)

    currentStroke.current.points.push(pos)

    const ctx = canvasRef.current.getContext('2d')
    drawLine(ctx, pos.x, pos.y, prev.x, prev.y, color, brushSize)

    socket.emit('draw_move', { x: pos.x, y: pos.y })
  }

  const handleMouseUp = () => {
    if (!canDraw || !isMouseDown.current) return

    isMouseDown.current = false

    if (currentStroke.current) {
      setStrokes((prev) => [...prev, currentStroke.current])
      currentStroke.current = null
    }

    socket.emit('draw_end')
  }

  const handleMouseLeave = () => {
    if (isMouseDown.current) handleMouseUp()
  }

  const handleTouchStart = (e) => {
    e.preventDefault()
    if (!canDraw) return

    isMouseDown.current = true
    const pos = getTouchPos(e)

    currentStroke.current = {
      color,
      size: brushSize,
      points: [pos]
    }

    socket.emit('draw_start', { x: pos.x, y: pos.y, color, size: brushSize })
  }

  const handleTouchMove = (e) => {
    e.preventDefault()
    if (!canDraw || !isMouseDown.current || !currentStroke.current) return

    const pos = getTouchPos(e)
    const prev = currentStroke.current.points.at(-1)

    currentStroke.current.points.push(pos)

    const ctx = canvasRef.current.getContext('2d')
    drawLine(ctx, pos.x, pos.y, prev.x, prev.y, color, brushSize)

    socket.emit('draw_move', { x: pos.x, y: pos.y })
  }

  const handleTouchEnd = (e) => {
    e.preventDefault()
    handleMouseUp()
  }

  const handleClear = () => {
    setStrokes([])

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    socket.emit('canvas_clear')
  }

  const handleUndo = () => {
    if (!strokes.length) return

    const updated = strokes.slice(0, -1)
    setStrokes(updated)
    redrawCanvas(updated)

    socket.emit('draw_undo')
  }

  useEffect(() => {
    let remoteStroke = null

    const onStart = ({ x, y, color, size }) => {
      if (canDraw) return
      remoteStroke = { color, size, points: [{ x, y }] }
    }

    const onMove = ({ x, y }) => {
      if (canDraw || !remoteStroke) return

      const prev = remoteStroke.points.at(-1)
      remoteStroke.points.push({ x, y })

      const ctx = canvasRef.current?.getContext('2d')
      if (ctx) drawLine(ctx, x, y, prev.x, prev.y, remoteStroke.color, remoteStroke.size)
    }

    const onEnd = () => {
      if (canDraw || !remoteStroke) return
      setStrokes((prev) => [...prev, remoteStroke])
      remoteStroke = null
    }

    const onClear = () => {
      setStrokes([])
      remoteStroke = null

      const canvas = canvasRef.current
      if (!canvas) return

      const ctx = canvas.getContext('2d')
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    }

    const onUndo = () => {
      if (canDraw) return
      setStrokes((prev) => {
        const updated = prev.slice(0, -1)
        redrawCanvas(updated)
        return updated
      })
    }

    socket.on('draw_start', onStart)
    socket.on('draw_move', onMove)
    socket.on('draw_end', onEnd)
    socket.on('canvas_clear', onClear)
    socket.on('draw_undo', onUndo)

    return () => {
      socket.off('draw_start', onStart)
      socket.off('draw_move', onMove)
      socket.off('draw_end', onEnd)
      socket.off('canvas_clear', onClear)
      socket.off('draw_undo', onUndo)
    }
  }, [canDraw, redrawCanvas])

  useEffect(() => {
    const resetCanvas = () => {
      setStrokes([])

      const canvas = canvasRef.current
      if (!canvas) return

      const ctx = canvas.getContext('2d')
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    }

    socket.on('round_start', resetCanvas)
    return () => socket.off('round_start', resetCanvas)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }, [])

  return (
    <div className="canvas-container">
      <canvas
        ref={canvasRef}
        width={800}
        height={500}
        className="drawing-canvas"
        style={{ cursor: canDraw ? 'crosshair' : 'default' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />

      {canDraw && (
        <div className="drawing-tools">
          <div className="color-palette">
            {COLORS.map((c) => (
              <div
                key={c}
                className={`color-swatch ${color === c ? 'selected' : ''}`}
                style={{
                  backgroundColor: c,
                  border: c === '#ffffff' ? '1px solid #ccc' : 'none'
                }}
                onClick={() => setColor(c)}
              />
            ))}
          </div>

          <div className="brush-sizes">
            {[4, 10, 20].map((size) => (
              <button
                key={size}
                className={`size-btn ${brushSize === size ? 'active' : ''}`}
                onClick={() => setBrushSize(size)}
              >
                {size}px
              </button>
            ))}
          </div>

          <div className="canvas-actions">
            <button
              className="tool-btn"
              onClick={handleUndo}
              disabled={!strokes.length}
            >
              ↩ Undo
            </button>
            <button className="tool-btn" onClick={handleClear}>
              🗑 Clear
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default DrawingCanvas