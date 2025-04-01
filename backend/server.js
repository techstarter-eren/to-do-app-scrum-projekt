const express = require('express');
const sqlite3 = require('sqlite3');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();

// Verbindung zur Datenbank
const db = new sqlite3.Database('./tasks.db');
app.use(cors());
app.use(bodyParser.json());

// Tabelle erstellen, falls sie nicht existiert
db.run('CREATE TABLE IF NOT EXISTS tasks (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, completed INTEGER DEFAULT 0)');

// Requests und Responses

app.get('/', (req, res) => {
    res.send('genau');
});

app.get('/lachs_suschi', (req, res) => {
    res.send("hier ist ein leckeres Lachs Sushi!");
});

app.get('/ralf', (req, res) => {
    res.send('vielen Dank Ralf');
});

// Neues Item hinzufügen (inkl. completed)
app.post('/add', (req, res) => {
    db.run('INSERT INTO tasks (title, completed) VALUES (?, ?)',
        [req.body.title, req.body.completed || 0],
        function () {
            res.json({ id: this.lastID, title: req.body.title, completed: req.body.completed || 0 });
        }
    );
});

// Alle Items abrufen
app.get('/liste_abrufen', (req, res) => {
    db.all('SELECT * FROM tasks', (err, rows) => {
        res.json(rows);
    });
});

// Aufgabe als erledigt markieren
app.put('/update/:id', (req, res) => {
    db.run('UPDATE tasks SET completed = ? WHERE id = ?',
        [req.body.completed, req.params.id],
        function (err) {
            if (err) {
                res.status(400).json({ error: err.message });
                return;
            }
            res.json({ message: 'Task updated', changes: this.changes });
        }
    );
});

// Item löschen
app.delete('/delete/:id', (req, res) => {
    db.run('DELETE FROM tasks WHERE id = ?', req.params.id, () => {
        res.json({ message: "Eingabe gelöscht" });
    });
});

app.listen(3050, "0.0.0.0", () => {
    console.log("bald wird es Mittagspause");
});