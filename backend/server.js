const express = require('express');
const sqlite3 = require('sqlite3');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcrypt');
const multer = require('multer'); // Für Dateiuploads
const path = require('path');   // Für Pfadoperationen
const fs = require('fs');       // Für Dateisystemoperationen (Löschen)

const app = express();
const PORT = 3050;
const HOST = "0.0.0.0"; // Lauscht auf allen Interfaces
const UPLOAD_DIR = path.join(__dirname, 'uploads');
const DB_FILE = './tasks.db'; // Neuer DB-Dateiname

// --- Hilfsfunktion zur Datumprüfung ---
function isPastDate(dateString) {
    if (!dateString) return false; // Kein Datum ist nicht in der Vergangenheit

    try {
        const inputDate = new Date(dateString);
        // Stelle sicher, dass das Datum gültig ist
        if (isNaN(inputDate.getTime())) {
            console.warn(`Ungültiges Datumsformat empfangen: ${dateString}`);
            return true; // Behandle ungültiges Datum als Fehler (oder entscheide anders)
        }

        const today = new Date();

        // Setze die Zeit auf 00:00:00 für einen reinen Datumsvergleich
        inputDate.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);

        return inputDate < today;
    } catch (e) {
        console.error(`Fehler beim Parsen des Datums: ${dateString}`, e);
        return true; // Bei Fehler im Parsing vorsichtshalber als "vergangen" werten
    }
}

// --- Datenbank Verbindung & Setup ---
const db = new sqlite3.Database(DB_FILE, (err) => {
    if (err) {
        console.error("FEHLER beim Verbinden mit der Datenbank:", err.message);
        process.exit(1);
    } else {
        console.log(`Erfolgreich mit ${DB_FILE} verbunden.`);
        db.run('PRAGMA foreign_keys = ON;', foreignKeyErr => {
            if (foreignKeyErr) {
                console.error("Konnte Foreign Key Constraints nicht aktivieren:", foreignKeyErr.message);
            } else {
                console.log("Foreign Key Constraints aktiviert.");
            }
            setupTables();
        });
    }
});

