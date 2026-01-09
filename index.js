const express = require("express");
const app = express();
const cors = require('cors');

const path = require('path');
app.use('/', express.static(path.join(__dirname, 'public')));

// Handlebars
const { engine } = require('express-handlebars');
app.engine('handlebars', engine());
app.set('view engine', 'handlebars');
app.set('views', path.join(__dirname, 'views'));

const jsonParser = express.json();


function Game(nameA, nameB) {
    this.nameA = nameA;
    this.nameB = nameB;
    this.goalA = 0;
    this.goalB = 0;
    this.update = function (a, b) {
        this.goalA = a;
        this.goalB = b;
    }
}

const games = {
    'g1': new Game("EquipoA", "EquipoB"),
    'g2': new Game("EquipoC", "EquipoD"),
}

app.get('/game-updater/:gameid', async function(req, res) {
    const { gameid } = req.params;
    res.render('updater', { layout: false, gameid, game: games[gameid] });
});

app.post('/update/:gameid', jsonParser, (req, res) => {
    const { gameid } = req.params;

    console.log(req.body);
    const { counterA, counterB } = req.body;
    console.log(`Received Update -> A: ${counterA}, B: ${counterB}`);

    let game = games[gameid];
    game.goalA = counterA;
    game.goalB = counterB;

    // Send a response back to the jQuery client
    res.json({ status: 'success', received: { a: counterA, b: counterB } });
});

app.get('/events', (req, res) => {
    // Set headers to keep the connection alive and tell the client we're sending event-stream data
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    let pgames = {};
    for(var gameid in games) {
        let game = games[gameid];
        pgames[gameid] = {'name1': game.nameA, 'name2': game.nameB};
    }
    res.write(`data: ["games", ${JSON.stringify(pgames)}]\n\n`)
    // Send an initial message
    // res.write(`data: Connected to server\n\n`);

    // Simulate sending updates from the server
    let counter = 0;
    const intervalId = setInterval(() => {
        let scores = {};
        for(var gameid in games) {
            let game = games[gameid];
            scores[gameid] = [game.goalA, game.goalB];
        }
        // Write the event stream format
        res.write(`data: ["goals", ${JSON.stringify(scores)}]\n\n`);
    }, 2000);

    // When client closes connection, stop sending events
    req.on('close', () => {
        clearInterval(intervalId);
        res.end();
    });
});

app.listen(3000, () => {
    console.log('SSE server started on port 3000');
});