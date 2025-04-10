import { useEffect, useState } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import './App.css';

function App() {
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
  const [taskAttachments, setTaskAttachments] = useState({});

  useEffect(() => {
    document.body.className = darkMode ? 'dark-mode' : '';
  }, [darkMode]);

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

  const loadAttachmentsForTasks = async (taskIds) => {
    const attachmentsMap = {};
    for (const taskId of taskIds) {
      try {
        const response = await fetch(`http://localhost:3050/attachments/${taskId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        attachmentsMap[taskId] = data;
      } catch (error) {
        console.error(`Fehler beim Laden der Anhänge für Task ${taskId}:`, error);
        attachmentsMap[taskId] = [];
      }
    }
    setTaskAttachments(attachmentsMap);
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(tasks);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setTasks(items);

    const updates = items.map((task, index) => ({
      id: task.id,
      position: index
    }));

    fetch("http://localhost:3050/update_positions", {
      method: "PUT",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ updates })
    }).catch(error => console.error("Fehler beim Aktualisieren der Positionen:", error));
  };

  const loadTasks = () => {
    fetch("http://localhost:3050/liste_abrufen", {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then((res) => {
        if (!res.ok) throw new Error('Fehler beim Laden der Aufgaben');
        return res.json();
      })
      .then((tasks) => {
        setTasks(tasks);
        loadAttachmentsForTasks(tasks.map(t => t.id));
      })
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
    setTaskAttachments({});
  };

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
      .then((neueAufgabe) => {
        setTasks([...tasks, neueAufgabe]);
        setTaskAttachments({...taskAttachments, [neueAufgabe.id]: []});
      })
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
        const updatedAttachments = {...taskAttachments};
        delete updatedAttachments[id_nummer];
        setTaskAttachments(updatedAttachments);
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

  const FileUpload = ({ taskId, onUploadSuccess }) => {
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState(null);

    const handleFileChange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        setError('Nur PDF, JPEG, JPG und PNG Dateien sind erlaubt');
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        setError('Datei ist zu groß (max. 10MB)');
        return;
      }

      setIsUploading(true);
      setError(null);

      const formData = new FormData();
      formData.append('file', file);

      try {
        const response = await fetch(`http://localhost:3050/upload/${taskId}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });

        if (!response.ok) {
          throw new Error(await response.text());
        }

        const data = await response.json();
        onUploadSuccess(data);
      } catch (err) {
        setError(err.message || 'Fehler beim Hochladen der Datei');
      } finally {
        setIsUploading(false);
      }
    };

    return (
      <div className="file-upload">
        <label className="upload-button">
          {isUploading ? 'Wird hochgeladen...' : 'Datei hinzufügen'}
          <input 
            type="file" 
            onChange={handleFileChange}
            accept=".pdf,.jpg,.jpeg,.png"
            style={{ display: 'none' }}
            disabled={isUploading}
          />
        </label>
        {error && <div className="upload-error">{error}</div>}
      </div>
    );
  };

  const AttachmentPreview = ({ attachment, onDelete }) => {
    const [isDeleting, setIsDeleting] = useState(false);
    const [showModal, setShowModal] = useState(false);

    const handleDelete = async () => {
      setIsDeleting(true);
      try {
        await onDelete(attachment.id);
      } catch (error) {
        console.error('Fehler beim Löschen:', error);
      } finally {
        setIsDeleting(false);
      }
    };

    const isImage = attachment.filetype.startsWith('image/');

    return (
      <div className="attachment-preview">
        {isImage ? (
          <>
            <img 
              src={`http://localhost:3050${attachment.url}`} 
              alt={attachment.filename}
              onClick={() => setShowModal(true)}
              className="thumbnail"
            />
            {showModal && (
              <div className="modal-overlay" onClick={() => setShowModal(false)}>
                <div className="modal-content" onClick={e => e.stopPropagation()}>
                  <img 
                    src={`http://localhost:3050${attachment.url}`} 
                    alt={attachment.filename}
                    className="modal-image"
                  />
                  <button 
                    className="modal-close"
                    onClick={() => setShowModal(false)}
                  >
                    ×
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="pdf-preview" onClick={() => window.open(`http://localhost:3050${attachment.url}`, '_blank')}>
            <div className="pdf-icon">PDF</div>
            <span>{attachment.filename.substring(0, 15)}...</span>
          </div>
        )}
        
        <button 
          onClick={handleDelete} 
          disabled={isDeleting}
          className="delete-attachment"
        >
          {isDeleting ? 'Löschen...' : '×'}
        </button>
      </div>
    );
  };

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

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="tasks">
          {(provided) => (
            <ul 
              className="task-list" 
              {...provided.droppableProps} 
              ref={provided.innerRef}
            >
              {tasks.map((task, index) => (
                <Draggable key={task.id} draggableId={String(task.id)} index={index}>
                  {(provided) => (
                    <li 
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                    >
                      <div className="drag-handle">⋮⋮</div>

      <ul className="task-list">
        {tasks.map((task) => (
          <li key={task.id}>
            <input 
              type='checkbox' 
              checked={task.completed} 
              onChange={() => taskStatusAktualisieren(task.id, task.completed)} 
            />
            <span 
              className={`task-text ${task.completed ? 'completed' : 'pending'}`}
              style={{
                color: task.completed ? '#006400' : '#8B0000',
                fontWeight: 'bold'
              }}
            >
              {task.title}
            </span>
            <em style={{ marginLeft: '10px' }}>
              Deadline: {task.deadline ? new Date(task.deadline).toLocaleString() : "Keine"}
            </em>
            <textarea 
              value={task.note || ""}
              placeholder="Notiz hinzufügen..."
              onChange={(e) => notizAktualisieren(task.id, e.target.value)}
              style={{ width: "100%", minHeight: "40px", marginTop: "8px" }}
            />
            
            <div className="attachments-container">
              {(taskAttachments[task.id] || []).map(attachment => (
                <AttachmentPreview
                  key={attachment.id}
                  attachment={attachment}
                  onDelete={async (attachmentId) => {
                    try {
                      const response = await fetch(`http://localhost:3050/attachment/${attachmentId}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${token}` }
                      });
                      
                      if (!response.ok) {
                        throw new Error('Löschen fehlgeschlagen');
                      }
                      
                      setTaskAttachments(prev => ({
                        ...prev,
                        [task.id]: prev[task.id].filter(a => a.id !== attachmentId)
                      }));
                    } catch (error) {
                      console.error('Fehler beim Löschen:', error);
                    }
                  }}
                />
              ))}
              
              <FileUpload 
                taskId={task.id} 
                onUploadSuccess={(newAttachment) => {
                  setTaskAttachments(prev => ({
                    ...prev,
                    [task.id]: [...(prev[task.id] || []), newAttachment]
                  }));
                }} 
              />
            </div>
            
            <button onClick={() => itemLoeschen(task.id)}>X</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;