const express = require('express');
const sqlite3 = require('sqlite3');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();

//TODO: Verbinde eine Datenbank dazu

const db = new sqlite3.Database('./tasks.db');
app.use(cors());                // Middleware
app.use(bodyParser.json());     // Middleware (wie ein Übersetzer)


db.run('CREATE TABLE IF NOT EXISTS tasks (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, completed BOOLEAN DEFAULT 0)');


//TODO: Schreibe requests/responses


app.get('/', (req, res) => {
    res.send('genau'
);});

app.get('/lachs_suschi', (req, res) => {
    res.send("hier ist ein leckeres Lachs Sushi!"
)});

app.get('/ralf', (req, res) => {
    res.send('vielen Dank Ralf');
});

// Wenn ein neues Item hinzugefügt werden soll, soll NodeJS Server diesen Request so behandeln:
app.post('/add', (req, res) => {
    db.run('INSERT INTO tasks (title) VALUES (?)', [req.body.title], function () {
        res.json({id: this.lastID, title: req.body.title, completed: 0});
    });
});


// Liste mir alle existierende Items
// hier sollte nur alle Items als JSON im Response geschrieben werden
app.get('/liste_abrufen', (req, res) => {
    db.all('SELECT * FROM tasks', function (err, rows){
        res.json(rows);
    })
});


app.delete('/delete/:id', (req, res) => {
    db.run('DELETE FROM tasks WHERE id = ?', req.params.id, () =>{res.json({message: "Eingabe gelöscht"})});
})


app.listen(3050, "0.0.0.0", () => {
    console.log("bald wird es Mittagspause")
});