import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import Modal from 'react-modal';
import { FaMoon, FaSun, FaPlus, FaTrash, FaEdit, FaSave, FaTimes, FaSyncAlt, FaFileUpload, FaFile, FaFilePdf, FaImage } from 'react-icons/fa'; // Icons hinzugefügt/aktualisiert

import './App.css'; // Stelle sicher, dass die CSS-Datei importiert wird

const API_BASE_URL = 'http://localhost:3050'; // Deine Backend-URL

Modal.setAppElement('#root'); // Für Barrierefreiheit

function App() {
    const [tasks, setTasks] = useState([]);
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [newTaskDeadline, setNewTaskDeadline] = useState('');
    const [newTaskNote, setNewTaskNote] = useState('');
    const [newTaskCategory, setNewTaskCategory] = useState(''); // Kategorie State
    const [categories, setCategories] = useState(['Arbeit', 'Privat', 'Einkauf']); // Beispiel-Kategorien
    const [newCategoryInput, setNewCategoryInput] = useState(''); // Für neue Kategorie im Formular

    // Recurring Task States
    const [isRecurring, setIsRecurring] = useState(false);
    const [recurrenceType, setRecurrenceType] = useState('daily');
    const [recurrenceInterval, setRecurrenceInterval] = useState(1);
    const [recurrenceStartDate, setRecurrenceStartDate] = useState('');
    const [recurrenceEndDate, setRecurrenceEndDate] = useState('');

    const [editingTaskId, setEditingTaskId] = useState(null);
    const [editingText, setEditingText] = useState('');
    const [editingNote, setEditingNote] = useState(''); // State für Notiz-Bearbeitung
    const [editingDeadline, setEditingDeadline] = useState(''); // State für Deadline-Bearbeitung

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [authError, setAuthError] = useState('');
    const [taskError, setTaskError] = useState(''); // Fehler für Task-Operationen

    // Auth States
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoginView, setIsLoginView] = useState(true);
    const [loggedInUser, setLoggedInUser] = useState(null); // { userId, username }

    // File Upload States
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploadingTaskId, setUploadingTaskId] = useState(null);
    const fileInputRef = useRef(null); // Ref für Datei-Input

    // Image Modal States
    const [modalIsOpen, setModalIsOpen] = useState(false);
    const [modalImageSrc, setModalImageSrc] = useState('');

    // Theme State
    const [isDarkMode, setIsDarkMode] = useState(() => {
        const savedTheme = localStorage.getItem('theme');
        return savedTheme === 'dark';
    });

    // --- NEU: Heutiges Datum für min Attribut ---
    const getTodayString = () => {
        const today = new Date();
        const offset = today.getTimezoneOffset();
        const adjustedToday = new Date(today.getTime() - (offset*60*1000));
        return adjustedToday.toISOString().split('T')[0];
    };
    const todayStr = getTodayString(); // Wird im Date Input verwendet

    // --- Theme Effekt ---
    useEffect(() => {
        if (isDarkMode) {
            document.body.classList.add('dark-mode');
            localStorage.setItem('theme', 'dark');
        } else {
            document.body.classList.remove('dark-mode');
            localStorage.setItem('theme', 'light');
        }
    }, [isDarkMode]);

    const toggleTheme = () => {
        setIsDarkMode(!isDarkMode);
    };

    // --- Authentifizierungs-Effekt ---
    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            try {
                const user = JSON.parse(storedUser);
                setLoggedInUser(user);
                console.log("Benutzer aus localStorage geladen:", user);
            } catch (e) {
                console.error("Fehler beim Parsen des Benutzers aus localStorage:", e);
                localStorage.removeItem('user');
            }
        }
    }, []);

    // --- Task Lade-Effekt (wenn User eingeloggt) ---
    const fetchTasks = useCallback(async () => {
        if (!loggedInUser?.userId) {
            setTasks([]); // Keine Tasks laden, wenn nicht eingeloggt
            return;
        }
        setIsLoading(true);
        setError('');
        setTaskError(''); // Task-spezifischen Fehler zurücksetzen
        console.log(`Rufe Aufgaben für User ${loggedInUser.userId} ab...`);
        try {
            const response = await axios.get(`${API_BASE_URL}/liste_abrufen`, {
                params: { userId: loggedInUser.userId }
            });
            console.log("Aufgaben erfolgreich abgerufen:", response.data);
            setTasks(response.data || []); // Stelle sicher, dass es ein Array ist
        } catch (err) {
            console.error('Fehler beim Abrufen der Aufgaben:', err);
            const message = err.response?.data?.error || err.message || 'Unbekannter Fehler beim Laden der Aufgaben.';
            setError(message);
        } finally {
            setIsLoading(false);
        }
    }, [loggedInUser]); // Abhängig vom loggedInUser

    useEffect(() => {
        fetchTasks();
    }, [fetchTasks]); // Ruft fetchTasks auf, wenn sich loggedInUser ändert


    // --- Authentifizierungs-Handler ---
    const handleAuthAction = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setAuthError('');
        const url = isLoginView ? `${API_BASE_URL}/login` : `${API_BASE_URL}/register`;
        try {
            console.log(`${isLoginView ? 'Login' : 'Registrierung'} Versuch für: ${username}`);
            const response = await axios.post(url, { username, password });
            const userData = response.data; // Enthält { userId, username, message }
            console.log(`${isLoginView ? 'Login' : 'Registrierung'} erfolgreich:`, userData);
            setLoggedInUser({ userId: userData.userId, username: userData.username });
            localStorage.setItem('user', JSON.stringify({ userId: userData.userId, username: userData.username })); // Speichere User im localStorage
            setUsername(''); // Felder leeren
            setPassword('');
            // fetchTasks() wird automatisch durch den useEffect aufgerufen
        } catch (err) {
            console.error(`Fehler bei ${isLoginView ? 'Login' : 'Registrierung'}:`, err);
            const message = err.response?.data?.error || err.message || `Unbekannter Fehler bei ${isLoginView ? 'Login' : 'Registrierung'}.`;
            setAuthError(message);
            setLoggedInUser(null); // Sicherstellen, dass kein User gesetzt ist
            localStorage.removeItem('user'); // User aus localStorage entfernen
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogout = () => {
        console.log("Benutzer wird ausgeloggt.");
        setLoggedInUser(null);
        localStorage.removeItem('user');
        setTasks([]); // Taskliste leeren
        setError('');
        setAuthError('');
        setTaskError('');
        // Optional: Zur Login-Ansicht wechseln
        setIsLoginView(true);
    };


    // --- Task Handler ---
    const handleAddTask = async (e) => {
        e.preventDefault();
        if (!newTaskTitle.trim() || !loggedInUser?.userId) {
            setTaskError("Titel ist erforderlich und Sie müssen eingeloggt sein.");
            return;
        }
        setIsLoading(true);
        setTaskError(''); // Fehler zurücksetzen
        setError('');

        const taskData = {
            title: newTaskTitle.trim(),
            deadline: newTaskDeadline || null, // Sende YYYY-MM-DD oder null
            note: newTaskNote.trim() || null,
            category: newTaskCategory || null,
            userId: loggedInUser.userId,
            recurring: isRecurring,
            // Sende Recurring-Daten nur, wenn isRecurring true ist
            ...(isRecurring && {
                recurrence_type: recurrenceType,
                recurrence_interval: recurrenceInterval,
                recurrence_start_date: recurrenceStartDate || null,
                recurrence_end_date: recurrenceEndDate || null,
            })
        };

        console.log("Sende neue Aufgabe:", taskData);

        try {
            const response = await axios.post(`${API_BASE_URL}/add`, taskData);
            console.log("Aufgabe erfolgreich hinzugefügt:", response.data);
            // Füge die neue Aufgabe *an den Anfang* der korrekten Gruppe (offen/erledigt)
            // Da die Liste bereits sortiert ist, können wir nicht einfach pushen.
            // Einfacher ist es, die Liste neu zu laden.
            await fetchTasks(); // Lädt die Liste neu inkl. der neuen Aufgabe in korrekter Sortierung

            // Reset form fields
            setNewTaskTitle('');
            setNewTaskDeadline('');
            setNewTaskNote('');
            setNewTaskCategory('');
            setIsRecurring(false); // Reset recurring checkbox and related fields
            setRecurrenceType('daily');
            setRecurrenceInterval(1);
            setRecurrenceStartDate('');
            setRecurrenceEndDate('');
        } catch (err) {
            console.error('Fehler beim Hinzufügen der Aufgabe:', err);
            const message = err.response?.data?.error || err.message || 'Unbekannter Fehler beim Hinzufügen der Aufgabe.';
            setTaskError(message); // Zeige Fehler im Task-Bereich
        } finally {
            setIsLoading(false);
        }
    };

    const handleToggleComplete = async (task) => {
        if (!loggedInUser?.userId) return;
        const originalCompleted = task.completed;
        // Optimistisches Update
        setTasks(tasks.map(t =>
            t.id === task.id ? { ...t, completed: t.completed ? 0 : 1 } : t
        ));
        // Liste neu sortieren im Frontend (optional, aber gut für sofortiges Feedback)
        // WICHTIG: Dies muss die *gleiche* Logik wie im Backend verwenden
        setTasks(prevTasks => [...prevTasks].sort((a, b) => {
            if (a.completed !== b.completed) {
                return a.completed - b.completed; // 0 (offen) vor 1 (erledigt)
            }
            // Innerhalb der gleichen Gruppe (beide offen oder beide erledigt)
            return new Date(a.created_at) - new Date(b.created_at); // Älteste zuerst
        }));


        try {
            await axios.put(`${API_BASE_URL}/update/${task.id}`, {
                completed: !originalCompleted,
                userId: loggedInUser.userId
            });
            // Kein erneutes Laden nötig dank optimistischem Update & Sortierung
        } catch (err) {
            console.error('Fehler beim Aktualisieren des Task-Status:', err);
            setError('Konnte den Task-Status nicht ändern.');
            // Rollback bei Fehler
            setTasks(tasks.map(t =>
                t.id === task.id ? { ...t, completed: originalCompleted } : t
            ));
             setTasks(prevTasks => [...prevTasks].sort((a, b) => {
                if (a.completed !== b.completed) {
                    return a.completed - b.completed;
                }
                return new Date(a.created_at) - new Date(b.created_at);
            }));
        }
    };

    const handleDeleteTask = async (taskId) => {
        if (!loggedInUser?.userId) return;
        if (!window.confirm('Sind Sie sicher, dass Sie diese Aufgabe und alle Anhänge löschen möchten?')) {
            return;
        }
        setIsLoading(true);
        setError('');
        try {
            await axios.delete(`${API_BASE_URL}/delete/${taskId}`, {
                data: { userId: loggedInUser.userId } // userId im Body senden
            });
            setTasks(tasks.filter(task => task.id !== taskId)); // Entferne aus dem State
        } catch (err) {
            console.error('Fehler beim Löschen der Aufgabe:', err);
            const message = err.response?.data?.error || err.message || 'Unbekannter Fehler beim Löschen der Aufgabe.';
            setError(message);
        } finally {
            setIsLoading(false);
        }
    };

    // --- Inline Editing Handler ---
    const startEditing = (task, field) => {
        setEditingTaskId(task.id);
        if (field === 'title') {
            setEditingText(task.title);
            setEditingNote(''); // Reset other editing fields
            setEditingDeadline('');
        } else if (field === 'note') {
            setEditingNote(task.note || '');
            setEditingText('');
            setEditingDeadline('');
        } else if (field === 'deadline') {
            // Format für input type="date" ist 'YYYY-MM-DD'
            setEditingDeadline(task.deadline ? task.deadline.split('T')[0] : '');
            setEditingText('');
            setEditingNote('');
        }
    };

    const cancelEditing = () => {
        setEditingTaskId(null);
        setEditingText('');
        setEditingNote('');
        setEditingDeadline('');
    };

    const handleUpdateTaskDetail = async (taskId, field, value) => {
        if (!loggedInUser?.userId) return;

        let url = '';
        let data = { userId: loggedInUser.userId };
        let originalValue;

        const taskToUpdate = tasks.find(t => t.id === taskId);
        if (!taskToUpdate) return;

        // Optimistisches Update vorbereiten
        const updatedTasks = tasks.map(t => {
            if (t.id === taskId) {
                return { ...t, [field]: value === '' && (field === 'note' || field === 'deadline') ? null : value };
            }
            return t;
        });

        if (field === 'title') {
            if (!value.trim()) {
                setError('Titel darf nicht leer sein.');
                cancelEditing();
                return;
            }
            // Titel-Update ist nicht implementiert im Backend - Füge hier Logik hinzu, falls benötigt
            console.warn("Titel-Update per Inline-Edit ist nicht implementiert.");
            setError("Titel kann derzeit nicht inline bearbeitet werden."); // Temporäre Meldung
            cancelEditing();
            return; // Frühzeitig beenden, da keine Backend-Route existiert
            // url = `${API_BASE_URL}/update-title/${taskId}`; // Beispielroute
            // data.title = value.trim();
            // originalValue = taskToUpdate.title;
        } else if (field === 'note') {
            url = `${API_BASE_URL}/set-note/${taskId}`;
            data.note = value.trim() || null; // Leere Notiz als null senden
            originalValue = taskToUpdate.note;
            setTasks(updatedTasks); // Optimistisches Update
        } else if (field === 'deadline') {
            // --- NEU: Client-seitige Datumsprüfung (zusätzlich zur Server-Prüfung) ---
            if (value && isPastDate(value)) {
                 setError('Das Zieldatum (Deadline) darf nicht in der Vergangenheit liegen.');
                 // Optional: Editing nicht abbrechen, damit User korrigieren kann
                 // cancelEditing();
                 return;
            }
             // --- Ende Datumsprüfung ---
            url = `${API_BASE_URL}/set-deadline/${taskId}`;
            data.deadline = value || null; // Leeres Datum als null senden
            originalValue = taskToUpdate.deadline;
            setTasks(updatedTasks); // Optimistisches Update
        } else {
            cancelEditing();
            return; // Unbekanntes Feld
        }

        cancelEditing(); // Bearbeitungsmodus beenden

        try {
             setError(''); // Eventuellen alten Fehler löschen
            await axios.put(url, data);
            // Erfolg, optimistisches Update war korrekt
        } catch (err) {
            console.error(`Fehler beim Aktualisieren von ${field}:`, err);
            const message = err.response?.data?.error || err.message || `Fehler beim Speichern von ${field}.`;
            setError(message);
            // Rollback bei Fehler
            setTasks(tasks.map(t => {
                 if (t.id === taskId) {
                    return { ...t, [field]: originalValue };
                }
                return t;
            }));
        }
    };

    // --- Kategorie Handler ---
    const handleAddCategory = () => {
        const newCat = newCategoryInput.trim();
        if (newCat && !categories.includes(newCat)) {
            setCategories([...categories, newCat]);
        }
        setNewCategoryInput(''); // Input leeren
    };

    // --- Anhang Handler ---
    const handleFileSelect = (event) => {
        setSelectedFile(event.target.files[0]);
    };

    const handleUploadAttachment = async (taskId) => {
        if (!selectedFile || !loggedInUser?.userId) {
            setError('Bitte wählen Sie eine Datei aus und stellen Sie sicher, dass Sie eingeloggt sind.');
            return;
        }
        setUploadingTaskId(taskId); // Zeige Upload-Indikator für diesen Task
        setError('');
        setIsLoading(true); // Genereller Ladeindikator

        const formData = new FormData();
        formData.append('attachmentFile', selectedFile);
        formData.append('userId', loggedInUser.userId); // userId mitsenden

        try {
            console.log(`Lade Anhang für Task ${taskId} hoch...`, selectedFile.name);
            const response = await axios.post(`${API_BASE_URL}/tasks/${taskId}/attachments`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            console.log('Anhang erfolgreich hochgeladen:', response.data);

            // Füge den neuen Anhang zum Task im State hinzu
            setTasks(tasks.map(task => {
                if (task.id === taskId) {
                    return {
                        ...task,
                        attachments: [...(task.attachments || []), response.data] // Füge neuen Anhang hinzu
                    };
                }
                return task;
            }));
            setSelectedFile(null); // Dateiauswahl zurücksetzen
            if (fileInputRef.current) {
                fileInputRef.current.value = ''; // Reset file input field
            }
        } catch (err) {
            console.error('Fehler beim Hochladen des Anhangs:', err);
            const message = err.response?.data?.error || err.message || 'Fehler beim Hochladen des Anhangs.';
            setError(message); // Zeige Fehler
        } finally {
            setUploadingTaskId(null); // Upload-Indikator entfernen
            setIsLoading(false); // Generellen Ladeindikator entfernen
        }
    };

     const handleDeleteAttachment = async (attachmentId, taskId) => {
        if (!loggedInUser?.userId) return;
        if (!window.confirm('Sind Sie sicher, dass Sie diesen Anhang löschen möchten?')) {
            return;
        }
        setIsLoading(true);
        setError('');
        try {
            await axios.delete(`${API_BASE_URL}/attachments/${attachmentId}`, {
                 data: { userId: loggedInUser.userId } // userId im Body senden
            });
            console.log(`Anhang ${attachmentId} für Task ${taskId} gelöscht.`);
            // Entferne Anhang aus dem State
            setTasks(tasks.map(task => {
                if (task.id === taskId) {
                    return {
                        ...task,
                        attachments: task.attachments.filter(att => att.id !== attachmentId)
                    };
                }
                return task;
            }));
        } catch (err) {
             console.error('Fehler beim Löschen des Anhangs:', err);
             const message = err.response?.data?.error || err.message || 'Fehler beim Löschen des Anhangs.';
             setError(message);
        } finally {
            setIsLoading(false);
        }
    };

    // --- Bild Modal Handler ---
    const openImageModal = (src) => {
        setModalImageSrc(src);
        setModalIsOpen(true);
    };

    const closeImageModal = () => {
        setModalIsOpen(false);
        setModalImageSrc('');
    };

    // --- Rendering ---
    const renderAttachment = (att) => {
        const fullPath = `${API_BASE_URL}${att.filepath}`;
        const isImage = att.mimetype.startsWith('image/');
        const isPdf = att.mimetype === 'application/pdf';

        return (
            <li key={att.id} className="attachment-item">
                {isImage ? (
                    <img
                        src={fullPath}
                        alt={att.original_filename}
                        className="attachment-thumbnail"
                        onClick={() => openImageModal(fullPath)}
                        title="Klicken zum Vergrößern"
                    />
                ) : isPdf ? (
                     <FaFilePdf className="pdf-icon" title="PDF Dokument" />
                ) : (
                     <FaFile className="file-icon" title="Datei" />
                )}
                <a href={fullPath} target="_blank" rel="noopener noreferrer" className="attachment-link" title={att.original_filename}>
                    {att.original_filename}
                </a>
                 <button
                    onClick={() => handleDeleteAttachment(att.id, att.task_id)}
                    className="delete-attachment-button"
                    title="Anhang löschen"
                    disabled={isLoading}
                >
                    <FaTimes />
                </button>
            </li>
        );
    };

    // --- Haupt-Return ---
    return (
        <>
          <button onClick={toggleTheme} className="theme-toggle-button" title="Theme wechseln">
                {isDarkMode ? <FaSun /> : <FaMoon />}
            </button>

            {loggedInUser ? (
                // Eingeloggter Bereich
                <>
                    <header className="header">
                        <h1>Meine Aufgaben</h1>
                        <div className="user-info">
                            <span>Hallo, <span className="username">{loggedInUser.username}</span>!</span>
                            <button onClick={handleLogout}>Logout</button>
                        </div>
                    </header>

                     {error && <p className="error-message">{error}</p>}
                     {/* {isLoading && <p className="loading-message">Lade...</p>} */}

                    {/* --- Aufgabe hinzufügen Formular --- */}
                    <section className="add-task-form">
                        <h2>Neue Aufgabe hinzufügen</h2>
                         {taskError && <p className="error-message">{taskError}</p>}
                        <form onSubmit={handleAddTask}>
                            <div>
                                <label htmlFor="new-task-title">Titel:</label>
                                <input
                                    type="text"
                                    id="new-task-title"
                                    value={newTaskTitle}
                                    onChange={(e) => setNewTaskTitle(e.target.value)}
                                    placeholder="Was muss erledigt werden?"
                                    required
                                />
                            </div>
                             <div>
                                <label htmlFor="new-task-deadline">Zieldatum:</label>
                                <input
                                    type="date"
                                    id="new-task-deadline"
                                    value={newTaskDeadline}
                                    onChange={(e) => setNewTaskDeadline(e.target.value)}
                                    // --- NEU: min Attribut setzt das früheste auswählbare Datum ---
                                    min={todayStr}
                                />
                            </div>
                             <div>
                                <label htmlFor="new-task-category">Kategorie:</label>
                                <select
                                    id="new-task-category"
                                    value={newTaskCategory}
                                    onChange={(e) => setNewTaskCategory(e.target.value)}
                                >
                                    <option value="">Keine Kategorie</option>
                                    {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                </select>
                                {/* Optional: Neue Kategorie hinzufügen */}
                                <div className="add-category-inline">
                                    <input
                                        type="text"
                                        value={newCategoryInput}
                                        onChange={(e) => setNewCategoryInput(e.target.value)}
                                        placeholder="Neue Kategorie..."
                                    />
                                    <button type="button" onClick={handleAddCategory}>+</button>
                                 </div>
                            </div>
                            <div>
                                <label htmlFor="new-task-note">Notiz:</label>
                                <textarea
                                    id="new-task-note"
                                    value={newTaskNote}
                                    onChange={(e) => setNewTaskNote(e.target.value)}
                                    placeholder="Zusätzliche Notizen..."
                                    rows={3}
                                ></textarea>
                            </div>

                             {/* --- Recurring Options --- */}
                            <div className="recurring-checkbox">
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={isRecurring}
                                        onChange={(e) => setIsRecurring(e.target.checked)}
                                    />
                                    Wiederkehrende Aufgabe
                                </label>
                            </div>

                            {isRecurring && (
                                <div className="recurring-options">
                                    <h4>Wiederholungsdetails</h4>
                                     <label>
                                        <span>Typ:</span>
                                        <select value={recurrenceType} onChange={(e) => setRecurrenceType(e.target.value)}>
                                            <option value="daily">Täglich</option>
                                            <option value="weekly">Wöchentlich</option>
                                            <option value="monthly">Monatlich</option>
                                        </select>
                                    </label>
                                    <label>
                                        <span>Intervall:</span>
                                        <input
                                            type="number"
                                            min="1"
                                            value={recurrenceInterval}
                                            onChange={(e) => setRecurrenceInterval(parseInt(e.target.value) || 1)}
                                         />
                                        <span>{` ${recurrenceType === 'daily' ? 'Tag(e)' : recurrenceType === 'weekly' ? 'Woche(n)' : 'Monat(e)'}`}</span>
                                    </label>
                                     <label>
                                        <span>Startdatum:</span>
                                        <input
                                            type="date"
                                            value={recurrenceStartDate}
                                            onChange={(e) => setRecurrenceStartDate(e.target.value)}
                                            // --- NEU: Auch hier min Datum setzen ---
                                            min={todayStr}
                                        />
                                    </label>
                                     <label>
                                        <span>Enddatum (optional):</span>
                                        <input
                                            type="date"
                                            value={recurrenceEndDate}
                                            onChange={(e) => setRecurrenceEndDate(e.target.value)}
                                            // --- NEU: min Datum, abhängig vom Startdatum oder heute ---
                                            min={recurrenceStartDate || todayStr}
                                        />
                                    </label>
                                </div>
                            )}
                            {/* --- Ende Recurring Options --- */}


                            <button type="submit" disabled={isLoading}>
                                {isLoading ? 'Speichern...' : 'Aufgabe hinzufügen'}
                            </button>
                        </form>
                    </section>

                    {/* --- Task Liste --- */}
                    <section className="task-list-section">
                        <h2>Aufgabenliste</h2>
                        {isLoading && tasks.length === 0 && <p className="loading-message">Lade Aufgaben...</p>}
                        {!isLoading && tasks.length === 0 && !error && <p>Keine Aufgaben vorhanden. Fügen Sie eine neue hinzu!</p>}

                        <ul className="task-list">
                            {tasks.map((task) => (
                                <li key={task.id} className={`task-item ${task.completed ? 'completed' : ''}`}>
                                    <div className="task-main">
                                        <input
                                            type="checkbox"
                                            className="task-checkbox"
                                            checked={!!task.completed}
                                            onChange={() => handleToggleComplete(task)}
                                            disabled={isLoading}
                                        />
                                        <span className="task-title">{task.title}</span>
                                         {task.category && <span className="task-category">{task.category}</span>}
                                        {task.recurring ? <FaSyncAlt className="task-recurring-icon" title="Wiederkehrende Aufgabe" /> : null}

                                        {/* Edit/Delete Buttons */}
                                        <button
                                             onClick={() => startEditing(task, 'title')}
                                             className="edit-button"
                                             title="Titel bearbeiten (noch nicht implementiert)"
                                             disabled={isLoading || editingTaskId === task.id} // Deaktivieren, wenn Titel-Edit nicht geht
                                         >
                                            {/* <FaEdit />  Optional Icon*/}
                                         </button>
                                         <button
                                            onClick={() => handleDeleteTask(task.id)}
                                            className="delete-button"
                                            title="Aufgabe löschen"
                                            disabled={isLoading}
                                        >
                                            <FaTrash />
                                        </button>
                                    </div>

                                    {/* --- Task Details & Inline Editing --- */}
                                    <div className="task-details">
                                        {/* Deadline */}
                                         <div className="detail-item">
                                            <strong>Fällig:</strong>
                                            {editingTaskId === task.id && editingDeadline !== null ? (
                                                 <div className="inline-edit-container">
                                                     <input
                                                         type="date"
                                                         value={editingDeadline}
                                                         onChange={(e) => setEditingDeadline(e.target.value)}
                                                         // --- NEU: min Attribut auch im Edit-Modus ---
                                                         min={todayStr}
                                                         autoFocus
                                                         onBlur={() => handleUpdateTaskDetail(task.id, 'deadline', editingDeadline)}
                                                         onKeyDown={(e) => e.key === 'Enter' && handleUpdateTaskDetail(task.id, 'deadline', editingDeadline)}
                                                     />
                                                     {/* Optional: Save/Cancel Buttons */}
                                                     <button onClick={() => handleUpdateTaskDetail(task.id, 'deadline', editingDeadline)} className='save-button' title='Speichern'>✓</button>
                                                    <button onClick={cancelEditing} className='cancel-button' title='Abbrechen'>✗</button>
                                                 </div>
                                            ) : (
                                                <>
                                                    <span className="detail-value">
                                                        {task.deadline ? new Date(task.deadline).toLocaleDateString('de-DE') : 'Kein Datum'}
                                                    </span>
                                                    <button
                                                         onClick={() => startEditing(task, 'deadline')}
                                                         className="edit-button"
                                                         title="Zieldatum ändern"
                                                         disabled={isLoading || editingTaskId === task.id}
                                                     >
                                                        <FaEdit />
                                                     </button>
                                                 </>
                                            )}
                                        </div>

                                        {/* Note */}
                                        <div className="detail-item">
                                            <strong>Notiz:</strong>
                                             {editingTaskId === task.id && editingNote !== null ? (
                                                 <div className="inline-edit-container">
                                                     <textarea
                                                         value={editingNote}
                                                         onChange={(e) => setEditingNote(e.target.value)}
                                                         autoFocus
                                                         onBlur={() => handleUpdateTaskDetail(task.id, 'note', editingNote)}
                                                          // Optional: Mit Shift+Enter speichern statt Zeilenumbruch
                                                         onKeyDown={(e) => {
                                                             if (e.key === 'Enter' && !e.shiftKey) {
                                                                 e.preventDefault(); // Verhindert Zeilenumbruch
                                                                 handleUpdateTaskDetail(task.id, 'note', editingNote);
                                                             } else if (e.key === 'Escape') {
                                                                 cancelEditing();
                                                             }
                                                         }}
                                                         rows={3}
                                                    />
                                                    {/* Optional: Save/Cancel Buttons */}
                                                     <button onClick={() => handleUpdateTaskDetail(task.id, 'note', editingNote)} className='save-button' title='Speichern'>✓</button>
                                                    <button onClick={cancelEditing} className='cancel-button' title='Abbrechen'>✗</button>
                                                 </div>
                                             ) : (
                                                 <>
                                                    <span className="detail-value note-value">
                                                        {task.note || <span style={{ fontStyle: 'italic', opacity: 0.7 }}>Keine Notiz</span>}
                                                    </span>
                                                     <button
                                                         onClick={() => startEditing(task, 'note')}
                                                         className="edit-button"
                                                         title="Notiz bearbeiten"
                                                         disabled={isLoading || editingTaskId === task.id}
                                                     >
                                                         <FaEdit />
                                                     </button>
                                                 </>
                                            )}
                                        </div>
                                        {/* Erstellungsdatum anzeigen */}
                                        <div className="detail-item">
                                             <strong>Erstellt:</strong>
                                             <span className="detail-value">
                                                {new Date(task.created_at).toLocaleString('de-DE')}
                                             </span>
                                        </div>
                                    </div>

                                    {/* --- Anhänge --- */}
                                    <div className="task-attachments">
                                        <h4>Anhänge</h4>
                                        {(!task.attachments || task.attachments.length === 0) ? (
                                            <p className="no-attachments">Keine Anhänge vorhanden.</p>
                                        ) : (
                                            <ul className="attachment-list">
                                                {task.attachments.map(renderAttachment)}
                                            </ul>
                                        )}
                                        <div className="add-attachment-section">
                                             <input
                                                type="file"
                                                onChange={handleFileSelect}
                                                ref={fileInputRef} // Verknüpfung mit Ref
                                                style={{ display: 'none' }} // Verstecke Standard-Input
                                                id={`file-input-${task.id}`} // Eindeutige ID
                                                disabled={isLoading || uploadingTaskId === task.id}
                                            />
                                             {/* Benutzerdefinierter Button, der den Input triggert */}
                                            <label htmlFor={`file-input-${task.id}`}>
                                                <button
                                                     type="button"
                                                     className="add-attachment-button"
                                                     onClick={() => fileInputRef.current?.click()} // Öffnet Dateiauswahl-Dialog
                                                     disabled={isLoading || uploadingTaskId === task.id}
                                                 >
                                                    <FaFileUpload /> Anhang auswählen...
                                                </button>
                                            </label>

                                            {selectedFile && uploadingTaskId !== task.id && ( // Zeige nur, wenn Datei gewählt, aber noch nicht für *diesen* Task hochgeladen wird
                                                 <button
                                                    type="button"
                                                    onClick={() => handleUploadAttachment(task.id)}
                                                    disabled={isLoading || !selectedFile || uploadingTaskId === task.id }
                                                    style={{ marginLeft: '10px' }}
                                                >
                                                     Jetzt hochladen
                                                 </button>
                                            )}
                                            {uploadingTaskId === task.id && (
                                                <span className="upload-indicator">Lädt hoch...</span>
                                            )}
                                             {selectedFile && uploadingTaskId !== task.id && ( // Zeige Dateinamen, wenn ausgewählt
                                                <span style={{ marginLeft: '10px', fontSize: '0.9em', fontStyle: 'italic'}}>({selectedFile.name})</span>
                                            )}
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </section>
                </>
            ) : (
                // Login/Register Bereich
                <section className="auth-section">
                    <h2>{isLoginView ? 'Login' : 'Registrieren'}</h2>
                    {authError && <p className="error-message">{authError}</p>}
                    <form onSubmit={handleAuthAction}>
                        <div>
                            <label htmlFor="username">Benutzername:</label>
                            <input
                                type="text"
                                id="username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="password">Passwort:</label>
                            <input
                                type="password"
                                id="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={isLoginView ? undefined : 6} // Mindestlänge nur bei Registrierung
                            />
                             {!isLoginView && <small>Mindestens 6 Zeichen.</small>}
                        </div>
                        <button type="submit" disabled={isLoading}>
                            {isLoading ? 'Wird verarbeitet...' : (isLoginView ? 'Login' : 'Registrieren')}
                        </button>
                    </form>
                    <p>
                        {isLoginView ? 'Noch kein Konto?' : 'Bereits registriert?'}
                        <button
                            className="link-button"
                            onClick={() => { setIsLoginView(!isLoginView); setAuthError(''); }}
                            disabled={isLoading}
                        >
                            {isLoginView ? 'Hier registrieren' : 'Hier einloggen'}
                        </button>
                    </p>
                </section>
            )}

            {/* Bild Modal */}
            <Modal
                isOpen={modalIsOpen}
                onRequestClose={closeImageModal}
                contentLabel="Bild vergrößert"
                className="image-modal"
                overlayClassName="image-modal-overlay"
            >
                <button onClick={closeImageModal} className="close-modal-button" title="Schließen">×</button>
                {modalImageSrc && <img src={modalImageSrc} alt="Vergrößerter Anhang" />}
            </Modal>
        </>
    );
}

export default App;