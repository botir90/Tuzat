import { useMutation } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import type { AdminLoginResponse } from '@usta/shared';
import { adminApi, session } from '../api';
import { Button, ErrorBox } from '../components/ui';

export function LoginPage({ onLogin }: { onLogin: (username: string) => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const login = useMutation({
    mutationFn: () =>
      adminApi<AdminLoginResponse>('/admin/auth/login', {
        method: 'POST',
        body: { username: username.trim(), password },
      }),
    onSuccess: (data) => {
      session.set(data.token);
      onLogin(data.username);
    },
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    login.mutate();
  }

  return (
    <div className="login">
      <form className="card login-card" onSubmit={submit}>
        <h1>Admin panel</h1>
        <label>
          Login
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            autoFocus
            required
          />
        </label>
        <label>
          Parol
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        <ErrorBox error={login.error} />
        <Button type="submit" disabled={login.isPending}>
          {login.isPending ? 'Kirilmoqda…' : 'Kirish'}
        </Button>
      </form>
    </div>
  );
}