// --- Tabellen Setup Funktion ---
function setupTables() {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL
    )`, (err) => {
        if (err) console.error('Fehler beim Erstellen der users-Tabelle:', err.message);
        else console.log('Users-Tabelle erfolgreich erstellt (oder existiert bereits).');
    });

    db.run(`CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        completed INTEGER DEFAULT 0 CHECK(completed IN (0, 1)),
        deadline TEXT, -- Format YYYY-MM-DD empfohlen
        note TEXT,
        category TEXT,
        recurring INTEGER DEFAULT 0,
        recurrence_type TEXT,
        recurrence_interval INTEGER,
        recurrence_start_date TEXT,
        recurrence_end_date TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )`, (err) => {
        if (err) console.error('Fehler beim Erstellen der tasks-Tabelle:', err.message);
        else console.log('Tasks-Tabelle erfolgreich erstellt (oder existiert bereits).');
    });

    db.run(`CREATE TABLE IF NOT EXISTS attachments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        original_filename TEXT NOT NULL,
        filename TEXT NOT NULL UNIQUE,
        mimetype TEXT NOT NULL,
        filepath TEXT NOT NULL,
        uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )`, (err) => {
        if (err) console.error('Fehler beim Erstellen der attachments-Tabelle:', err.message);
        else console.log('Attachments-Tabelle erfolgreich erstellt (oder existiert bereits).');
    });
}

// --- Multer Konfiguration ---
if (!fs.existsSync(UPLOAD_DIR)) {
    try {
        fs.mkdirSync(UPLOAD_DIR, { recursive: true });
        console.log(`Upload-Verzeichnis erstellt: ${UPLOAD_DIR}`);
    } catch (mkdirErr) {
        console.error(`Fehler beim Erstellen des Upload-Verzeichnisses ${UPLOAD_DIR}:`, mkdirErr);
        process.exit(1);
    }
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, UPLOAD_DIR);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = path.extname(file.originalname);
        cb(null, 'attachment-' + uniqueSuffix + extension);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf|gif|txt/;
    const mimetype = allowedTypes.test(file.mimetype);
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    if (mimetype && extname) {
        cb(null, true);
    } else {
        cb(new Error('Dateityp nicht erlaubt. Nur Bilder (JPG, PNG, GIF), PDF oder TXT sind zulässig.'), false);
    }
};

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: fileFilter
});

// --- Middleware ---
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/uploads', express.static(UPLOAD_DIR));

app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        return res.status(400).json({ error: `Multer Fehler: ${error.message}` });
    } else if (error) {
        return res.status(400).json({ error: error.message });
    }
    next();
});


// === ROUTEN ===

// --- Authentifizierung ---

// Registrierung
app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Benutzername und Passwort sind erforderlich.' });
    }
    if (password.length < 6) {
        return res.status(400).json({ error: 'Passwort muss mindestens 6 Zeichen lang sein.' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const sql = 'INSERT INTO users (username, password) VALUES (?, ?)';

        db.run(sql, [username, hashedPassword], function (err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed: users.username')) {
                    return res.status(409).json({ error: 'Benutzername ist bereits vergeben.' });
                }
                console.error("DB Fehler bei Registrierung:", err.message);
                return res.status(500).json({ error: 'Fehler bei der Registrierung auf dem Server.' });
            }
            console.log(`User ${username} (ID: ${this.lastID}) registriert.`);
            res.status(201).json({ message: 'Benutzer erfolgreich registriert.', userId: this.lastID, username: username });
        });
    } catch (hashError) {
        console.error("Fehler beim Passwort-Hashing:", hashError);
        res.status(500).json({ error: 'Interner Serverfehler beim Verarbeiten des Passworts.' });
    }
});

// Login
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Benutzername und Passwort sind erforderlich.' });
    }

    console.log(`Login Versuch für User: ${username}`);
    const sql = 'SELECT id, username, password FROM users WHERE username = ?';

    db.get(sql, [username], async (err, user) => {
        if (err) {
            console.error("DB Fehler bei Login (User-Suche):", err.message);
            return res.status(500).json({ error: 'Datenbankfehler beim Login.' });
        }
        if (!user) {
            console.log(`Login fehlgeschlagen: User ${username} nicht gefunden.`);
            return res.status(401).json({ error: 'Ungültiger Benutzername oder Passwort.' });
        }

        try {
            const isMatch = await bcrypt.compare(password, user.password);
            if (isMatch) {
                console.log(`Login erfolgreich für User: ${username} (ID: ${user.id})`);
                res.json({ message: 'Login erfolgreich', userId: user.id, username: user.username });
            } else {
                console.log(`Login fehlgeschlagen: Falsches Passwort für User ${username}.`);
                res.status(401).json({ error: 'Ungültiger Benutzername oder Passwort.' });
            }
        } catch (compareError) {
            console.error("Fehler beim Passwortvergleich:", compareError);
            res.status(500).json({ error: 'Interner Serverfehler beim Login.' });
        }
    });
});


// --- Aufgaben (Tasks) ---

// Aufgabe hinzufügen (mit Datumsprüfung)
app.post('/add', (req, res) => {
    const {
        title, deadline, note, category, userId,
        recurring, recurrence_type, recurrence_interval, recurrence_start_date, recurrence_end_date
    } = req.body;

    if (!userId) {
        return res.status(401).json({ error: 'Authentifizierung erforderlich (userId fehlt).' });
    }
    if (!title) {
        return res.status(400).json({ error: 'Titel ist erforderlich.' });
    }

    // --- NEU: Datumsprüfung ---
    if (deadline && isPastDate(deadline)) {
        return res.status(400).json({ error: 'Das Zieldatum (Deadline) darf nicht in der Vergangenheit liegen.' });
    }
    // Prüfe auch Recurring Daten, falls relevant (optional, hier nur deadline geprüft)
    // if (recurring && recurrence_start_date && isPastDate(recurrence_start_date)) { ... }
    // --- Ende Datumsprüfung ---

    const sql = `INSERT INTO tasks (
                    user_id, title, deadline, note, category,
                    recurring, recurrence_type, recurrence_interval, recurrence_start_date, recurrence_end_date
                 ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const params = [
        userId,
        title,
        deadline || null, // Speichere 'YYYY-MM-DD' oder null
        note || null,
        category || null,
        recurring ? 1 : 0,
        recurring ? recurrence_type : null,
        recurring ? recurrence_interval : null,
        recurring ? recurrence_start_date : null, // Hier auch Datumsprüfung möglich
        recurring ? recurrence_end_date : null   // Hier auch Datumsprüfung möglich
    ];

    db.run(sql, params, function (err) {
        if (err) {
            console.error(`DB Fehler beim Hinzufügen von Task für User ${userId}:`, err.message);
            return res.status(500).json({ error: 'Fehler beim Speichern der Aufgabe.' });
        }
        const newTaskSql = 'SELECT * FROM tasks WHERE id = ?';
        db.get(newTaskSql, [this.lastID], (getErr, newTask) => {
             if (getErr) {
                console.error(`Fehler beim Abrufen des neuen Tasks ${this.lastID}:`, getErr);
                return res.status(201).json({ message: 'Aufgabe hinzugefügt, aber Details konnten nicht sofort abgerufen werden.', taskId: this.lastID });
             }
             if (newTask) {
                 console.log(`Task ${newTask.id} für User ${userId} hinzugefügt: ${newTask.title}`);
                 res.status(201).json({ ...newTask, attachments: [] }); // Neue Tasks haben keine Anhänge
             } else {
                  res.status(404).json({ error: 'Aufgabe hinzugefügt, aber konnte nicht gefunden werden.' });
             }
        });
    });
});

