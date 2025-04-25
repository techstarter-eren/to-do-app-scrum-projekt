const express = require('express');
const sqlite3 = require('sqlite3');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
const SECRET_KEY = 'Ihr_Geheimer_Schluessel';

// -------------------------------
// Datenbankinitialisierung
// -------------------------------
const db = new sqlite3.Database('./tasks.db');
db.run('ALTER TABLE tasks ADD COLUMN deadline TEXT', (err) => {
    if (err) {
        console.log("Die Spalte 'deadline' existiert möglicherweise bereits:", err.message);
    } else {
        console.log("Spalte 'deadline' erfolgreich hinzugefügt.");
    }
});

app.use(cors());
app.use(bodyParser.json());

// Tabelle erstellen, falls sie nicht existiert
db.run('CREATE TABLE IF NOT EXISTS tasks (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, completed BOOLEAN DEFAULT 0)');

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

// Neues Item hinzufügen (inkl. completed und deadline)
app.post('/add', (req, res) => {
    db.run('INSERT INTO tasks (title, completed, deadline) VALUES (?, ?, ?)', 
        [req.body.title, req.body.completed || 0, req.body.deadline || null], 
        function () {
            res.json({ id: this.lastID, title: req.body.title, completed: req.body.completed || 0, deadline: req.body.deadline || null });
        }
    );
});

// Aufgaben einer bestimmten Kategorie abrufen
app.get('/tasks/:categoryId', (req, res) => {
    db.all('SELECT * FROM tasks WHERE category_id = ?', req.params.categoryId, (err, rows) => {
        if (err) res.status(500).json({ error: err.message });
        else res.json(rows);
    });
});

// Neue Aufgabe hinzufügen
app.post('/add_task', (req, res) => {
    db.run('INSERT INTO tasks (title, completed, deadline, note, category_id) VALUES (?, ?, ?, ?, ?)',
        [req.body.title, req.body.completed || 0, req.body.deadline || null, req.body.note || null, req.body.category_id], 
        function () {
            res.json({ id: this.lastID, title: req.body.title, completed: req.body.completed || 0, deadline: req.body.deadline || null, note: req.body.note || null, category_id: req.body.category_id });
        }
    );
});

// Deadline aktualisieren
app.put('/update_deadline/:id', (req, res) => {
    db.run('UPDATE tasks SET deadline = ? WHERE id = ?', 
        [req.body.deadline, req.params.id], 
        function (err) {
            if (err) {
                res.status(400).json({ error: err.message });
                return;
            }
            res.json({ message: 'Deadline updated', changes: this.changes });
        }
    );
});

// Item löschen
app.delete('/delete/:id', (req, res) => {
    db.run('DELETE FROM tasks WHERE id = ?', req.params.id, (err) => {
        if (err) {
            res.status(400).json({ error: err.message });
            return;
        }
        res.json({ message: "Eingabe gelöscht" });
    });
});

app.listen(3050, "0.0.0.0", () => {
  console.log("Server läuft auf Port 3050");
});