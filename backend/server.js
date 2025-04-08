const express = require('express');
const sqlite3 = require('sqlite3');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const db = new sqlite3.Database('./tasks.db');

app.use(cors());
app.use(bodyParser.json());

// Kategorien-Tabelle erstellen, falls sie nicht existiert
db.run('CREATE TABLE IF NOT EXISTS categories (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT)');

// Aufgaben-Tabelle mit Kategorie-Feld aktualisieren
db.run('CREATE TABLE IF NOT EXISTS tasks (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, completed BOOLEAN DEFAULT 0, deadline TEXT, note TEXT, category_id INTEGER, FOREIGN KEY(category_id) REFERENCES categories(id))');

// Kategorien abrufen
app.get('/categories', (req, res) => {
    db.all('SELECT * FROM categories', (err, rows) => {
        if (err) res.status(500).json({ error: err.message });
        else res.json(rows);
    });
});

// Kategorie hinzufügen
app.post('/add_category', (req, res) => {
    db.run('INSERT INTO categories (name) VALUES (?)', [req.body.name], function () {
        res.json({ id: this.lastID, name: req.body.name });
    });
});

// Kategorie löschen
app.delete('/delete_category/:id', (req, res) => {
    db.run('DELETE FROM categories WHERE id = ?', req.params.id, function (err) {
        if (err) res.status(400).json({ error: err.message });
        else res.json({ message: "Kategorie gelöscht" });
    });
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

app.listen(3050, "0.0.0.0", () => {
    console.log("bald wird es Mittagspause");
});