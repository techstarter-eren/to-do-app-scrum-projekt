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

// Tabellen erstellen
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT)
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT,
      completed BOOLEAN DEFAULT 0,
      deadline TEXT,
      note TEXT,
      user_id INTEGER,
      category_id INTEGER,
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(category_id) REFERENCES categories(id)
    )
  `);

  
});

app.use(cors());
app.use(bodyParser.json());

// -------------------------------
// Authentifizierungs-Middleware
// -------------------------------
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.sendStatus(401);
  
  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}


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

// Neues Item hinzufügen (inkl. completed, deadline und note)
app.post('/add', (req, res) => {
    db.run('INSERT INTO tasks (title, completed, deadline, note) VALUES (?, ?, ?, ?)', 
        [req.body.title, req.body.completed || 0, req.body.deadline || null, null], 
        function () {
            res.json({ id: this.lastID, title: req.body.title, completed: req.body.completed || 0, deadline: req.body.deadline || null, note: null });
        }
    );
});

// -------------------------------
// Aufgaben-Endpunkte
// -------------------------------
app.get('/liste_abrufen', authenticateToken, (req, res) => {
  db.all('SELECT * FROM tasks WHERE user_id = ?', [req.user.id], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});



app.post('/add', authenticateToken, (req, res) => {
  db.run('INSERT INTO tasks (title, completed, deadline, note, user_id, category_id) VALUES (?, ?, ?, ?, ?, ?)', 
    [req.body.title, req.body.completed || 0, req.body.deadline || null, req.body.note || null, req.user.id, req.body.category_id], 
    function () {
      res.json({ 
        id: this.lastID, 
        title: req.body.title, 
        completed: req.body.completed || 0, 
        deadline: req.body.deadline || null, 
        note: null,
        user_id: req.user.id,
        category_id: req.body.category_id
      });
    }
  );
});

app.put('/update_completed/:id', authenticateToken, (req, res) => {
  db.run('UPDATE tasks SET completed = ? WHERE id = ? AND user_id = ?', 
    [req.body.completed, req.params.id, req.user.id], 
    function (err) {
      if (err) {
        res.status(400).json({ error: err.message });
        return;
      }
      res.json({ message: 'Task status updated', changes: this.changes });
    }
  );
});

app.put('/update_note/:id', authenticateToken, (req, res) => {
  db.run('UPDATE tasks SET note = ? WHERE id = ? AND user_id = ?', 
    [req.body.note, req.params.id, req.user.id], 
    function (err) {
      if (err) {
        res.status(400).json({ error: err.message });
        return;
      }
      res.json({ message: 'Notiz erfolgreich aktualisiert.', changes: this.changes });
    }
  );
});

app.delete('/delete/:id', authenticateToken, (req, res) => {
  db.run('DELETE FROM tasks WHERE id = ? AND user_id = ?', [req.params.id, req.user.id], (err) => {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    res.json({ message: "Eingabe gelöscht" });
  });
});


// -------------------------------
// Serverstart
// -------------------------------
app.listen(3050, "0.0.0.0", () => {
  console.log("Server läuft auf Port 3050");
});