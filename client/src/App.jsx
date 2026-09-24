import { useEffect, useState } from 'react';

const apiUrl = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

function getApiUrl(path) {
  const url = new URL(`${apiUrl}${path}`, window.location.origin);
  const previewToken = new URLSearchParams(window.location.search).get('airoShareToken');
  if (previewToken && url.origin === window.location.origin) {
    url.searchParams.set('airoShareToken', previewToken);
  }
  return url.toString();
}

async function callApi(path, options) {
  const response = await fetch(getApiUrl(path), {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error(
      `API returned ${response.status} ${response.statusText} instead of JSON. Check the GoDaddy Node startup file and VITE_API_URL.`
    );
  }
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Request failed');
  }
  return data;
}

function App() {
  const [users, setUsers] = useState([]);
  const [name, setName] = useState('');
  const [status, setStatus] = useState({ type: '', text: '' });
  const [loadingUsers, setLoadingUsers] = useState(true);

  async function loadUsers() {
    setLoadingUsers(true);
    try {
      const data = await callApi('/api/users');
      setUsers(data.users);
    } catch (error) {
      setStatus({ type: 'error', text: error.message });
    } finally {
      setLoadingUsers(false);
    }
  }

  async function testEndpoint(path, successMessage) {
    try {
      await callApi(path);
      setStatus({ type: 'success', text: successMessage });
    } catch (error) {
      setStatus({ type: 'error', text: error.message });
    }
  }

  async function addUser(event) {
    event.preventDefault();
    if (!name.trim()) {
      setStatus({ type: 'error', text: 'Enter a name first.' });
      return;
    }

    try {
      await callApi('/api/users', {
        method: 'POST',
        body: JSON.stringify({ name })
      });
      setName('');
      setStatus({ type: 'success', text: 'User added successfully.' });
      await loadUsers();
    } catch (error) {
      setStatus({ type: 'error', text: error.message });
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  return (
    <main className="page-shell">
      <section className="app-panel">
        <p className="eyebrow">Connection check</p>
        <h1>GoDaddy MySQL Test</h1>
        <p className="intro">Verify the path from React to Express to your Hosted MySQL database.</p>

        <div className="actions">
          <button type="button" onClick={() => testEndpoint('/api/health', 'Backend is working.')}>Test Backend</button>
          <button type="button" onClick={() => testEndpoint('/api/db-test', 'Database connection succeeded.')}>Test Database</button>
        </div>

        {status.text && <p className={`status ${status.type}`}>{status.text}</p>}

        <form className="add-user" onSubmit={addUser}>
          <label htmlFor="name">Test user name</label>
          <div className="form-row">
            <input
              id="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength="100"
              placeholder="Ada Lovelace"
            />
            <button type="submit">Add User</button>
          </div>
        </form>

        <section className="users-section" aria-live="polite">
          <div className="section-heading">
            <h2>Users in test_users</h2>
            <button className="refresh" type="button" onClick={loadUsers}>Refresh</button>
          </div>
          {loadingUsers ? <p className="muted">Loading users...</p> : users.length === 0 ? <p className="muted">No users yet.</p> : (
            <ul>
              {users.map((user) => <li key={user.id}><strong>#{user.id}</strong><span>{user.name}</span><time>{new Date(user.created_at).toLocaleString()}</time></li>)}
            </ul>
          )}
        </section>
      </section>
    </main>
  );
}

export default App;
