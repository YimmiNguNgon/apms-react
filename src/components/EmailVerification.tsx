import React, { useEffect, useState } from 'react';
import { loginApi } from '../API/loginApi';

export const EmailVerification: React.FC<{ ticket: string; email?: string; emailDelivered?: boolean; emailDeliveryMessage?: string; onVerified: () => void }> = ({ ticket: initialTicket, email, emailDelivered, emailDeliveryMessage, onVerified }) => {
  const [ticket, setTicket] = useState(initialTicket);
  const [delivery, setDelivery] = useState({ emailDelivered, emailDeliveryMessage });
  const [otp, setOtp] = useState('');
  const [seconds, setSeconds] = useState(300);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  useEffect(() => { const id = window.setInterval(() => setSeconds((value) => Math.max(0, value - 1)), 1000); return () => window.clearInterval(id); }, []);
  const masked = email || 'your email address';
  const submit = async (event: React.FormEvent) => { event.preventDefault(); setError(''); setLoading(true); try { await loginApi.verifyEmailOtp(ticket, otp); setNotice('Email verified successfully. Please sign in again.'); window.setTimeout(onVerified, 1200); } catch (e) { setError(e instanceof Error ? e.message : 'Verification failed.'); } finally { setLoading(false); } };
  const resend = async () => { setError(''); setLoading(true); try { const result = await loginApi.resendEmailOtp(ticket); setTicket(result.verificationTicket); setDelivery({ emailDelivered: result.emailDelivered, emailDeliveryMessage: result.emailDeliveryMessage }); setSeconds(300); setOtp(''); setNotice('A new verification code was sent.'); } catch (e) { setError(e instanceof Error ? e.message : 'Could not resend code.'); } finally { setLoading(false); } };
  return <div className="login-page"><div className="login-wrapper"><form className="login-card" onSubmit={submit}><div className="login-form-title">Xác nhận Email</div><p>Mã xác nhận đã được gửi đến: <strong>{masked}</strong></p>{delivery.emailDelivered === false && <div className="form-error">Không thể gửi mã xác nhận đến email của bạn. Vui lòng thử lại sau.</div>}<div className="form-field"><label className="form-label">Mã xác nhận</label><input className="form-input" inputMode="numeric" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} /></div>{error && <div className="form-error">{error}</div>}{notice && <div className="workspace-inline-note">{notice}</div>}<button className="btn btn-primary btn-block" disabled={loading || otp.length !== 6}>{loading ? 'Đang xử lý...' : 'Xác nhận'}</button><p>Mã có hiệu lực: {String(Math.floor(seconds / 60)).padStart(2, '0')}:{String(seconds % 60).padStart(2, '0')}</p><button type="button" className="btn btn-outline btn-block" disabled={loading || seconds > 240} onClick={resend}>Gửi lại mã</button></form></div></div>;
};
