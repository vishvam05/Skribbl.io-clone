import socket from '../socket'

function GameOver({ data, myName, onPlayAgain }) {
  if (!data) return <div>Loading...</div>

  const { players, winner } = data
  const medals = ['🥇', '🥈', '🥉']
  const isWinner = winner && winner.name === myName

  return (
    <div className="gameover-screen">
      <div className="gameover-card">
        <h1 style={{ marginBottom: 6 }}>Game Over</h1>

        {isWinner ? (
          <div className="winner-banner">
            🎉 You won, {myName}!
          </div>
        ) : (
          <div className="winner-banner loser">
            🏆 {winner?.name} wins with {winner?.score} pts
          </div>
        )}

        <h3 style={{ marginBottom: 14 }}>Final Scores</h3>

        <div className="final-scores">
          {players.map((p, index) => (
            <div
              key={p.id}
              className={`score-row ${p.name === myName ? 'my-score-row' : ''}`}
            >
              <span className="score-rank">
                {medals[index] || `#${index + 1}`}
              </span>

              <span className="score-name">
                {p.name}
                {p.name === myName ? ' (you)' : ''}
              </span>

              <span className="score-points">
                {p.score} pts
              </span>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 28 }}>
          <button className="btn-primary" onClick={onPlayAgain}>
            Back to Home
          </button>
        </div>
      </div>
    </div>
  )
}

export default GameOver