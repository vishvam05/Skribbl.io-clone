**Skribbl Clone**

A simple multiplayer drawing and guessing game basically a skribbl.io clone. Players take turns drawing a word while everyone else tries to guess it in the chat. First to guess gets more points, and whoever has the most at the end wins.

**Tech Stack**

Client : React + Vite<br>
Server : Node.js + Express + Socket.IO

**To Start**

You need two terminals

1. For the server.

    cd server<br>
    npm install<br>
    npm start

2. For the client.
    
    cd client<br>
    npm install<br>
    npm run dev

**How to Play**

1. Enter your name on the home screen
2. Create a room or join one with a 4-letter code
3. The host can tweak the number of rounds and drawing time in the lobby
4. Once the game starts, the drawer picks a word and draws it on the canvas
5. Everyone else types guesses in the chat — correct guesses score points
6. Hints get revealed over time if not getting it
7. Scores are shown at the end.