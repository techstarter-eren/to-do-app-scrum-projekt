const express = require('express');
const sqlite3 = require('sqlite3');
const bodyParser = require('body-parser');
const cors = require('cors');



const app = express();

// Verbindung zur Datenbank
const db = new sqlite3.Database('./tasks.db');


// Tabelle erstellen, falls sie nicht existiert
db.run('CREATE TABLE IF NOT EXISTS tasks (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, completed INTEGER DEFAULT 0, deadline TEXT, note TEXT, recurring INTEGER DEFAULT 0, recurrence_type TEXT, recurrence_interval INTEGER, recurrence_start_date TEXT, recurrence_end_date TEXT, category TEXT)', (err) => {
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

// Add recurring columns to tasks table if they don't exist
db.run('ALTER TABLE tasks ADD COLUMN recurring INTEGER DEFAULT 0', (err) => {
    if (err && !err.message.includes('duplicate column name')) {
        console.error('Error adding recurring column:', err.message);
    } else if (!err) {
        console.log('The recurring column was successfully added to the tasks table.');
    }
});

db.run('ALTER TABLE tasks ADD COLUMN recurrence_type TEXT', (err) => {
    if (err && !err.message.includes('duplicate column name')) {
        console.error('Error adding recurrence_type column:', err.message);
    } else if (!err) {
        console.log('The recurrence_type column was successfully added to the tasks table.');
    }
});

db.run('ALTER TABLE tasks ADD COLUMN recurrence_interval INTEGER', (err) => {
    if (err && !err.message.includes('duplicate column name')) {
        console.error('Error adding recurrence_interval column:', err.message);
    } else if (!err) {
        console.log('The recurrence_interval column was successfully added to the tasks table.');
    }
});

db.run('ALTER TABLE tasks ADD COLUMN recurrence_start_date TEXT', (err) => {
    if (err && !err.message.includes('duplicate column name')) {
        console.error('Error adding recurrence_start_date column:', err.message);
    } else if (!err) {
        console.log('The recurrence_start_date column was successfully added to the tasks table.');
    }
});

db.run('ALTER TABLE tasks ADD COLUMN recurrence_end_date TEXT', (err) => {
    if (err && !err.message.includes('duplicate column name')) {
        console.error('Error adding recurrence_end_date column:', err.message);
    } else if (!err) {
        console.log('The recurrence_end_date column was successfully added to the tasks table.');
    }
});

// Add category column to tasks table if it doesn't exist
db.run('ALTER TABLE tasks ADD COLUMN category TEXT', (err) => {
    if (err && !err.message.includes('duplicate column name')) {
        console.error('Error adding category column:', err.message);
    } else if (!err) {
        console.log('The category column was successfully added to the tasks table.');
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

// Neues Element hinzufügen (inkl. erledigt, Wiederholung und Kategorie)
app.post('/add', (req, res) => {
    const { title, completed, category, recurring, recurrence_type, recurrence_interval, recurrence_start_date, recurrence_end_date } = req.body;
    db.run(
        'INSERT INTO tasks (title, completed, category, recurring, recurrence_type, recurrence_interval, recurrence_start_date, recurrence_end_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [title, completed || 0, category, recurring || 0, recurrence_type, recurrence_interval, recurrence_start_date, recurrence_end_date],
        function () {
            res.json({ id: this.lastID, title, completed: completed || 0, category, deadline: null, note: null, recurring: recurring || 0, recurrence_type, recurrence_interval, recurrence_start_date, recurrence_end_date });
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