// Aufgabenliste für einen Benutzer abrufen (mit neuer Sortierung)
app.get('/liste_abrufen', (req, res) => {
    const userId = req.query.userId;

    if (!userId) {
        return res.status(400).json({ error: 'Benutzer-ID (userId) im Query-Parameter erforderlich.' });
    }

    // --- NEU: Angepasste Sortierung ---
    // 1. Nach `completed` aufsteigend (0 zuerst, 1 danach)
    // 2. Innerhalb jeder Gruppe nach `created_at` aufsteigend (älteste zuerst)
    const tasksSql = `
        SELECT id, user_id, title, completed, deadline, note, category,
               recurring, recurrence_type, recurrence_interval, recurrence_start_date, recurrence_end_date, created_at
        FROM tasks
        WHERE user_id = ?
        ORDER BY completed ASC, created_at ASC`; // Geänderte Sortierung

    db.all(tasksSql, [userId], (err, tasks) => {
        if (err) {
            console.error(`DB Fehler beim Abrufen der Tasks für User ${userId}:`, err.message);
            return res.status(500).json({ error: `Datenbankfehler: ${err.message}` });
        }

        if (tasks.length === 0) {
            return res.json([]);
        }

        const taskIds = tasks.map(t => t.id);
        const placeholders = taskIds.map(() => '?').join(',');

        const attachmentsSql = `
            SELECT id, task_id, user_id, original_filename, filename, mimetype, filepath, uploaded_at
            FROM attachments
            WHERE task_id IN (${placeholders}) AND user_id = ?
            ORDER BY uploaded_at ASC`;

        db.all(attachmentsSql, [...taskIds, userId], (attachErr, attachments) => {
            if (attachErr) {
                console.error(`DB Fehler beim Abrufen der Anhänge für User ${userId}, Tasks [${taskIds.join(',')}]:`, attachErr.message);
                return res.status(500).json({ error: `Datenbankfehler beim Laden der Anhänge: ${attachErr.message}` });
            }

            const tasksWithAttachments = tasks.map(task => ({
                ...task,
                attachments: attachments.filter(att => att.task_id === task.id)
            }));

            // Die Liste ist bereits nach den neuen Kriterien sortiert
            res.json(tasksWithAttachments);
        });
    });
});

// Aufgabe aktualisieren (nur 'completed' Status)
app.put('/update/:id', (req, res) => {
    const taskId = req.params.id;
    const { completed, userId } = req.body;

    if (typeof completed === 'undefined' || userId === undefined) {
        return res.status(400).json({ error: 'Status \'completed\' und \'userId\' sind im Request Body erforderlich.' });
    }

    const sql = 'UPDATE tasks SET completed = ? WHERE id = ? AND user_id = ?';
    const params = [completed ? 1 : 0, taskId, userId];

    db.run(sql, params, function (err) {
        if (err) {
            console.error(`DB Fehler beim Aktualisieren von Task ${taskId} (User ${userId}):`, err.message);
            return res.status(500).json({ error: `Datenbankfehler: ${err.message}` });
        }
        if (this.changes === 0) {
            console.log(`Update fehlgeschlagen: Task ${taskId} nicht gefunden oder gehört nicht zu User ${userId}.`);
            return res.status(404).json({ error: 'Aufgabe nicht gefunden oder Zugriff verweigert.' });
        }
        console.log(`Task ${taskId} (User ${userId}) aktualisiert. Completed: ${completed}`);
        // Gib den aktualisierten Status zurück
        res.json({ message: 'Aufgabe erfolgreich aktualisiert', taskId: parseInt(taskId), completed: !!completed });
    });
});

