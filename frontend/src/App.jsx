import { useEffect, useState } from 'react';
import './App.css';

function App() {
    const [tasks, setTasks] = useState([]);
    const [title, setTitle] = useState("");
    const [theme, setTheme] = useState('light'); // Standardmäßig helles Theme
    const [isRecurring, setIsRecurring] = useState(false);
    const [recurrenceType, setRecurrenceType] = useState('daily'); // 'daily', 'weekly', 'monthly'
    const [recurrenceInterval, setRecurrenceInterval] = useState(1);
    const [recurrenceStartDate, setRecurrenceStartDate] = useState('');
    const [recurrenceEndDate, setRecurrenceEndDate] = useState('');
    const [categories, setCategories] = useState(['Arbeit', 'Privat', 'Einkaufen']); // Vordefinierte Kategorien
    const [selectedCategory, setSelectedCategory] = useState('');
    const [newCategory, setNewCategory] = useState('');
    const [isAddingNewCategory, setIsAddingNewCategory] = useState(false);

    useEffect(() => {
        fetch("http://localhost:3050/liste_abrufen")
            .then((res) => res.json())
            .then(data => setTasks(data.map(task => ({ ...task, isEditingDeadline: false, deadlineInput: task.deadline || '', isEditingNote: false, noteInput: task.note || '' }))));
        document.body.className = theme === 'dark' ? 'dark-mode' : '';
        console.log("useEffect triggered, theme is:", theme);
    }, [theme]);

    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
        console.log("Theme toggled:", newTheme);
    };

    const handleIsRecurringChange = (event) => {
        setIsRecurring(event.target.checked);
    };

    const handleRecurrenceTypeChange = (event) => {
        setRecurrenceType(event.target.value);
    };

    const handleRecurrenceIntervalChange = (event) => {
        setRecurrenceInterval(parseInt(event.target.value, 10));
    };

    const handleRecurrenceStartDateChange = (event) => {
        setRecurrenceStartDate(event.target.value);
    };

    const handleRecurrenceEndDateChange = (event) => {
        setRecurrenceEndDate(event.target.value);
    };
    const handleCategoryChange = (event) => {
        setSelectedCategory(event.target.value);
    };

    const handleNewCategoryChange = (event) => {
        setNewCategory(event.target.value);
    };

    const handleAddNewCategoryClick = () => {
        setIsAddingNewCategory(true);
    };

    const handleSaveNewCategory = () => {
        if (newCategory.trim() && !categories.includes(newCategory.trim())) {
            setCategories([...categories, newCategory.trim()]);
            setSelectedCategory(newCategory.trim());
            setNewCategory('');
            setIsAddingNewCategory(false);
            // Hier könntest du die neue Kategorie auch direkt im Backend speichern (später)
        }
        setIsAddingNewCategory(false);
    };

    const handleCancelNewCategory = () => {
        setNewCategory('');
        setIsAddingNewCategory(false);
    };

    const itemHinzufuegen = () => {
        if (!title.trim()) {
            return;
        }

        const newTaskData = {
            title,
            completed: false,
            category: selectedCategory, // Füge die ausgewählte Kategorie hinzu
            recurring: isRecurring ? 1 : 0,
            recurrence_type: isRecurring ? recurrenceType : null,
            recurrence_interval: isRecurring ? parseInt(recurrenceInterval, 10) : null,
            recurrence_start_date: isRecurring ? recurrenceStartDate : null,
            recurrence_end_date: isRecurring ? recurrenceEndDate : null,
        };

        fetch("http://localhost:3050/add", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newTaskData),
        })
            .then((res) => res.json())
            .then((neueAufgabe) => setTasks([...tasks, { ...neueAufgabe, isEditingDeadline: false, deadlineInput: '', isEditingNote: false, noteInput: '' }]));

        setTitle("");
        setSelectedCategory(''); // Reset selected category
        setIsRecurring(false);
        setRecurrenceType('daily');
        setRecurrenceInterval(1);
        setRecurrenceStartDate('');
        setRecurrenceEndDate('');
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
            <label>
                Kategorie:
                <select value={selectedCategory} onChange={handleCategoryChange}>
                    <option value="">-- Wähle eine Kategorie --</option>
                    {categories.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                    ))}
                    <option value="new-category" disabled={isAddingNewCategory}>
                        {isAddingNewCategory ? 'Neue Kategorie hinzufügen...' : '+ Neue Kategorie'}
                    </option>
                </select>
            </label>

            {selectedCategory === 'new-category' && !isAddingNewCategory && (
                <button type="button" onClick={handleAddNewCategoryClick}>Neue Kategorie erstellen</button>
            )}

            {isAddingNewCategory && (
                <div>
                    <input
                        type="text"
                        value={newCategory}
                        onChange={handleNewCategoryChange}
                        placeholder="Name der neuen Kategorie"
                    />
                    <button type="button" onClick={handleSaveNewCategory}>Speichern</button>
                    <button type="button" onClick={handleCancelNewCategory}>Abbrechen</button>
                </div>
            )}

            <label>
                <input
                    type="checkbox"
                    checked={isRecurring}
                    onChange={handleIsRecurringChange}
                />
                Wiederkehrende Aufgabe
            </label>

            {isRecurring && (
                <div className="recurring-options">
                    <label>
                        Wiederholungstyp:
                        <select value={recurrenceType} onChange={handleRecurrenceTypeChange}>
                            <option value="daily">Täglich</option>
                            <option value="weekly">Wöchentlich</option>
                            <option value="monthly">Monatlich</option>
                        </select>
                    </label>
                    <label>
                        Intervall:
                        <input
                            type="number"
                            value={recurrenceInterval}
                            onChange={handleRecurrenceIntervalChange}
                            min="1"
                        />
                    </label>
                    <label>
                        Startdatum:
                        <input
                            type="date"
                            value={recurrenceStartDate}
                            onChange={handleRecurrenceStartDateChange}
                        />
                    </label>
                    <label>
                        Enddatum (optional):
                        <input
                            type="date"
                            value={recurrenceEndDate}
                            onChange={handleRecurrenceEndDateChange}
                        />
                    </label>
                </div>
            )}

            <button disabled={!title.trim()} onClick={itemHinzufuegen}>Add</button>

            <ul>
                {tasks.map(({ id, title, completed, deadline, isEditingDeadline, deadlineInput, note, isEditingNote, noteInput, category }) => (
                    <li
                        key={id}
                        className={`${completed ? "completed" : ""} ${theme === 'dark' ? "dark-mode" : ""}`}
                    >
                        <input
                            type='checkbox'
                            checked={completed}
                            onChange={() => taskStatusAktualisieren(id, completed)}
                        />
                        {title}
                        {category && <span className="category">[{category}]</span>}
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