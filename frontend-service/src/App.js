import React, { useState, useEffect } from 'react';
import axios from 'axios';

function App() {
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState('');

  useEffect(() => {
    axios.get('http://localhost:3001/tasks').then(res => setTasks(res.data));
  }, []);

  const addTask = () => {
    axios.post('http://localhost:3001/tasks', { title: newTask }).then(() => {
      setNewTask('');
      window.location.reload(); // Simple refresh
    });
  };

  return (
    <div>
      <h1>Task Manager</h1>
      <input value={newTask} onChange={e => setNewTask(e.target.value)} />
      <button onClick={addTask}>Add Task</button>
      <ul>{tasks.map(task => <li key={task.id}>{task.title}</li>)}</ul>
    </div>
  );
}

export default App;