// Deadline für eine Aufgabe setzen/ändern (mit Datumsprüfung)
app.put('/set-deadline/:id', (req, res) => {
    const taskId = req.params.id;
    const { deadline, userId } = req.body; // Deadline ist 'YYYY-MM-DD' oder null/undefined

    if (userId === undefined) {
        return res.status(400).json({ error: '\'userId\' ist im Request Body erforderlich.' });
    }

    // --- NEU: Datumsprüfung ---
    const effectiveDeadline = deadline || null; // Stelle sicher, dass es null ist, wenn nicht vorhanden
    if (effectiveDeadline && isPastDate(effectiveDeadline)) {
        return res.status(400).json({ error: 'Das Zieldatum (Deadline) darf nicht in der Vergangenheit liegen.' });
    }
    // --- Ende Datumsprüfung ---

    const sql = 'UPDATE tasks SET deadline = ? WHERE id = ? AND user_id = ?';
    const params = [effectiveDeadline, taskId, userId];

    db.run(sql, params, function (err) {
        if (err) {
            console.error(`DB Fehler beim Setzen der Deadline für Task ${taskId} (User ${userId}):`, err.message);
            return res.status(500).json({ error: `Datenbankfehler: ${err.message}` });
        }
        if (this.changes === 0) {
            console.log(`Set Deadline fehlgeschlagen: Task ${taskId} nicht gefunden oder gehört nicht zu User ${userId}.`);
            return res.status(404).json({ error: 'Aufgabe nicht gefunden oder Zugriff verweigert.' });
        }
        console.log(`Deadline für Task ${taskId} (User ${userId}) gesetzt/geändert: ${effectiveDeadline || 'Keine'}`);
        res.json({ message: 'Deadline erfolgreich aktualisiert', taskId: parseInt(taskId), deadline: effectiveDeadline });
    });
});

// Notiz für eine Aufgabe setzen/ändern
app.put('/set-note/:id', (req, res) => {
    const taskId = req.params.id;
    const { note, userId } = req.body;

    if (userId === undefined) {
        return res.status(400).json({ error: '\'userId\' ist im Request Body erforderlich.' });
    }

    const sql = 'UPDATE tasks SET note = ? WHERE id = ? AND user_id = ?';
    const params = [note || null, taskId, userId];

    db.run(sql, params, function (err) {
        if (err) {
            console.error(`DB Fehler beim Setzen der Notiz für Task ${taskId} (User ${userId}):`, err.message);
            return res.status(500).json({ error: `Datenbankfehler: ${err.message}` });
        }
        if (this.changes === 0) {
            console.log(`Set Note fehlgeschlagen: Task ${taskId} nicht gefunden oder gehört nicht zu User ${userId}.`);
            return res.status(404).json({ error: 'Aufgabe nicht gefunden oder Zugriff verweigert.' });
        }
        console.log(`Notiz für Task ${taskId} (User ${userId}) gesetzt/geändert.`);
        res.json({ message: 'Notiz erfolgreich aktualisiert', taskId: parseInt(taskId), note: note || null });
    });
});

