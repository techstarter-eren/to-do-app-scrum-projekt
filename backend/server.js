const express = require('express');
const sqlite3 = require('sqlite3');
const bodyParser = require('body-parser');

const app = express();

//TODO: Verbinde eine Datenbank dazu

const db = new sqlite3.Database('./tasks.db');

app.use(bodyParser.json());     // Middleware


db.run('CREATE TABLE IF NOT EXISTS tasks (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, completed BOOLEAN DEFAULT 0)');


//TODO: Schreibe requests/responses


app.get('/', (req, res) => {
    res.send('request received');
});

app.get('/ralf', (req, res) => {
    res.send('vielen Dank Ralf');
});

app.post('/add', (req, res) => {
    db.run('INSERT INTO tasks (title) VALUES (?)', [req.body.title], function () {
        res.json({tag: "Mittwoch", bald_wirds: "Mittagspause"});
    });
});


app.listen(3050, "localhost", () => {
    console.log("bald wird es Mittagspause")
});