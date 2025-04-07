import { useEffect, useState } from 'react';
import './App.css';

function App() {
  // -------------------------------
  // State Management
  // -------------------------------
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState("");
  const [darkMode, setDarkMode] = useState(false);
  const [deadline, setDeadline] = useState("");
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [authView, setAuthView] = useState('login');
  const [authError, setAuthError] = useState("");
  const [authData, setAuthData] = useState({
    username: "",
    password: ""
  });

  // -------------------------------
  // Dark Mode Handling
  // -------------------------------
  useEffect(() => {
    document.body.className = darkMode ? 'dark-mode' : '';
  }, [darkMode]);

  // -------------------------------
  // Authentifizierung
  // -------------------------------
  useEffect(() => {
    if (token) {
      fetch("http://localhost:3050/me", {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => {
          if (!res.ok) throw new Error('Nicht autorisiert');
          return res.json();
        })
        .then(data => {
          setUser(data.user);
          loadTasks();
        })
        .catch(() => logout());
    }
  }, [token]);

  const loadTasks = () => {
    fetch("http://localhost:3050/liste_abrufen", {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then((res) => {
        if (!res.ok) throw new Error('Fehler beim Laden der Aufgaben');
        return res.json();
      })
      .then(setTasks)
      .catch((error) => console.error("Fehler:", error));
  };

  const handleAuthChange = (e) => {
    setAuthData({
      ...authData,
      [e.target.name]: e.target.value
    });
  };

  const register = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch("http://localhost:3050/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(authData),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Registrierung fehlgeschlagen');
      setAuthView('login');
      setAuthError("");
    } catch (error) {
      setAuthError(error.message);
    }
  };

  const login = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch("http://localhost:3050/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(authData),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Login fehlgeschlagen');
      
      localStorage.setItem('token', data.token);
      setToken(data.token);
      setUser({ username: data.username });
      setAuthError("");
    } catch (error) {
      setAuthError(error.message);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setTasks([]);
  };

  // -------------------------------
  // Aufgabenverwaltung
  // -------------------------------
  const itemHinzufuegen = () => {
    if (!title.trim()) return;

    fetch("http://localhost:3050/add", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ title, completed: false, deadline: deadline || null }),
    })
      .then((res) => res.json())
      .then((neueAufgabe) => setTasks([...tasks, neueAufgabe]))
      .catch((error) => console.error("Fehler beim Hinzufügen einer Aufgabe:", error));

    setTitle("");
    setDeadline("");
  };

  const itemLoeschen = (id_nummer) => {
    fetch(`http://localhost:3050/delete/${id_nummer}`, {
      method: "DELETE",
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(() => {
        setTasks((prevTasks) => prevTasks.filter(task => task.id !== id_nummer));
      })
      .catch((error) => console.error("Fehler beim Löschen einer Aufgabe:", error));
  };

  const taskStatusAktualisieren = (id_nummer, completed) => {
    fetch(`http://localhost:3050/update/${id_nummer}`, {
      method: "PUT",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ completed: !completed }),
    })
      .then(() => {
        setTasks((prevTasks) =>
          prevTasks.map(task =>
            task.id === id_nummer ? { ...task, completed: !completed } : task
          )
        );
      })
      .catch((error) => console.error("Fehler beim Aktualisieren des Status:", error));
  };

  const notizAktualisieren = (id_nummer, note) => {
    fetch(`http://localhost:3050/update_note/${id_nummer}`, {
      method: "PUT",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ note }),
    })
      .then(() => {
        setTasks((prevTasks) =>
          prevTasks.map(task =>
            task.id === id_nummer ? { ...task, note } : task
          )
        );
      })
      .catch((error) => console.error("Fehler beim Aktualisieren der Notiz:", error));
  };

  // -------------------------------
  // UI Rendering
  // -------------------------------
  if (!user) {
    return (
      <div className={`auth-container ${darkMode ? 'dark' : ''}`}>
        <div className="auth-box">
          <div className="auth-tabs">
            <button 
              onClick={() => setAuthView('login')} 
              className={authView === 'login' ? 'active' : ''}
            >
              Login
            </button>
            <button 
              onClick={() => setAuthView('register')} 
              className={authView === 'register' ? 'active' : ''}
            >
              Registrieren
            </button>
          </div>
          
          {authError && <div className="auth-error">{authError}</div>}
          
          <form onSubmit={authView === 'login' ? login : register}>
            <input
              type="text"
              name="username"
              placeholder="Benutzername"
              value={authData.username}
              onChange={handleAuthChange}
              required
            />
            <input
              type="password"
              name="password"
              placeholder="Passwort"
              value={authData.password}
              onChange={handleAuthChange}
              required
            />
            <button type="submit">
              {authView === 'login' ? 'Einloggen' : 'Registrieren'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className={`container ${darkMode ? 'dark' : ''}`}>
      <div className="header">
        <h1>To-Do List - Hallo {user.username}</h1>
        <div>
          <button onClick={logout} className="logout-btn">Logout</button>
          <button onClick={() => setDarkMode(!darkMode)} className="mode-toggle">
            {darkMode ? '☀️' : '🌙'}
          </button>
        </div>
      </div>
      
      <div className="input-group">
        <input 
          value={title}  
          onChange={(e) => setTitle(e.target.value)} 
          placeholder="Neue Aufgabe..."
        />
        <input
          type="datetime-local"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
          placeholder="Deadline festlegen"
        />
        <button disabled={!title.trim()} onClick={itemHinzufuegen}>Add</button>
      </div>

      <ul className="task-list">
        {tasks.map(({ id, title, completed, deadline, note }) => (
          <li key={id}>
            <input type='checkbox' checked={completed} onChange={() => taskStatusAktualisieren(id, completed)} />
            <span 
              className={`task-text ${completed ? 'completed' : 'pending'}`}
              style={{
                color: completed ? '#006400' : '#8B0000',
                fontWeight: 'bold'
              }}
            >
              {title}
            </span> 
            <em style={{ marginLeft: '10px' }}>
              Deadline: {deadline ? new Date(deadline).toLocaleString() : "Keine"}
            </em>
            <textarea 
              value={note || ""}
              placeholder="Notiz hinzufügen..."
              onChange={(e) => notizAktualisieren(id, e.target.value)}
              style={{ width: "100%", minHeight: "40px", marginTop: "8px" }}
            />
            <button onClick={() => itemLoeschen(id)}>X</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;