// Aufgabe löschen (inkl. Anhänge)
app.delete('/delete/:id', (req, res) => {
    const taskId = req.params.id;
    const userId = req.body.userId;

    if (!userId) {
        return res.status(400).json({ error: 'Benutzer-ID (userId) ist im Request Body zum Löschen erforderlich.' });
    }

    const findAttachmentsSql = 'SELECT filename FROM attachments WHERE task_id = ? AND user_id = ?';
    db.all(findAttachmentsSql, [taskId, userId], (findErr, attachments) => {
        if (findErr) {
            console.error(`DB Fehler beim Suchen der Anhänge für Task ${taskId} (User ${userId}):`, findErr.message);
            return res.status(500).json({ error: 'Fehler beim Vorbereiten des Löschvorgangs.' });
        }

        const deleteTaskSql = 'DELETE FROM tasks WHERE id = ? AND user_id = ?';
        db.run(deleteTaskSql, [taskId, userId], function (deleteErr) {
            if (deleteErr) {
                console.error(`DB Fehler beim Löschen von Task ${taskId} (User ${userId}):`, deleteErr.message);
                return res.status(500).json({ error: `Datenbankfehler beim Löschen der Aufgabe: ${deleteErr.message}` });
            }

            if (this.changes === 0) {
                console.log(`Löschen fehlgeschlagen: Task ${taskId} nicht gefunden oder gehört nicht zu User ${userId}.`);
                return res.status(404).json({ error: 'Aufgabe nicht gefunden oder Zugriff verweigert.' });
            }

            console.log(`Task ${taskId} (User ${userId}) erfolgreich aus DB gelöscht.`);
            if (attachments && attachments.length > 0) {
                console.log(`Lösche ${attachments.length} zugehörige Dateien...`);
                attachments.forEach(att => {
                    if (att.filename) {
                        const absoluteFilePath = path.join(UPLOAD_DIR, att.filename);
                        fs.unlink(absoluteFilePath, (unlinkErr) => {
                            if (unlinkErr && unlinkErr.code !== 'ENOENT') { // Ignoriere "nicht gefunden" Fehler
                                console.error(`Fehler beim Löschen der Datei ${absoluteFilePath}:`, unlinkErr);
                            } else if (!unlinkErr) {
                                console.log(`Datei ${absoluteFilePath} erfolgreich gelöscht.`);
                            }
                        });
                    }
                });
            }
            res.json({ message: 'Aufgabe und zugehörige Anhänge erfolgreich gelöscht', taskId: parseInt(taskId) });
        });
    });
});


// --- Anhänge (Attachments) ---

// Anhang hinzufügen
app.post('/tasks/:taskId/attachments', upload.single('attachmentFile'), (req, res) => {
    const taskId = req.params.taskId;
    const userId = req.body.userId;

    if (!req.file) {
        console.log("Upload-Versuch ohne Datei oder falschem Feldnamen.");
        return res.status(400).json({ error: 'Keine Datei hochgeladen. Feldname "attachmentFile" erwartet.' });
    }
    if (!userId) {
        console.error("Upload-Versuch ohne userId.");
        fs.unlink(req.file.path, (unlinkErr) => { if (unlinkErr) console.error("Fehler beim Löschen verwaister Datei (keine userId):", req.file.path, unlinkErr);});
        return res.status(400).json({ error: 'Benutzer-ID (userId) ist im FormData für den Upload erforderlich.' });
    }

    db.get('SELECT id FROM tasks WHERE id = ? AND user_id = ?', [taskId, userId], (taskErr, taskRow) => {
        if (taskErr) {
             console.error(`DB Fehler beim Task-Check für Task ${taskId} (User ${userId}):`, taskErr.message);
             fs.unlink(req.file.path, (unlinkErr) => { if (unlinkErr) console.error("Fehler beim Löschen verwaister Datei (DB Task Check Error):", req.file.path, unlinkErr);});
             return res.status(500).json({ error: 'Fehler bei der Überprüfung der Aufgabe.' });
        }
        if (!taskRow) {
            console.warn(`Versuchter Upload zu Task ${taskId}, der nicht User ${userId} gehört oder nicht existiert.`);
            fs.unlink(req.file.path, (unlinkErr) => { if (unlinkErr) console.error("Fehler beim Löschen verwaister Datei (Task Check fehlgeschlagen):", req.file.path, unlinkErr);});
            return res.status(403).json({ error: 'Zugriff verweigert: Aufgabe nicht gefunden oder gehört nicht zum Benutzer.' });
        }

        const { originalname, filename, mimetype } = req.file;
        const relativePath = `/uploads/${filename}`;
        const insertSql = `INSERT INTO attachments
            (task_id, user_id, original_filename, filename, mimetype, filepath)
            VALUES (?, ?, ?, ?, ?, ?)`;
        const params = [taskId, userId, originalname, filename, mimetype, relativePath];

        db.run(insertSql, params, function (insertErr) {
            if (insertErr) {
                console.error("Fehler beim Speichern des Anhangs in DB:", insertErr);
                fs.unlink(req.file.path, (unlinkErr) => { if (unlinkErr) console.error("Fehler beim Löschen verwaister Datei (DB Insert fehlgeschlagen):", req.file.path, unlinkErr);});
                return res.status(500).json({ error: 'Fehler beim Speichern des Anhangs in der Datenbank.' });
            }

            const newAttachment = {
                id: this.lastID,
                task_id: parseInt(taskId, 10),
                user_id: parseInt(userId, 10),
                original_filename: originalname,
                filename: filename,
                mimetype: mimetype,
                filepath: relativePath,
                uploaded_at: new Date().toISOString()
            };
            console.log(`Anhang ${filename} für Task ${taskId} (User ${userId}) hochgeladen und in DB gespeichert.`);
            res.status(201).json(newAttachment);
        });
    });
});

