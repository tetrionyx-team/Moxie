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
  const [remainingSeconds, setRemainingSeconds] = useState(300)
  const [cooldownSeconds, setCooldownSeconds] = useState(60)
  const [attemptsRemaining, setAttemptsRemaining] = useState(5)
  const [isLocked, setIsLocked] = useState(false)

  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [isShaking, setIsShaking] = useState(false)
  const [isConverging, setIsConverging] = useState(false)
  const [isCenterOrbVisible, setIsCenterOrbVisible] = useState(false)
  const [isErrorOrb, setIsErrorOrb] = useState(false)
  const [isRippleAnimating, setIsRippleAnimating] = useState(false)
  const [isErrorRipple, setIsErrorRipple] = useState(false)
  const [isSpinning, setIsSpinning] = useState(false)
  const [isErrorShaking, setIsErrorShaking] = useState(false)
  const [isSuccessExiting, setIsSuccessExiting] = useState(false)

  const otpInputsRef = useRef([])
  const otpWrapperRef = useRef(null)

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
        throw new Error(data.error || 'Invalid admin credentials.')
      }

      if (data.status === 'pending_otp' || data.otp_required) {
        setMaskedEmail(data.masked_email || 'your registered email')
        setExpiresAt(data.expires_at)
        setRemainingSeconds(data.expires_in_seconds || 300)
        setCooldownSeconds(data.resend_cooldown_seconds || 60)
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

      const resData = await res.json()

      if (!res.ok) {
        // WRONG OTP ANIMATION:
        // 1. Fade out secondary text & expand container
        setIsConverging(true)

        // 2. Animate OTP boxes toward center in orbit formation with red warning styling
        if (otpWrapperRef.current) {
          const wrapperRect = otpWrapperRef.current.getBoundingClientRect()
          const targetX = wrapperRect.left + wrapperRect.width / 2
          const targetY = wrapperRect.top + wrapperRect.height / 2
          const orbitRadius = 68

          const n = otpInputsRef.current.length
          const configs = (n === 4) ? [
            { angle: -135, tilt: -14 },
            { angle: -45,  tilt: 16 },
            { angle: 135,  tilt: -12 },
            { angle: 45,   tilt: 18 }
          ] : [
            { angle: -140, tilt: -14 },
            { angle: -80,  tilt: 12 },
            { angle: -20,  tilt: -10 },
            { angle: 40,   tilt: 16 },
            { angle: 100,  tilt: -12 },
            { angle: 160,  tilt: 18 }
          ]

          otpInputsRef.current.forEach((box, i) => {
            if (!box) return
            const cfg = configs[i] || { angle: (i * (360 / n) - 90), tilt: (i % 2 === 0 ? -14 : 16) }
            const angleRad = cfg.angle * (Math.PI / 180)
            const circlePosX = targetX + orbitRadius * Math.cos(angleRad)
            const circlePosY = targetY + orbitRadius * Math.sin(angleRad)

            const boxRect = box.getBoundingClientRect()
            const boxCenterX = boxRect.left + boxRect.width / 2
            const boxCenterY = boxRect.top + boxRect.height / 2

            const deltaX = circlePosX - boxCenterX
            const deltaY = circlePosY - boxCenterY

            box.style.transition = 'transform 0.65s cubic-bezier(0.22, 1, 0.36, 1), border-color 0.4s ease, background-color 0.4s ease, box-shadow 0.4s ease, color 0.4s ease'
            box.style.borderColor = '#f43f5e'
            box.style.backgroundColor = '#fff1f2'
            box.style.boxShadow = '0 8px 24px rgba(244, 63, 94, 0.35)'
            box.style.borderRadius = '12px'
            box.style.color = '#e11d48'
            box.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(0.82) rotate(${cfg.tilt}deg)`
          })
        }

        // 3. 350ms: Soft Rose Center Orb Blooms In + Soft Ripple Rings + Gentle Wobble
        setTimeout(() => {
          setIsErrorOrb(true)
          setIsCenterOrbVisible(true)
          setIsErrorRipple(true)
          setIsRippleAnimating(true)
          setIsErrorShaking(true)
        }, 350)

        // 4. 1050ms: Fluidly float boxes back to horizontal positions with gentle elastic settlement
        setTimeout(() => {
          setIsCenterOrbVisible(false)
          setIsErrorOrb(false)
          setIsRippleAnimating(false)
          setIsErrorRipple(false)
          setIsErrorShaking(false)

          otpInputsRef.current.forEach((box) => {
            if (!box) return
            box.style.transition = 'transform 0.65s cubic-bezier(0.25, 1, 0.5, 1), border-radius 0.4s ease, background-color 0.4s ease, border-color 0.4s ease, box-shadow 0.4s ease, color 0.4s ease'
            box.style.transform = 'translate(0px, 0px) scale(1) rotate(0deg)'
            box.style.borderRadius = '12px'
            box.style.borderColor = '#f43f5e'
            box.style.backgroundColor = '#fff1f2'
            box.style.boxShadow = '0 0 0 2px rgba(244, 63, 94, 0.18)'
            box.style.color = '#0f172a'
          })

          setOtpDigits(['', '', '', '', '', ''])
          setErrorMessage(resData?.error || "That security code didn't match. Check the code and try again.")
          triggerShake()
        }, 1050)

        // 5. 1400ms: Smoothly restore UI elements, re-enable button & focus first box
        setTimeout(() => {
          setIsConverging(false)
          setIsLoading(false)

          if (resData?.attempts_remaining !== undefined) {
            setAttemptsRemaining(resData.attempts_remaining)
          }
          if (resData?.is_locked) {
            setIsLocked(true)
          } else {
            if (otpInputsRef.current[0]) otpInputsRef.current[0].focus()
          }
        }, 1400)

        return
      }

      // CORRECT OTP:
      try {
        sessionStorage.setItem('adminVisitActive', 'true')
      } catch (e) {}

      const destUrl = resData?.first_allowed_url || nextUrl || '/admin/dashboard/'

      // 0ms:
      // 1. Fade out secondary text & button
      setIsConverging(true)

      // 0–400ms: Move OTP boxes toward exact center with slight rotation, scale 0.82 (numbers kept visible)
      if (otpWrapperRef.current) {
        const wrapperRect = otpWrapperRef.current.getBoundingClientRect()
        const targetX = wrapperRect.left + wrapperRect.width / 2
        const targetY = wrapperRect.top + wrapperRect.height / 2
        const orbitRadius = 68 // px radius around 46px glowing center orb

        const n = otpInputsRef.current.length
        const configs = (n === 4) ? [
          { angle: -135, tilt: -14 }, // TOP-LEFT
          { angle: -45,  tilt: 16 },  // TOP-RIGHT
          { angle: 135,  tilt: -12 }, // BOTTOM-LEFT
          { angle: 45,   tilt: 18 }   // BOTTOM-RIGHT
        ] : [
          { angle: -140, tilt: -14 },
          { angle: -80,  tilt: 12 },
          { angle: -20,  tilt: -10 },
          { angle: 40,   tilt: 16 },
          { angle: 100,  tilt: -12 },
          { angle: 160,  tilt: 18 }
        ]

        otpInputsRef.current.forEach((box, i) => {
          if (!box) return
          const cfg = configs[i] || { angle: (i * (360 / n) - 90), tilt: (i % 2 === 0 ? -14 : 16) }
          const angleRad = cfg.angle * (Math.PI / 180)
          const circlePosX = targetX + orbitRadius * Math.cos(angleRad)
          const circlePosY = targetY + orbitRadius * Math.sin(angleRad)

          const boxRect = box.getBoundingClientRect()
          const boxCenterX = boxRect.left + boxRect.width / 2
          const boxCenterY = boxRect.top + boxRect.height / 2

          const deltaX = circlePosX - boxCenterX
          const deltaY = circlePosY - boxCenterY

          box.style.transition = 'transform 0.55s cubic-bezier(0.34, 1.25, 0.64, 1), border-color 0.4s ease, background-color 0.4s ease, box-shadow 0.4s ease'
          box.style.borderColor = '#fdb101'
          box.style.backgroundColor = '#ffffff'
          box.style.boxShadow = '0 8px 24px rgba(253, 177, 1, 0.4), 0 2px 8px rgba(0, 0, 0, 0.08)'
          box.style.borderRadius = '12px'
          box.style.color = '#0f172a'
          box.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(0.82) rotate(${cfg.tilt}deg)`
        })
      }

      // 400–900ms: Reveal LARGE glowing circular center orb & start smooth circular orbit
      setTimeout(() => {
        setIsCenterOrbVisible(true)
        setIsSpinning(true)
      }, 400)

      // 900–1400ms: Large circular ripple rings expand outward across 250px–350px
      setTimeout(() => {
        setIsRippleAnimating(true)
      }, 850)

      // 1700ms+: Smooth transition to existing Dashboard
      setTimeout(() => {
        setIsSuccessExiting(true)
        setTimeout(() => {
          window.location.href = destUrl
        }, 320)
      }, 1750)
    } catch (err) {
      setErrorMessage(err.message || 'Verification connection failed.')
      triggerShake()
      setOtpDigits(['', '', '', '', '', ''])
      if (otpInputsRef.current[0]) otpInputsRef.current[0].focus()
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
      setRemainingSeconds(data.expires_in_seconds || 300)
      setCooldownSeconds(data.resend_cooldown_seconds || 60)
      setAttemptsRemaining(data.attempts_remaining || 5)
      setOtpDigits(['', '', '', '', '', ''])
      if (otpInputsRef.current[0]) {
        otpInputsRef.current[0].focus()
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to resend verification code.')
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

      <div className={`login-card ${isShaking ? 'shake-card' : ''} ${isSuccessExiting ? 'card-success-exit' : ''}`}>
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
                {isLoading ? 'Sending verification code...' : 'Sign In \u2192'}
              </button>
            </form>
          </>
        )}

        {step === 'otp' && (
          <div className="otp-verification-container" style={{ position: 'relative' }}>
            <h2 className={`card-heading ${isConverging ? 'otp-fade-out' : ''}`}>VERIFY YOUR IDENTITY</h2>
            <p className={`card-sub ${isConverging ? 'otp-fade-out' : ''}`}>
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
              {/* OTP Input Boxes inside Orbit Container */}
              <div ref={otpWrapperRef} className={`otp-boxes-wrapper ${isConverging ? 'is-animating-success' : ''}`} onPaste={handleOtpPaste}>
                {/* Expanding Circular Ripple Rings (250px - 350px) */}
                <div className="otp-ripple-layer" aria-hidden="true">
                  <div className={`otp-ripple-ring ring-1 ${isRippleAnimating ? 'is-animating' : ''} ${isErrorRipple ? 'error-ring' : ''}`} />
                  <div className={`otp-ripple-ring ring-2 ${isRippleAnimating ? 'is-animating' : ''} ${isErrorRipple ? 'error-ring' : ''}`} />
                  <div className={`otp-ripple-ring ring-3 ${isRippleAnimating ? 'is-animating' : ''} ${isErrorRipple ? 'error-ring' : ''}`} />
                </div>

                {/* Large Glowing Center Circular Orb */}
                <div className={`otp-large-center-orb ${isCenterOrbVisible ? 'visible' : ''} ${isErrorOrb ? 'error-orb' : ''}`} aria-hidden="true" />

                <div className={`otp-orbit-container ${isSpinning ? 'is-spinning' : ''} ${isErrorShaking ? 'is-error-shaking' : ''}`}>
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
                      disabled={isLoading || isLocked || remainingSeconds <= 0 || isConverging}
                      aria-label={`Digit ${idx + 1} of verification code`}
                      autoComplete="off"
                    />
                  ))}
                </div>
              </div>

              {/* Countdown & Attempts Info */}
              <div className={`otp-meta-info ${isConverging ? 'otp-fade-out' : ''}`}>
                <div className="otp-expiry-timer">
                  Code expires in <strong>{formatTimer(remainingSeconds)}</strong>
                </div>
                <div className="otp-attempts-info">
                  Attempts remaining: <strong>{attemptsRemaining}</strong>
                </div>
              </div>

              <button
                type="submit"
                className={`submit-btn ${isConverging ? 'otp-fade-out' : ''}`}
                disabled={isLoading || isLocked || remainingSeconds <= 0 || otpDigits.join('').length !== 6 || isConverging}
                style={{ marginTop: '16px' }}
              >
                {isLoading ? 'Verifying Code...' : 'VERIFY & SIGN IN \u2192'}
              </button>

              {/* Resend Cooldown & Link */}
              <div className={`otp-resend-row ${isConverging ? 'otp-fade-out' : ''}`}>
                {cooldownSeconds > 0 ? (
                  <span className="resend-cooldown-text">
                    Resend code in <strong>00:{String(cooldownSeconds).padStart(2, '0')}</strong>
                  </span>
                ) : (
                  <button
                    type="button"
                    className="resend-otp-btn"
                    onClick={handleResendOtp}
                    disabled={isLoading || isLocked || isConverging}
                  >
                    Resend OTP
                  </button>
                )}
              </div>

              {/* Back to Sign In */}
              <div className={`otp-back-row ${isConverging ? 'otp-fade-out' : ''}`}>
                <button
                  type="button"
                  className="back-to-signin-btn"
                  onClick={handleBackToSignIn}
                  disabled={isConverging}
                >
                  &larr; Back to Sign In
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      <p className="footer-text">
        Need help? Contact <a href="mailto:support@moxiestore.com">support@moxiestore.com</a>
      </p>
    </div>
  )
}

