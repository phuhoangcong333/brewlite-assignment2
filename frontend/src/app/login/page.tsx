'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError('');
    setLoading(true);

    try {
      const API_URL =
        process.env.NEXT_PUBLIC_API_URL ??
        'http://localhost:3001';

      const response = await fetch(
        `${API_URL}/auth/login`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            password,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Đăng nhập thất bại');
      }

      localStorage.setItem('access_token', data.access_token);

      router.push('/');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Không thể kết nối đến server',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-full bg-blue-500 flex items-center justify-center text-3xl">
            ☕
          </div>
        </div>

        <h1 className="text-3xl font-bold text-center text-gray-800">
          BrewLite
        </h1>

        <p className="text-center text-gray-500 mt-2 mb-8">
          Đăng nhập tài khoản
        </p>

        <form onSubmit={handleLogin} className="space-y-5">
          
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-semibold text-gray-700 mb-2"
            >
              Email
            </label>

            <input
              id="email"
              type="email"
              placeholder="Nhập email của bạn"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-semibold text-gray-700 mb-2"
            >
              Mật khẩu
            </label>

            <input
              id="password"
              type="password"
              placeholder="Nhập mật khẩu"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-bold py-3 rounded-lg transition"
          >
            {loading ? 'Đang đăng nhập...' : 'ĐĂNG NHẬP'}
          </button>
        </form>

        <p className="text-center text-gray-500 text-sm mt-6">
          Chưa có tài khoản?{' '}
          <button
            type="button"
            onClick={() => router.push('/register')}
            className="text-blue-500 font-semibold hover:underline"
          >
            Đăng ký
          </button>
        </p>
      </div>
    </main>
  );
}