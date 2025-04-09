const express = require('express');
const sqlite3 = require('sqlite3');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const SECRET_KEY = 'Ihr_Geheimer_Schluessel';

// -------------------------------
// Datenbankinitialisierung
// -------------------------------
const db = new sqlite3.Database('./tasks.db');

// Tabellen erstellen
db.serialize(() => {
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
      FOREIGN KEY(user_id) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS attachments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      filename TEXT NOT NULL,
      filepath TEXT NOT NULL,
      filetype TEXT NOT NULL,
      size INTEGER NOT NULL,
      uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(task_id) REFERENCES tasks(id),
      FOREIGN KEY(user_id) REFERENCES users(id)
    )
  `);
});

// -------------------------------
// Datei-Upload Konfiguration
// -------------------------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = './uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Nur PDF, JPEG, JPG und PNG Dateien sind erlaubt'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
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

// -------------------------------
// Benutzer-Endpunkte
// -------------------------------
app.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    
    db.run('INSERT INTO users (username, password) VALUES (?, ?)', 
      [username, hashedPassword], 
      function(err) {
        if (err) {
          return res.status(400).json({ error: 'Benutzername bereits vergeben' });
        }
        res.status(201).json({ message: 'Benutzer erfolgreich registriert' });
      }
    );
  } catch (error) {
    res.status(500).json({ error: 'Serverfehler bei der Registrierung' });
  }
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  
  db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
    if (err || !user) {
      return res.status(400).json({ error: 'Ungültige Anmeldedaten' });
    }
    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Ungültige Anmeldedaten' });
    }
    
    const token = jwt.sign({ id: user.id, username: user.username }, SECRET_KEY, { expiresIn: '1h' });
    res.json({ token, username: user.username });
  });
});

app.get('/me', authenticateToken, (req, res) => {
  res.json({ user: req.user });
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
  db.run('INSERT INTO tasks (title, completed, deadline, note, user_id) VALUES (?, ?, ?, ?, ?)', 
    [req.body.title, req.body.completed || 0, req.body.deadline || null, null, req.user.id], 
    function () {
      res.json({ 
        id: this.lastID, 
        title: req.body.title, 
        completed: req.body.completed || 0, 
        deadline: req.body.deadline || null, 
        note: null,
        user_id: req.user.id
      });
    }
  );
});

app.put('/update/:id', authenticateToken, (req, res) => {
  db.run('UPDATE tasks SET completed = ? WHERE id = ? AND user_id = ?', 
    [req.body.completed, req.params.id, req.user.id], 
    function (err) {
      if (err) {
        res.status(400).json({ error: err.message });
        return;
      }
      res.json({ message: 'Task updated', changes: this.changes });
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
// Datei-Anhänge Endpunkte
// -------------------------------
app.post('/upload/:taskId', authenticateToken, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Keine Datei hochgeladen' });
  }

  const { taskId } = req.params;
  const { filename, path: filepath, mimetype: filetype, size } = req.file;

  db.run(
    'INSERT INTO attachments (task_id, user_id, filename, filepath, filetype, size) VALUES (?, ?, ?, ?, ?, ?)',
    [taskId, req.user.id, filename, filepath, filetype, size],
    function(err) {
      if (err) {
        fs.unlinkSync(req.file.path);
        return res.status(500).json({ error: 'Fehler beim Speichern der Datei' });
      }
      
      res.json({
        id: this.lastID,
        taskId,
        filename,
        filetype,
        size,
        url: `/uploads/${filename}`
      });
    }
  );
});

app.get('/attachments/:taskId', authenticateToken, (req, res) => {
  const { taskId } = req.params;
  
  db.all(
    'SELECT * FROM attachments WHERE task_id = ? AND user_id = ?',
    [taskId, req.user.id],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      const attachments = rows.map(row => ({
        ...row,
        url: `/uploads/${row.filename}`
      }));
      
      res.json(attachments);
    }
  );
});

app.delete('/attachment/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  
  db.get(
    'SELECT * FROM attachments WHERE id = ? AND user_id = ?',
    [id, req.user.id],
    (err, attachment) => {
      if (err || !attachment) {
        return res.status(404).json({ error: 'Datei nicht gefunden' });
      }
      
      fs.unlink(attachment.filepath, (err) => {
        if (err) {
          console.error('Fehler beim Löschen der Datei:', err);
        }
        
        db.run(
          'DELETE FROM attachments WHERE id = ? AND user_id = ?',
          [id, req.user.id],
          function(err) {
            if (err) {
              return res.status(500).json({ error: err.message });
            }
            
            res.json({ message: 'Datei erfolgreich gelöscht', changes: this.changes });
          }
        );
      });
    }
  );
});

// Statische Dateien bereitstellen
app.use('/uploads', express.static('uploads'));

// -------------------------------
// Serverstart
// -------------------------------
app.listen(3050, "0.0.0.0", () => {
  console.log("Server läuft auf Port 3050");
});