// Anhang löschen
app.delete('/attachments/:attachmentId', (req, res) => {
    const attachmentId = req.params.attachmentId;
    const userId = req.body.userId;

    if (!userId) {
        return res.status(400).json({ error: 'Benutzer-ID (userId) ist im Request Body zum Löschen erforderlich.' });
    }

    const selectSql = 'SELECT filename, task_id FROM attachments WHERE id = ? AND user_id = ?';
    db.get(selectSql, [attachmentId, userId], (err, attachment) => {
        if (err) {
            console.error(`Fehler beim Suchen des Anhangs ${attachmentId} (User ${userId}):`, err.message);
            return res.status(500).json({ error: `Fehler beim Suchen des Anhangs: ${err.message}` });
        }
        if (!attachment) {
            console.log(`Löschen fehlgeschlagen: Anhang ${attachmentId} nicht gefunden oder gehört nicht zu User ${userId}.`);
            return res.status(404).json({ error: 'Anhang nicht gefunden oder gehört nicht zum Benutzer.' });
        }

        const deleteSql = 'DELETE FROM attachments WHERE id = ? AND user_id = ?';
        db.run(deleteSql, [attachmentId, userId], function (deleteErr) {
            if (deleteErr) {
                console.error(`Fehler beim Löschen des DB-Eintrags für Anhang ${attachmentId} (User ${userId}):`, deleteErr.message);
                return res.status(500).json({ error: `Fehler beim Löschen des Datenbankeintrags: ${deleteErr.message}` });
            }

            if (this.changes > 0) {
                console.log(`Anhang ${attachmentId} (User ${userId}) erfolgreich aus DB gelöscht.`);
                if (attachment.filename) {
                    const absoluteFilePath = path.join(UPLOAD_DIR, attachment.filename);
                    fs.unlink(absoluteFilePath, (unlinkErr) => {
                         if (unlinkErr && unlinkErr.code !== 'ENOENT') {
                            console.error(`Fehler beim Löschen der Datei ${absoluteFilePath} für gelöschten Anhang ${attachmentId}:`, unlinkErr);
                        } else if (!unlinkErr) {
                            console.log(`Datei ${absoluteFilePath} passend zu Anhang ${attachmentId} gelöscht.`);
                        }
                    });
                }
                res.json({ message: 'Anhang erfolgreich gelöscht', taskId: attachment.task_id, attachmentId: parseInt(attachmentId) });
            } else {
                console.warn(`Löschen von Anhang ${attachmentId} (User ${userId}) in DB fehlgeschlagen, obwohl er vorher gefunden wurde.`);
                res.status(404).json({ error: 'Anhang nicht gefunden (beim DB-Löschvorgang).' });
            }
        });
    });
});

// === Server Start ===
app.listen(PORT, HOST, () => {
    console.log('bald wird es Mittagspause')
    console.log(`Server läuft auf http://${HOST}:${PORT}`);
    console.log(`Uploads werden bereitgestellt unter http://localhost:${PORT}/uploads`);
    console.log(`Uploads werden gespeichert in: ${UPLOAD_DIR}`);
});

// Graceful Shutdown
process.on('SIGINT', () => {
    console.log('\nServer wird heruntergefahren...');
    db.close((err) => {
        if (err) {
            console.error("Fehler beim Schließen der Datenbank:", err.message);
        } else {
            console.log('Datenbankverbindung erfolgreich geschlossen.');
        }
        process.exit(0);
    });
});