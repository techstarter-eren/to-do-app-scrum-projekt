import { useEffect, useState } from 'react';
import './App.css';

function App() {
    const [tasks, setTasks] = useState([]);
    const [title, setTitle] = useState("");
    const [theme, setTheme] = useState('light'); // Standardmäßig helles Theme

    useEffect(() => {
        fetch("http://localhost:3050/liste_abrufen")
            .then((res) => res.json())
            .then(data => setTasks(data.map(task => ({ ...task, isEditingDeadline: false, deadlineInput: task.deadline || '', isEditingNote: false, noteInput: task.note || '' }))));
        document.body.className = theme === 'dark' ? 'dark-mode' : ''; // CSS-Klasse beim Mounten setzen
    }, [theme]); // Abhängigkeit von theme, damit die Klasse bei Theme-Änderung aktualisiert wird

    const toggleTheme = () => {
        setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
    };

    const itemHinzufuegen = () => {
        if (!title.trim()) {
            return;
        }

        fetch("http://localhost:3050/add", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title, completed: false }),
        })
            .then((res) => res.json())
            .then((neueAufgabe) => setTasks([...tasks, { ...neueAufgabe, isEditingDeadline: false, deadlineInput: '', isEditingNote: false, noteInput: '' }]));

        setTitle("");
    };

    const itemLoeschen = (id_nummer) => {
        fetch(`http://localhost:3050/delete/${id_nummer}`, {
            method: "DELETE",
        }).then(() => {
            setTasks(tasks.filter(task => task.id !== id_nummer));
        });
    };

    const taskStatusAktualisieren = (id_nummer, completed) => {
        fetch(`http://localhost:3050/update/${id_nummer}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ completed: !completed }),
        }).then(() => {
            setTasks(tasks.map(task =>
                task.id === id_nummer ? { ...task, completed: !completed } : task
            ));
        });
    };

    const handleDeadlineInputChange = (id, event) => {
        setTasks(tasks.map(task =>
            task.id === id ? { ...task, deadlineInput: event.target.value } : task
        ));
    };

    const handleSetDeadline = (id) => {
        const taskToUpdate = tasks.find(task => task.id === id);
        if (taskToUpdate) {
            fetch(`http://localhost:3050/set-deadline/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ deadline: taskToUpdate.deadlineInput }),
            })
                .then(res => res.json())
                .then(data => {
                    setTasks(tasks.map(task =>
                        task.id === id ? { ...task, deadline: data.deadline, isEditingDeadline: false } : task
                    ));
                })
                .catch(error => console.error('Fehler beim Setzen der Deadline:', error));
        }
    };

    const toggleEditDeadline = (id) => {
        setTasks(tasks.map(task =>
            task.id === id ? { ...task, isEditingDeadline: !task.isEditingDeadline, deadlineInput: task.deadline || '' } : task
        ));
    };

    const handleNoteInputChange = (id, event) => {
        setTasks(tasks.map(task =>
            task.id === id ? { ...task, noteInput: event.target.value } : task
        ));
    };

    const handleSetNote = (id) => {
        const taskToUpdate = tasks.find(task => task.id === id);
        if (taskToUpdate) {
            fetch(`http://localhost:3050/set-note/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ note: taskToUpdate.noteInput }),
            })
                .then(res => res.json())
                .then(data => {
                    setTasks(tasks.map(task =>
                        task.id === id ? { ...task, note: data.note, isEditingNote: false } : task
                    ));
                })
                .catch(error => console.error('Fehler beim Setzen der Notiz:', error));
        }
    };

    const toggleEditNote = (id) => {
        setTasks(tasks.map(task =>
            task.id === id ? { ...task, isEditingNote: !task.isEditingNote, noteInput: task.note || '' } : task
        ));
    };

    return (
        <>
            <button onClick={toggleTheme}>
                {theme === 'light' ? 'Zum dunklen Modus wechseln' : 'Zum hellen Modus wechseln'}
            </button>
            <h1>To-Do List</h1>
            <input value={title} onChange={(e) => setTitle(e.target.value)} />
            <button disabled={!title.trim()} onClick={itemHinzufuegen}>Add</button>

            <ul>
                {tasks.map(({ id, title, completed, deadline, isEditingDeadline, deadlineInput, note, isEditingNote, noteInput }) => (
                    <li key={id} className={completed ? "completed" : ""}>
                        <input
                            type='checkbox'
                            checked={completed}
                            onChange={() => taskStatusAktualisieren(id, completed)}
                        />
                        {title}
                        {!isEditingDeadline ? (
                            <>
                                {deadline && <span className="deadline">Deadline: {deadline}</span>}
                                <button onClick={() => toggleEditDeadline(id)}>Deadline setzen</button>
                            </>
                        ) : (
                            <div>
                                <input
                                    type="datetime-local"
                                    value={deadlineInput}
                                    onChange={(e) => handleDeadlineInputChange(id, e)}
                                />
                                <button onClick={() => handleSetDeadline(id)}>Speichern</button>
                                <button onClick={() => toggleEditDeadline(id)}>Abbrechen</button>
                            </div>
                        )}
                        {!isEditingNote ? (
                            <>
                                {note && <div className="note">Notiz: {note}</div>}
                                <button onClick={() => toggleEditNote(id)}>Notiz hinzufügen</button>
                            </>
                        ) : (
                            <div className="note-input-container">
                                <textarea
                                    value={noteInput}
                                    onChange={(e) => handleNoteInputChange(id, e)}
                                    placeholder="Notiz eingeben..."
                                />
                                <button onClick={() => handleSetNote(id)}>Speichern</button>
                                <button onClick={() => toggleEditNote(id)}>Abbrechen</button>
                            </div>
                        )}
                        <button onClick={() => itemLoeschen(id)}>X</button>
                    </li>
                ))}
            </ul>
        </>
    );
}

export default App;