import React, { useState, useEffect, useRef, useCallback } from 'react'
import { AppIcon, MailIcon, LockIcon } from '../../icons'
import './LoginPage.css'

export default function LoginPage() {
  const [step, setStep] = useState('credentials') // 'credentials' | 'otp' | 'success'
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(true)

  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', ''])
  const [maskedEmail, setMaskedEmail] = useState('')
  const [expiresAt, setExpiresAt] = useState(null)
  const [remainingSeconds, setRemainingSeconds] = useState(180)
  const [cooldownSeconds, setCooldownSeconds] = useState(30)
  const [attemptsRemaining, setAttemptsRemaining] = useState(5)
  const [isLocked, setIsLocked] = useState(false)

  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [isShaking, setIsShaking] = useState(false)

  const otpInputsRef = useRef([])

  const csrfToken = (window.DJANGO_CONTEXT && window.DJANGO_CONTEXT.csrfToken) ||
    document.querySelector('[name=csrfmiddlewaretoken]')?.value ||
    document.cookie.split('; ').find(row => row.startsWith('csrftoken='))?.split('=')[1] || ''

  const nextUrl = (window.DJANGO_CONTEXT && window.DJANGO_CONTEXT.nextUrl) || '/admin/dashboard/'

  /* ── Live Countdown Timer ── */
  useEffect(() => {
    if (step !== 'otp' || !expiresAt) return

    const updateTimer = () => {
      const now = new Date().getTime()
      const expiry = new Date(expiresAt).getTime()
      const diff = Math.max(0, Math.floor((expiry - now) / 1000))
      setRemainingSeconds(diff)
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [step, expiresAt])

  /* ── Resend Cooldown Timer ── */
  useEffect(() => {
    if (step !== 'otp' || cooldownSeconds <= 0) return

    const interval = setInterval(() => {
      setCooldownSeconds(prev => Math.max(0, prev - 1))
    }, 1000)
    return () => clearInterval(interval)
  }, [step, cooldownSeconds])

  /* ── Trigger Error Shake ── */
  const triggerShake = () => {
    setIsShaking(true)
    setTimeout(() => setIsShaking(false), 400)
  }

  /* ── Step 1: Submit Credentials ── */
  const handleCredentialsSubmit = async (e) => {
    if (e) e.preventDefault()
    setErrorMessage('')

    if (!identifier.trim() || !password) {
      setErrorMessage('Please enter your username/email and password.')
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch('/api/admin/login/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken,
        },
        credentials: 'include',
        body: JSON.stringify({
          username: identifier.trim(),
          password: password,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Unable to sign in with those credentials.')
      }

      if (data.status === 'pending_otp') {
        setMaskedEmail(data.masked_email || 'your registered email')
        setExpiresAt(data.expires_at)
        setRemainingSeconds(data.expires_in_seconds || 180)
        setCooldownSeconds(data.resend_cooldown_seconds || 30)
        setAttemptsRemaining(data.attempts_remaining || 5)
        setOtpDigits(['', '', '', '', '', ''])
        setIsLocked(false)
        setStep('otp')

        // Focus first OTP box after state transition
        setTimeout(() => {
          if (otpInputsRef.current[0]) {
            otpInputsRef.current[0].focus()
          }
        }, 100)
      } else if (data.authenticated || data.success) {
        // Fallback if directly authenticated
        setStep('success')
        setTimeout(() => {
          window.location.href = data.first_allowed_url || nextUrl || '/admin/dashboard/'
        }, 800)
      }
    } catch (err) {
      setErrorMessage(err.message || 'Unable to sign in with those credentials.')
      triggerShake()
    } finally {
      setIsLoading(false)
    }
  }

  /* ── Step 2: Submit 6-Digit OTP ── */
  const handleOtpSubmit = useCallback(async (codeToVerify) => {
    const fullCode = codeToVerify || otpDigits.join('')
    if (fullCode.length !== 6 || !/^\d{6}$/.test(fullCode)) {
      setErrorMessage('Please enter all 6 digits of your security code.')
      return
    }

    setErrorMessage('')
    setIsLoading(true)

    try {
      const res = await fetch('/api/admin/verify-otp/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken,
        },
        credentials: 'include',
        body: JSON.stringify({ otp: fullCode }),
      })

      const data = await res.json()
      if (!res.ok) {
        if (data.attempts_remaining !== undefined) {
          setAttemptsRemaining(data.attempts_remaining)
        }
        if (data.is_locked) {
          setIsLocked(true)
        }
        throw new Error(data.error || 'Security verification failed.')
      }

      // Successful OTP Verification
      setStep('success')
      try {
        sessionStorage.setItem('adminVisitActive', 'true')
      } catch (e) {}

      setTimeout(() => {
        window.location.href = data.first_allowed_url || nextUrl || '/admin/dashboard/'
      }, 900)
    } catch (err) {
      setErrorMessage(err.message || "That security code didn't match. Check the code and try again.")
      triggerShake()
      // Clear boxes and focus first box on failure
      setOtpDigits(['', '', '', '', '', ''])
      if (otpInputsRef.current[0]) {
        otpInputsRef.current[0].focus()
      }
    } finally {
      setIsLoading(false)
    }
  }, [otpDigits, csrfToken, nextUrl])

  /* ── OTP Input Box Handlers ── */
  const handleOtpChange = (index, value) => {
    // Only accept numeric digit
    const cleaned = value.replace(/\D/g, '')
    if (!cleaned && value !== '') return

    const newDigits = [...otpDigits]
    newDigits[index] = cleaned ? cleaned[cleaned.length - 1] : ''
    setOtpDigits(newDigits)
    setErrorMessage('')

    if (cleaned && index < 5) {
      otpInputsRef.current[index + 1]?.focus()
    }

    // If 6th digit entered, auto submit
    if (cleaned && index === 5) {
      const fullCode = newDigits.join('')
      if (fullCode.length === 6) {
        handleOtpSubmit(fullCode)
      }
    }
  }

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (!otpDigits[index] && index > 0) {
        const newDigits = [...otpDigits]
        newDigits[index - 1] = ''
        setOtpDigits(newDigits)
        otpInputsRef.current[index - 1]?.focus()
      } else {
        const newDigits = [...otpDigits]
        newDigits[index] = ''
        setOtpDigits(newDigits)
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      otpInputsRef.current[index - 1]?.focus()
    } else if (e.key === 'ArrowRight' && index < 5) {
      otpInputsRef.current[index + 1]?.focus()
    }
  }

  const handleOtpPaste = (e) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').trim().replace(/\D/g, '')
    if (!pastedData) return

    const digits = pastedData.slice(0, 6).split('')
    const newDigits = ['', '', '', '', '', '']
    digits.forEach((d, idx) => {
      if (idx < 6) newDigits[idx] = d
    })
    setOtpDigits(newDigits)

    const focusIdx = Math.min(digits.length, 5)
    otpInputsRef.current[focusIdx]?.focus()

    if (digits.length >= 6) {
      handleOtpSubmit(digits.slice(0, 6).join(''))
    }
  }

  /* ── Resend OTP ── */
  const handleResendOtp = async () => {
    if (cooldownSeconds > 0 || isLoading || isLocked) return
    setErrorMessage('')
    setIsLoading(true)

    try {
      const res = await fetch('/api/admin/resend-otp/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken,
        },
        credentials: 'include',
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to resend security code.')
      }

      setExpiresAt(data.expires_at)
      setRemainingSeconds(data.expires_in_seconds || 180)
      setCooldownSeconds(data.resend_cooldown_seconds || 30)
      setAttemptsRemaining(data.attempts_remaining || 5)
      setOtpDigits(['', '', '', '', '', ''])
      if (otpInputsRef.current[0]) {
        otpInputsRef.current[0].focus()
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to resend security code.')
      triggerShake()
    } finally {
      setIsLoading(false)
    }
  }

  /* ── Return to Credentials ── */
  const handleBackToSignIn = () => {
    setStep('credentials')
    setErrorMessage('')
    setOtpDigits(['', '', '', '', '', ''])
    setIsLocked(false)
  }

  const formatTimer = (secs) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  return (
    <div className="login-container">
      <h1 className="header-title">Welcome to <span>Moxie</span> Admin Dashboard</h1>

      <div className={`login-card ${isShaking ? 'shake-card' : ''}`}>
        {step === 'credentials' && (
          <>
            <h2 className="card-heading">Welcome Back! 👋</h2>
            <p className="card-sub">Sign in to your admin account</p>

            {errorMessage && (
              <div className="errornote" role="alert">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleCredentialsSubmit} id="admin-login-form">
              <div className="form-group">
                <span className="form-icon">
                  <AppIcon icon={MailIcon} size={18} />
                </span>
                <input
                  type="text"
                  id="admin-username"
                  name="username"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Username or email address"
                  autoComplete="username"
                  required
                  autoFocus
                  disabled={isLoading}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '16px' }}>
                <span className="form-icon">
                  <AppIcon icon={LockIcon} size={18} />
                </span>
                <input
                  type="password"
                  id="admin-password"
                  name="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="row-options">
                <label className="checkbox-container">
                  <input
                    type="checkbox"
                    name="remember_me"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  Remember me
                </label>
                <a href="#" className="forgot-link" onClick={(e) => { e.preventDefault(); setErrorMessage('Please contact a Super Admin to reset your account password.') }}>
                  Forgot Password?
                </a>
              </div>

              <button type="submit" className="submit-btn" disabled={isLoading}>
                {isLoading ? 'Verifying Credentials...' : 'Sign In \u2192'}
              </button>
            </form>
          </>
        )}

        {step === 'otp' && (
          <div className="otp-verification-container">
            <h2 className="card-heading">VERIFY YOUR IDENTITY</h2>
            <p className="card-sub">
              We sent a 6-digit security code to<br />
              <strong className="otp-masked-email">{maskedEmail}</strong>
            </p>

            {errorMessage && (
              <div className="errornote" role="alert">
                {errorMessage}
              </div>
            )}

            {remainingSeconds <= 0 && !isLocked && (
              <div className="errornote" role="alert">
                This security code has expired. Request a new code or return to sign in.
              </div>
            )}

            <form onSubmit={(e) => { e.preventDefault(); handleOtpSubmit(); }}>
              {/* 6 OTP Input Boxes */}
              <div className="otp-boxes-wrapper" onPaste={handleOtpPaste}>
                {otpDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => (otpInputsRef.current[idx] = el)}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    className={`otp-digit-box ${digit ? 'filled' : ''} ${errorMessage ? 'error' : ''}`}
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    disabled={isLoading || isLocked || remainingSeconds <= 0}
                    aria-label={`Digit ${idx + 1} of verification code`}
                    autoComplete="one-time-code"
                  />
                ))}
              </div>

              {/* Countdown & Attempts Info */}
              <div className="otp-meta-info">
                <div className="otp-expiry-timer">
                  Code expires in <strong>{formatTimer(remainingSeconds)}</strong>
                </div>
                <div className="otp-attempts-info">
                  Attempts remaining: <strong>{attemptsRemaining}</strong>
                </div>
              </div>

              <button
                type="submit"
                className="submit-btn"
                disabled={isLoading || isLocked || remainingSeconds <= 0 || otpDigits.join('').length !== 6}
                style={{ marginTop: '16px' }}
              >
                {isLoading ? 'Verifying Code...' : 'VERIFY & SIGN IN \u2192'}
              </button>

              {/* Resend Cooldown & Link */}
              <div className="otp-resend-row">
                {cooldownSeconds > 0 ? (
                  <span className="resend-cooldown-text">
                    Resend code in <strong>00:{String(cooldownSeconds).padStart(2, '0')}</strong>
                  </span>
                ) : (
                  <button
                    type="button"
                    className="resend-otp-btn"
                    onClick={handleResendOtp}
                    disabled={isLoading || isLocked}
                  >
                    Resend OTP
                  </button>
                )}
              </div>

              {/* Back to Sign In */}
              <div className="otp-back-row">
                <button
                  type="button"
                  className="back-to-signin-btn"
                  onClick={handleBackToSignIn}
                >
                  &larr; Back to Sign In
                </button>
              </div>
            </form>
          </div>
        )}

        {step === 'success' && (
          <div className="otp-success-container">
            <div className="otp-boxes-wrapper">
              {otpDigits.map((digit, idx) => (
                <div key={idx} className="otp-digit-box success">
                  {digit || '\u2713'}
                </div>
              ))}
            </div>

            <div className="otp-success-badge">
              <span className="success-icon">&#10003;</span>
              <h3>Identity Verified</h3>
            </div>
            <p className="card-sub" style={{ marginTop: '8px' }}>
              Redirecting to Admin Dashboard...
            </p>
          </div>
        )}
      </div>

      <p className="footer-text">
        Need help? Contact <a href="mailto:support@moxiestore.com">support@moxiestore.com</a>
      </p>
    </div>
  )
}

