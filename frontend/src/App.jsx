import { useEffect, useState } from 'react';
import './App.css';

function App() {
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState("");
  const [darkMode, setDarkMode] = useState(false);

  // Dark Mode initialisieren
  useEffect(() => {
    document.body.className = darkMode ? 'dark-mode' : '';
  }, [darkMode]);

  useEffect(() => {
    fetch("http://localhost:3050/liste_abrufen")
      .then((res) => res.json())
      .then(setTasks);
  }, []);

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
      .then((neueAufgabe) => setTasks([...tasks, neueAufgabe]));

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

  return (
    <div className={`container ${darkMode ? 'dark' : ''}`}>
      <div className="header">
        <h1>To-Do List</h1>
        <button onClick={() => setDarkMode(!darkMode)} className="mode-toggle">
          {darkMode ? '☀️' : '🌙'}
        </button>
      </div>
      
      <div className="input-group">
        <input 
          value={title}  
          onChange={(e)=>setTitle(e.target.value)} 
          placeholder="Neue Aufgabe..."
        />
        <button disabled={!title.trim()} onClick={itemHinzufuegen}>Add</button>
      </div>

      <ul className="task-list">
        {tasks.map(({id, title, completed}) => (
          <li key={id}>
            <input type='checkbox' checked={completed} onChange={() => taskStatusAktualisieren(id, completed)} />
            <span 
              className={`task-text ${completed ? 'completed' : 'pending'}`}
              style={{
                color: completed ? '#0a680a' : '#971313', // Dunkelgrün für erledigt, Dunkelrot für ausstehend
                fontWeight: 'bold'
              }}
            >
              {title}
            </span>
            <button onClick={() => itemLoeschen(id)}>X</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;