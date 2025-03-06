import { useState } from 'react'
import './App.css'

function App() {
  const [tasks, setTasks] = [];

  useEffect(() => {
    fetch("http://localhost:3050/liste_abrufen")
    .then((res) => res.json())
    .then(setTasks);
  });
  

  return (
    <>
      <h1>To-Do List</h1>
      <input />
      <button>Add</button>
      <ul>
        {// hier gehört der Code, um die To-Do Liste dynamisch zu gestalten
        tasks.map(({id, title, completed}) => {
          <li>
            <input type='checkbox' /> {title}
          </li>
        })
               
        
        }
        <li> <input type="checkbox" />NodeJS Lernen <button>X</button></li>
      </ul>
    </>
  )
}

export default App
