import { useEffect, useState } from 'react';
import './App.css';

function App() {
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [deadline, setDeadline] = useState("");
  const [darkMode, setDarkMode] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  useEffect(() => {
    document.body.className = darkMode ? 'dark-mode' : '';
  }, [darkMode]);

  useEffect(() => {
    fetch("http://localhost:3050/categories")
      .then((res) => res.json())
      .then(setCategories)
      .catch((error) => console.error("Fehler beim Laden der Kategorien:", error));
  }, []);

  useEffect(() => {
    if (selectedCategory) {
      fetch(`http://localhost:3050/tasks/${selectedCategory}`)
        .then((res) => res.json())
        .then(setTasks)
        .catch((error) => console.error("Fehler beim Laden der Aufgaben:", error));
    }
  }, [selectedCategory]);

  const itemHinzufuegen = () => {
    if (!title.trim() || !selectedCategory) {
      return;
    }

    fetch("http://localhost:3050/add_task", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, completed: false, deadline, note, category_id: selectedCategory }),
    })
      .then((res) => res.json())
      .then((neueAufgabe) => setTasks([...tasks, neueAufgabe]))
      .catch((error) => console.error("Fehler beim Hinzufügen einer Aufgabe:", error));

    setTitle("");
    setDeadline("");
    setNote("");
  };

  const categoryHinzufuegen = () => {
    if (!newCategoryName.trim()) return;

    fetch("http://localhost:3050/add_category", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newCategoryName }),
    })
      .then((res) => res.json())
      .then((neueKategorie) => setCategories([...categories, neueKategorie]))
      .catch((error) => console.error("Fehler beim Hinzufügen einer Kategorie:", error));

    setNewCategoryName("");
  };

  const categoryLoeschen = (id) => {
    fetch(`http://localhost:3050/delete_category/${id}`, { method: "DELETE" })
      .then(() => setCategories((prevCategories) => prevCategories.filter(cat => cat.id !== id)))
      .catch((error) => console.error("Fehler beim Löschen einer Kategorie:", error));
  };

  return (
    <div className={`container ${darkMode ? 'dark' : ''}`}>
      <div className="header">
        <h1>To-Do List</h1>
        <button onClick={() => setDarkMode(!darkMode)} className="mode-toggle">
          {darkMode ? '☀️' : '🌙'}
        </button>
      </div>

      <div className="category-selection">
        <h2>Kategorie auswählen</h2>
        <div className="category-buttons">
          {categories.map((category) => (
            <div key={category.id} className="category-item">
              <button onClick={() => setSelectedCategory(category.id)}>
                {category.name}
              </button>
              <button onClick={() => categoryLoeschen(category.id)} className="delete-button">🗑️</button>
            </div>
          ))}
        </div>

        {selectedCategory ? (
          <button onClick={() => setSelectedCategory(null)}>Zurück zur Kategorie-Auswahl</button>
        ) : (
          <>
            <input value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder="Neue Kategorie..." />
            <button onClick={categoryHinzufuegen}>Kategorie hinzufügen</button>
          </>
        )}
      </div>

      {selectedCategory && (
        <>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Neue Aufgabe..." />
          <input type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} placeholder="Deadline festlegen" />
          <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Notiz hinzufügen..." />
          <button disabled={!title.trim()} onClick={itemHinzufuegen}>Add</button>

          <ul className="task-list">
            {tasks.map(({ id, title, completed, deadline, note }) => (
              <li key={id}>
                <span className={`task-text ${completed ? 'completed' : 'pending'}`}>{title}</span>
                <p>Deadline: {deadline ? new Date(deadline).toLocaleString() : "Keine"}</p>
                <textarea value={note || ""} onChange={(e) => setNote(e.target.value)} placeholder="Notiz bearbeiten..."></textarea>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

export default App;