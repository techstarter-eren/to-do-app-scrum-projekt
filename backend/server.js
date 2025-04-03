const express = require('express');
const sqlite3 = require('sqlite3');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();

// Verbindung zur Datenbank
const db = new sqlite3.Database('./tasks.db');

// Tabelle erstellen, falls sie nicht existiert
db.run('CREATE TABLE IF NOT EXISTS tasks (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, completed INTEGER DEFAULT 0, deadline TEXT, note TEXT)', (err) => {
    if (err) {
        console.error('Error creating tasks table:', err.message);
    } else {
        console.log('Tasks table created successfully (or already exists).');
    }
});

// Add deadline column to tasks table if it doesn't exist
db.run('ALTER TABLE tasks ADD COLUMN deadline TEXT', (err) => {
    if (err) {
        if (err.message.includes('duplicate column name')) {
            console.log('The deadline column already exists.');
        } else {
            console.error('Error adding deadline column:', err.message);
        }
    } else {
        console.log('The deadline column was successfully added to the tasks table.');
    }
});

// Add note column to tasks table if it doesn't exist
db.run('ALTER TABLE tasks ADD COLUMN note TEXT', (err) => {
    if (err) {
        if (err.message.includes('duplicate column name')) {
            console.log('The note column already exists.');
        } else {
            console.error('Error adding note column:', err.message);
        }
    } else {
        console.log('The note column was successfully added to the tasks table.');
    }
});

app.use(cors());
app.use(bodyParser.json());

// Anfragen und Antworten

app.get('/', (req, res) => {
    res.send('genau');
});

app.get('/lachs_suschi', (req, res) => {
    res.send("hier ist ein leckeres Lachs Sushi!");
});

app.get('/ralf', (req, res) => {
    res.send('vielen Dank Ralf');
});

// Neues Element hinzufügen (inkl. erledigt)
app.post('/add', (req, res) => {
    db.run('INSERT INTO tasks (title, completed) VALUES (?, ?)',
        [req.body.title, req.body.completed || 0],
        function () {
            res.json({ id: this.lastID, title: req.body.title, completed: req.body.completed || 0, deadline: null, note: null });
        }
    );
});

// Alle Elemente abrufen
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
            res.json({ message: 'Aufgabe aktualisiert', changes: this.changes });
        }
    );
});

// Element löschen
app.delete('/delete/:id', (req, res) => {
    db.run('DELETE FROM tasks WHERE id = ?', req.params.id, () => {
        res.json({ message: "Eingabe gelöscht" });
    });
});

// Deadline für eine Aufgabe setzen
app.put('/set-deadline/:id', (req, res) => {
    const taskId = req.params.id;
    const deadline = req.body.deadline;

    db.run('UPDATE tasks SET deadline = ? WHERE id = ?', [deadline, taskId], function (err) {
        if (err) {
            console.error(err.message);
            return res.status(500).json({ error: 'Fehler beim Aktualisieren der Deadline' });
        }
        res.json({ message: `Deadline für Aufgabe mit ID ${taskId} gesetzt`, deadline: deadline });
    });
});

// Notiz für eine Aufgabe setzen
app.put('/set-note/:id', (req, res) => {
    const taskId = req.params.id;
    const note = req.body.note;

    db.run('UPDATE tasks SET note = ? WHERE id = ?', [note, taskId], function (err) {
        if (err) {
            console.error(err.message);
            return res.status(500).json({ error: 'Fehler beim Aktualisieren der Notiz' });
        }
        res.json({ message: `Notiz für Aufgabe mit ID ${taskId} gesetzt`, note: note });
    });
});

app.listen(3050, "0.0.0.0", () => {
    console.log("bald wird es Mittagspause");
});