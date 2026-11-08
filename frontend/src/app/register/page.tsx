'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Kiểm tra từng điều kiện của mật khẩu
  const passwordRules = {
    minLength: password.length >= 8,
    upperCase: /[A-Z]/.test(password),
    lowerCase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
  };

  const passwordValid =
    passwordRules.minLength &&
    passwordRules.upperCase &&
    passwordRules.lowerCase &&
    passwordRules.number;

  async function handleRegister(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setMessage('');
    setError('');

    // Kiểm tra email
    if (!email.trim()) {
      setError('Vui lòng nhập email');
      return;
    }

    // Kiểm tra mật khẩu
    if (!passwordValid) {
      setError(
        'Mật khẩu chưa đáp ứng đủ các yêu cầu.',
      );
      return;
    }

    setLoading(true);

    try {
      const API_URL =
          process.env.NEXT_PUBLIC_API_URL ??
          'http://localhost:3001';

        const response = await fetch(
          `${API_URL}/auth/register`,
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
        throw new Error(
          Array.isArray(data.message)
            ? data.message.join(', ')
            : data.message || 'Đăng ký thất bại',
        );
      }

      setMessage('Đăng ký thành công!');

      setTimeout(() => {
        router.push('/login');
      }, 1000);
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
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f7f8fa',
        padding: '24px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '420px',
          background: '#ffffff',
          borderRadius: '20px',
          padding: '40px',
          boxSizing: 'border-box',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.08)',
        }}
      >
        {/* Logo */}
        <div
          style={{
            width: '64px',
            height: '64px',
            margin: '0 auto 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#2f80ed',
            borderRadius: '50%',
            fontSize: '30px',
          }}
        >
          ☕
        </div>

        {/* Tiêu đề */}
        <h1
          style={{
            margin: 0,
            textAlign: 'center',
            fontSize: '30px',
            fontWeight: 700,
            color: '#222222',
          }}
        >
          BrewLite
        </h1>

        <p
          style={{
            margin: '8px 0 30px',
            textAlign: 'center',
            color: '#777777',
          }}
        >
          Tạo tài khoản mới
        </p>

        {/* Form */}
        <form onSubmit={handleRegister}>
          {/* Email */}
          <div style={{ marginBottom: '20px' }}>
            <label
              htmlFor="email"
              style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: 600,
                color: '#000000',
                fontSize: '14px',
              }}
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
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '13px 14px',
                border: '1px solid #d9dce1',
                borderRadius: '10px',
                fontSize: '15px',
                outline: 'none',
                color: '#000000',
                backgroundColor: '#ffffff',
              }}
            />
          </div>

          {/* Mật khẩu */}
          <div style={{ marginBottom: '12px' }}>
            <label
              htmlFor="password"
              style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: 600,
                color: '#000000',
                fontSize: '14px',
              }}
            >
              Mật khẩu
            </label>

            <input
              id="password"
              type="password"
              placeholder="Nhập mật khẩu"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              required
              minLength={8}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '13px 14px',
                border:
                  password.length === 0
                    ? '1px solid #d9dce1'
                    : passwordValid
                      ? '1px solid #22c55e'
                      : '1px solid #ef4444',
                borderRadius: '10px',
                fontSize: '15px',
                outline: 'none',
                color: '#000000',
                backgroundColor: '#ffffff',
              }}
            />

            {/* Các điều kiện mật khẩu */}
            <div
              style={{
                marginTop: '10px',
                padding: '10px 12px',
                background: '#f8f9fb',
                borderRadius: '8px',
                fontSize: '12px',
                lineHeight: '1.8',
              }}
            >
              <div
                style={{
                  color:
                    passwordRules.minLength
                      ? '#16a34a'
                      : '#777777',
                }}
              >
                {passwordRules.minLength ? '✓' : '○'} Ít nhất 8
                ký tự
              </div>

              <div
                style={{
                  color:
                    passwordRules.upperCase
                      ? '#16a34a'
                      : '#777777',
                }}
              >
                {passwordRules.upperCase ? '✓' : '○'} Có ít
                nhất 1 chữ hoa
              </div>

              <div
                style={{
                  color:
                    passwordRules.lowerCase
                      ? '#16a34a'
                      : '#777777',
                }}
              >
                {passwordRules.lowerCase ? '✓' : '○'} Có ít
                nhất 1 chữ thường
              </div>

              <div
                style={{
                  color:
                    passwordRules.number
                      ? '#16a34a'
                      : '#777777',
                }}
              >
                {passwordRules.number ? '✓' : '○'} Có ít nhất
                1 chữ số
              </div>
            </div>
          </div>

          {/* Lỗi */}
          {error && (
            <div
              style={{
                marginTop: '16px',
                marginBottom: '16px',
                padding: '12px',
                borderRadius: '8px',
                background: '#fff1f1',
                color: '#d93025',
                fontSize: '14px',
              }}
            >
              {error}
            </div>
          )}

          {/* Thành công */}
          {message && (
            <div
              style={{
                marginBottom: '16px',
                padding: '12px',
                borderRadius: '8px',
                background: '#effaf3',
                color: '#1f9d55',
                fontSize: '14px',
              }}
            >
              {message}
            </div>
          )}

          {/* Button */}
          <button
            type="submit"
            disabled={loading || !passwordValid}
            style={{
              width: '100%',
              padding: '14px',
              border: 'none',
              borderRadius: '10px',
              background:
                loading || !passwordValid
                  ? '#93bff4'
                  : '#2f80ed',
              color: '#ffffff',
              fontSize: '15px',
              fontWeight: 700,
              cursor:
                loading || !passwordValid
                  ? 'not-allowed'
                  : 'pointer',
            }}
          >
            {loading ? 'ĐANG ĐĂNG KÝ...' : 'ĐĂNG KÝ'}
          </button>
        </form>

        {/* Chuyển sang Login */}
        <div
          style={{
            marginTop: '24px',
            textAlign: 'center',
            color: '#666666',
            fontSize: '14px',
          }}
        >
          Đã có tài khoản?{' '}
          <button
            type="button"
            onClick={() => router.push('/login')}
            style={{
              border: 'none',
              background: 'transparent',
              padding: 0,
              color: '#2f80ed',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Đăng nhập
          </button>
        </div>
      </div>
    </main>
  );
}