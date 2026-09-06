import React, { useState, useEffect, useRef } from 'react'
import {
  AppIcon,
  UserIcon,
  MailIcon,
  LockIcon,
  CheckIcon,
  EditIcon,
  UploadIcon,
  SecurityIcon,
  Clock01Icon,
  ViewIcon,
  HideIcon,
  CancelIcon,
  DeleteIcon
} from '../../icons'
import './ProfilePage.css'

export default function ProfilePage() {
  const djangoContext = window.DJANGO_CONTEXT || {}
  const initialAdmin = {
    id: djangoContext.adminInfo?.id || '',
    first_name: djangoContext.adminInfo?.firstName || '',
    last_name: djangoContext.adminInfo?.lastName || '',
    fullName: djangoContext.adminInfo?.fullName || '',
    email: djangoContext.adminInfo?.email || '',
    username: djangoContext.adminInfo?.username || '',
    mobile: djangoContext.adminInfo?.mobile || '',
    role: djangoContext.adminInfo?.role || (djangoContext.adminInfo?.isSuperuser ? 'Super Admin' : 'Staff'),
    isActive: djangoContext.adminInfo?.isActive !== undefined ? djangoContext.adminInfo.isActive : true,
    profile_image: djangoContext.adminInfo?.profileImage || null,
    date_joined: djangoContext.adminInfo?.dateJoined || '—',
    last_login: djangoContext.adminInfo?.lastLogin || '—',
    isSuperuser: !!djangoContext.adminInfo?.isSuperuser
  }

  const [admin, setAdmin] = useState(initialAdmin)
  const [formData, setFormData] = useState({
    first_name: initialAdmin.first_name,
    last_name: initialAdmin.last_name,
    email: initialAdmin.email,
    username: initialAdmin.username,
    mobile: initialAdmin.mobile
  })

  // Edit Mode state (Default: View Mode false)
  const [isEditing, setIsEditing] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [previewImage, setPreviewImage] = useState(initialAdmin.profile_image)
  const [isSaving, setIsSaving] = useState(false)
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' })
  const fileInputRef = useRef(null)

  // Password Modal & Form State
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  })
  const [showCurrentPw, setShowCurrentPw] = useState(false)
  const [showNewPw, setShowNewPw] = useState(false)
  const [showConfirmPw, setShowConfirmPw] = useState(false)
  const [passwordStatusMsg, setPasswordStatusMsg] = useState({ type: '', text: '' })
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)

  // Reset Mode (after email + OTP verification)
  const [resetMode, setResetMode] = useState(false)
  const [resetToken, setResetToken] = useState('')

  // Forgot Password Modal State
  const [showForgotModal, setShowForgotModal] = useState(false)
  const [forgotStep, setForgotStep] = useState(1) // 1: email, 2: otp
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotOtp, setForgotOtp] = useState('')
  const [isSendingOtp, setIsSendingOtp] = useState(false)
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false)
  const [forgotStatusMsg, setForgotStatusMsg] = useState({ type: '', text: '' })
  const [resendTimer, setResendTimer] = useState(0)

  // Resend OTP countdown timer
  useEffect(() => {
    let interval = null
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer(prev => prev - 1)
      }, 1000)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [resendTimer])

  // Auto-dismiss status messages
  useEffect(() => {
    if (statusMsg.text) {
      const timer = setTimeout(() => {
        setStatusMsg({ type: '', text: '' })
      }, statusMsg.type === 'success' ? 3500 : 6000)
      return () => clearTimeout(timer)
    }
  }, [statusMsg])

  useEffect(() => {
    if (passwordStatusMsg.text && passwordStatusMsg.type === 'success') {
      const timer = setTimeout(() => {
        setPasswordStatusMsg({ type: '', text: '' })
      }, 3500)
      return () => clearTimeout(timer)
    }
  }, [passwordStatusMsg])

  useEffect(() => {
    if (forgotStatusMsg.text && forgotStatusMsg.type === 'success') {
      const timer = setTimeout(() => {
        setForgotStatusMsg({ type: '', text: '' })
      }, 3500)
      return () => clearTimeout(timer)
    }
  }, [forgotStatusMsg])

  // Check URL parameters for password tab
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('tab') === 'password' || window.location.hash === '#password') {
      setShowPasswordModal(true)
    }
  }, [])

  // Fetch freshest data from API on mount
  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch('/api/admin-settings/profile/', {
          headers: { 'Accept': 'application/json' }
        })
        if (res.ok) {
          const data = await res.json()
          if (data && data.profile) {
            const p = data.profile
            const updated = {
              id: p.id || admin.id,
              first_name: p.first_name || '',
              last_name: p.last_name || '',
              fullName: p.fullName || `${p.first_name || ''} ${p.last_name || ''}`.trim() || p.username,
              email: p.email || '',
              username: p.username || '',
              mobile: p.mobile || '',
              role: p.role || (p.is_superuser ? 'Super Admin' : 'Staff'),
              isActive: p.is_active !== undefined ? p.is_active : true,
              profile_image: p.profile_image || null,
              date_joined: p.date_joined || '—',
              last_login: p.last_login || '—',
              isSuperuser: !!p.is_superuser
            }
            setAdmin(updated)
            setFormData({
              first_name: updated.first_name,
              last_name: updated.last_name,
              email: updated.email,
              username: updated.username,
              mobile: updated.mobile
            })
            if (updated.profile_image) {
              setPreviewImage(updated.profile_image)
              const headerAvatarEl = document.querySelector('.user-avatar')
              if (headerAvatarEl) {
                headerAvatarEl.innerHTML = `<img src="${updated.profile_image}" alt="${updated.fullName || updated.username}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover; display: block;" />`
              }
            }
          }
        }
      } catch (err) {
        console.error('Failed to load fresh profile data:', err)
      }
    }
    fetchProfile()
  }, [])

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (statusMsg.text) setStatusMsg({ type: '', text: '' })
  }

  const handleFileChange = async (e) => {
    const file = e.target.files[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setStatusMsg({ type: 'error', text: 'Image size exceeds 5MB limit.' })
        return
      }
      setSelectedFile(file)
      const localUrl = URL.createObjectURL(file)
      setPreviewImage(localUrl)
      setStatusMsg({ type: '', text: '' })

      // Auto upload directly for instant profile photo update
      setIsSaving(true)
      try {
        const csrfToken = djangoContext.csrfToken || ''
        const bodyData = new FormData()
        bodyData.append('profile_image', file)
        bodyData.append('first_name', (formData.first_name || '').trim())
        bodyData.append('last_name', (formData.last_name || '').trim())
        bodyData.append('email', (formData.email || '').trim())
        bodyData.append('username', (formData.username || admin.username || '').trim())
        bodyData.append('mobile', (formData.mobile || '').trim())

        const res = await fetch('/api/admin-settings/profile/', {
          method: 'POST',
          headers: { 'X-CSRFToken': csrfToken },
          body: bodyData
        })
        const data = await res.json()
        if (res.ok) {
          const p = data.profile || data || {}
          const newImg = p.profile_image || p.profileImage || localUrl
          setAdmin(prev => ({ ...prev, profile_image: newImg }))
          setPreviewImage(newImg)
          setSelectedFile(null)
          setStatusMsg({ type: 'success', text: data.message || 'Profile photo updated successfully.' })

          // Update header avatar in real-time
          const headerAvatarEl = document.querySelector('.user-avatar')
          if (headerAvatarEl && newImg) {
            headerAvatarEl.innerHTML = `<img src="${newImg}" alt="${admin.fullName || admin.username}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover; display: block;" />`
          }
        } else {
          setStatusMsg({ type: 'error', text: data.error || 'Failed to upload photo.' })
        }
      } catch (err) {
        console.error(err)
        setStatusMsg({ type: 'error', text: 'Network error uploading profile photo.' })
      } finally {
        setIsSaving(false)
      }
    }
  }

  const handleRemovePhoto = async (e) => {
    if (e) e.stopPropagation()
    if (!window.confirm('Are you sure you want to remove your profile photo?')) return

    setIsSaving(true)
    try {
      const csrfToken = djangoContext.csrfToken || ''
      const res = await fetch('/api/admin-settings/profile/', {
        method: 'DELETE',
        headers: { 'X-CSRFToken': csrfToken }
      })
      const data = await res.json()
      if (res.ok) {
        setAdmin(prev => ({ ...prev, profile_image: null }))
        setPreviewImage(null)
        setSelectedFile(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
        setStatusMsg({ type: 'success', text: data.message || 'Profile photo removed successfully.' })

        // Restore fallback avatar in header
        const headerAvatarEl = document.querySelector('.user-avatar')
        if (headerAvatarEl) {
          headerAvatarEl.innerHTML = '<svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>'
        }
      } else {
        setStatusMsg({ type: 'error', text: data.error || 'Failed to remove photo.' })
      }
    } catch (err) {
      console.error(err)
      setStatusMsg({ type: 'error', text: 'Network error removing profile photo.' })
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setFormData({
      first_name: admin.first_name,
      last_name: admin.last_name,
      email: admin.email,
      username: admin.username,
      mobile: admin.mobile
    })
    setSelectedFile(null)
    setPreviewImage(admin.profile_image)
    setStatusMsg({ type: '', text: '' })
    setIsEditing(false)
  }

  const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  const handleSave = async (e) => {
    e.preventDefault()

    if (!formData.username.trim()) {
      setStatusMsg({ type: 'error', text: 'Username is required.' })
      return
    }

    if (formData.email.trim() && !validateEmail(formData.email.trim())) {
      setStatusMsg({ type: 'error', text: 'Please provide a valid email address.' })
      return
    }

    setIsSaving(true)
    setStatusMsg({ type: '', text: '' })

    try {
      const csrfToken = djangoContext.csrfToken || ''
      const headers = { 'X-CSRFToken': csrfToken }
      let bodyData

      if (selectedFile) {
        bodyData = new FormData()
        bodyData.append('profile_image', selectedFile)
        bodyData.append('first_name', formData.first_name.trim())
        bodyData.append('last_name', formData.last_name.trim())
        bodyData.append('email', formData.email.trim())
        bodyData.append('username', formData.username.trim())
        bodyData.append('mobile', formData.mobile.trim())
      } else {
        headers['Content-Type'] = 'application/json'
        bodyData = JSON.stringify({
          first_name: formData.first_name.trim(),
          last_name: formData.last_name.trim(),
          email: formData.email.trim(),
          username: formData.username.trim(),
          mobile: formData.mobile.trim()
        })
      }

      const res = await fetch('/api/admin-settings/profile/', {
        method: 'PATCH',
        headers,
        body: bodyData
      })

      const data = await res.json()

      if (res.ok) {
        const p = data.profile || {}
        const updatedAdmin = {
          ...admin,
          first_name: p.first_name !== undefined ? p.first_name : formData.first_name.trim(),
          last_name: p.last_name !== undefined ? p.last_name : formData.last_name.trim(),
          fullName: `${p.first_name || formData.first_name} ${p.last_name || formData.last_name}`.trim() || formData.username,
          email: p.email || formData.email.trim(),
          username: p.username || formData.username.trim(),
          mobile: p.mobile || formData.mobile.trim(),
          profile_image: p.profile_image || previewImage
        }

        setAdmin(updatedAdmin)
        setSelectedFile(null)
        setIsEditing(false)
        setStatusMsg({ type: 'success', text: data.message || 'Profile updated successfully.' })

        // Synchronize top navbar elements in real-time
        const displayName = updatedAdmin.first_name
          ? `${updatedAdmin.first_name} ${updatedAdmin.last_name}`.trim()
          : updatedAdmin.username

        const headerNameEl = document.querySelector('.user-copy strong')
        if (headerNameEl) headerNameEl.textContent = displayName

        const popoverNameEl = document.querySelector('.user-popover-info strong')
        if (popoverNameEl) popoverNameEl.textContent = displayName

        const headerAvatarEl = document.querySelector('.user-avatar')
        if (headerAvatarEl && updatedAdmin.profile_image) {
          headerAvatarEl.innerHTML = `<img src="${updatedAdmin.profile_image}" alt="${displayName}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover; display: block;" />`
        }

        // Show global toast if available
        const toast = document.getElementById('moxie-toast')
        const toastTitle = document.getElementById('moxie-toast-title')
        const toastMsg = document.getElementById('moxie-toast-msg')
        if (toast) {
          if (toastTitle) toastTitle.textContent = 'Success'
          if (toastMsg) toastMsg.textContent = 'Profile updated successfully.'
          toast.style.display = 'flex'
          setTimeout(() => { toast.style.display = 'none' }, 4000)
        }
      } else {
        setStatusMsg({ type: 'error', text: data.error || 'Failed to update profile.' })
      }
    } catch (err) {
      console.error(err)
      setStatusMsg({ type: 'error', text: 'Network error occurred while saving profile.' })
    } finally {
      setIsSaving(false)
    }
  }

  // Open Forgot Password Modal
  const handleOpenForgotPassword = () => {
    setShowPasswordModal(false)
    setForgotEmail(admin.email || formData.email || '')
    setForgotOtp('')
    setForgotStep(1)
    setForgotStatusMsg({ type: '', text: '' })
    setShowForgotModal(true)
  }

  // Forgot Password: Step 1 Send Code
  const handleSendVerificationCode = async (e) => {
    e?.preventDefault()

    const trimmedEmail = forgotEmail.trim().toLowerCase()
    if (!trimmedEmail) {
      setForgotStatusMsg({ type: 'error', text: 'Please enter your registered administrator email.' })
      return
    }

    if (!validateEmail(trimmedEmail)) {
      setForgotStatusMsg({ type: 'error', text: 'Please provide a valid email address.' })
      return
    }

    setIsSendingOtp(true)
    setForgotStatusMsg({ type: '', text: '' })

    try {
      const csrfToken = djangoContext.csrfToken || ''
      const res = await fetch('/api/admin-settings/forgot-password/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken
        },
        body: JSON.stringify({ email: trimmedEmail })
      })

      const data = await res.json()

      if (res.ok) {
        setForgotStep(2)
        setResendTimer(60)
        setForgotStatusMsg({
          type: 'success',
          text: data.message || 'Verification code has been sent to your registered email.'
        })
      } else {
        setForgotStatusMsg({ type: 'error', text: data.error || 'Failed to send verification code.' })
      }
    } catch (err) {
      console.error(err)
      setForgotStatusMsg({ type: 'error', text: 'Network error occurred while sending code.' })
    } finally {
      setIsSendingOtp(false)
    }
  }

  // Forgot Password: Step 2 Verify Code
  const handleVerifyOtp = async (e) => {
    e?.preventDefault()

    const trimmedOtp = forgotOtp.trim().replace(/\s+/g, '')
    if (!trimmedOtp || trimmedOtp.length !== 6) {
      setForgotStatusMsg({ type: 'error', text: 'Please enter the complete 6-digit verification code.' })
      return
    }

    setIsVerifyingOtp(true)
    setForgotStatusMsg({ type: '', text: '' })

    try {
      const csrfToken = djangoContext.csrfToken || ''
      const res = await fetch('/api/admin-settings/verify-reset-code/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken
        },
        body: JSON.stringify({
          email: forgotEmail.trim().toLowerCase(),
          code: trimmedOtp
        })
      })

      const data = await res.json()

      if (res.ok && data.reset_token) {
        setResetToken(data.reset_token)
        setResetMode(true)
        setShowForgotModal(false)
        setPasswordData({ current_password: '', new_password: '', confirm_password: '' })
        setPasswordStatusMsg({
          type: 'success',
          text: '✓ Identity verified. You can now set a new password without your current password.'
        })
        setShowPasswordModal(true)
      } else {
        setForgotStatusMsg({ type: 'error', text: data.error || 'Invalid verification code.' })
      }
    } catch (err) {
      console.error(err)
      setForgotStatusMsg({ type: 'error', text: 'Network error occurred during verification.' })
    } finally {
      setIsVerifyingOtp(false)
    }
  }

  // Handle Password Submission (both Normal and Reset modes)
  const handlePasswordSubmit = async (e) => {
    e.preventDefault()

    if (resetMode) {
      // RESET MODE: Current password not required
      if (!passwordData.new_password || !passwordData.confirm_password) {
        setPasswordStatusMsg({ type: 'error', text: 'Please enter and confirm your new password.' })
        return
      }

      if (passwordData.new_password !== passwordData.confirm_password) {
        setPasswordStatusMsg({ type: 'error', text: 'New password and confirmation password do not match.' })
        return
      }

      if (passwordData.new_password.length < 8) {
        setPasswordStatusMsg({ type: 'error', text: 'Password must contain at least 8 characters.' })
        return
      }

      if (!/[A-Za-z]/.test(passwordData.new_password) || !/\d/.test(passwordData.new_password)) {
        setPasswordStatusMsg({ type: 'error', text: 'Password must contain both letters and numbers.' })
        return
      }

      setIsUpdatingPassword(true)
      setPasswordStatusMsg({ type: '', text: '' })

      try {
        const csrfToken = djangoContext.csrfToken || ''
        const res = await fetch('/api/admin-settings/reset-password/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrfToken
          },
          body: JSON.stringify({
            reset_token: resetToken,
            new_password: passwordData.new_password,
            confirm_password: passwordData.confirm_password
          })
        })

        const data = await res.json()

        if (res.ok) {
          setPasswordStatusMsg({ type: 'success', text: data.message || 'Password reset successfully.' })
          setPasswordData({ current_password: '', new_password: '', confirm_password: '' })
          setResetMode(false)
          setResetToken('')
          setTimeout(() => {
            setShowPasswordModal(false)
            setPasswordStatusMsg({ type: '', text: '' })
          }, 1500)

          const toast = document.getElementById('moxie-toast')
          const toastTitle = document.getElementById('moxie-toast-title')
          const toastMsg = document.getElementById('moxie-toast-msg')
          if (toast) {
            if (toastTitle) toastTitle.textContent = 'Success'
            if (toastMsg) toastMsg.textContent = 'Password reset successfully.'
            toast.style.display = 'flex'
            setTimeout(() => { toast.style.display = 'none' }, 4000)
          }
        } else {
          setPasswordStatusMsg({ type: 'error', text: data.error || 'Failed to reset password.' })
        }
      } catch (err) {
        console.error(err)
        setPasswordStatusMsg({ type: 'error', text: 'Network error occurred while resetting password.' })
      } finally {
        setIsUpdatingPassword(false)
      }
    } else {
      // NORMAL MODE: Current password required
      if (!passwordData.current_password || !passwordData.new_password || !passwordData.confirm_password) {
        setPasswordStatusMsg({ type: 'error', text: 'Please fill out all password fields.' })
        return
      }

      if (passwordData.new_password === passwordData.current_password) {
        setPasswordStatusMsg({ type: 'error', text: 'New password must be different from current password.' })
        return
      }

      if (passwordData.new_password !== passwordData.confirm_password) {
        setPasswordStatusMsg({ type: 'error', text: 'New password and confirmation password do not match.' })
        return
      }

      if (passwordData.new_password.length < 8) {
        setPasswordStatusMsg({ type: 'error', text: 'Password must contain at least 8 characters.' })
        return
      }

      if (!/[A-Za-z]/.test(passwordData.new_password) || !/\d/.test(passwordData.new_password)) {
        setPasswordStatusMsg({ type: 'error', text: 'Password must contain both letters and numbers.' })
        return
      }

      setIsUpdatingPassword(true)
      setPasswordStatusMsg({ type: '', text: '' })

      try {
        const csrfToken = djangoContext.csrfToken || ''
        const res = await fetch('/api/admin-settings/change-password/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrfToken
          },
          body: JSON.stringify(passwordData)
        })

        const data = await res.json()

        if (res.ok) {
          setPasswordStatusMsg({ type: 'success', text: data.message || 'Password updated successfully.' })
          setPasswordData({ current_password: '', new_password: '', confirm_password: '' })
          setTimeout(() => {
            setShowPasswordModal(false)
            setPasswordStatusMsg({ type: '', text: '' })
          }, 1500)

          const toast = document.getElementById('moxie-toast')
          const toastTitle = document.getElementById('moxie-toast-title')
          const toastMsg = document.getElementById('moxie-toast-msg')
          if (toast) {
            if (toastTitle) toastTitle.textContent = 'Success'
            if (toastMsg) toastMsg.textContent = 'Password updated successfully.'
            toast.style.display = 'flex'
            setTimeout(() => { toast.style.display = 'none' }, 4000)
          }
        } else {
          setPasswordStatusMsg({ type: 'error', text: data.error || 'Current password is incorrect.' })
        }
      } catch (err) {
        console.error(err)
        setPasswordStatusMsg({ type: 'error', text: 'Network error occurred while changing password.' })
      } finally {
        setIsUpdatingPassword(false)
      }
    }
  }

  const handleClosePasswordModal = () => {
    setShowPasswordModal(false)
    setPasswordData({ current_password: '', new_password: '', confirm_password: '' })
    setPasswordStatusMsg({ type: '', text: '' })
    setResetMode(false)
    setResetToken('')
  }

  const displayName = admin.first_name
    ? `${admin.first_name} ${admin.last_name}`.trim()
    : admin.username || 'Admin'

  const userInitial = (admin.first_name || admin.username || 'A')[0].toUpperCase()

  return (
    <div className="profile-page-container">
      {/* Page Header */}
      <div className="profile-page-header">
        <div className="profile-header-title-box">
          <h1 className="profile-page-title">My Profile</h1>
          <p className="profile-page-subtitle">
            Manage your account information and personal settings.
          </p>
        </div>
      </div>

      {/* Status Notification Alert */}
      {statusMsg.text && (
        <div className={`profile-status-alert ${statusMsg.type}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>{statusMsg.type === 'success' ? '✅' : '⚠️'}</span>
            <span>{statusMsg.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusMsg({ type: '', text: '' })}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'inherit',
              opacity: 0.7,
              fontSize: '18px',
              lineHeight: 1,
              padding: '0 4px',
              display: 'flex',
              alignItems: 'center'
            }}
            title="Dismiss message"
            aria-label="Dismiss message"
          >
            &times;
          </button>
        </div>
      )}

      {/* Main Profile Grid Layout */}
      <div className="profile-layout-grid">
        {/* LEFT COLUMN: Profile Summary Card */}
        <div className="profile-summary-card">
          <div className="summary-avatar-section">
            <div className="profile-large-avatar-wrapper">
              {previewImage ? (
                <img
                  src={previewImage}
                  alt={displayName}
                  className="profile-large-avatar-img"
                />
              ) : (
                <div className="profile-large-avatar-initial">
                  {userInitial}
                </div>
              )}
              <button
                type="button"
                className="avatar-edit-badge-btn"
                onClick={(e) => {
                  e.stopPropagation()
                  fileInputRef.current?.click()
                }}
                title="Change Photo"
                aria-label="Change Photo"
              >
                <AppIcon icon={EditIcon} size={15} color="#ffffff" />
              </button>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              style={{ display: 'none' }}
            />

            {previewImage && (
              <button
                type="button"
                className="avatar-remove-text-btn"
                onClick={handleRemovePhoto}
              >
                <AppIcon icon={DeleteIcon} size={13} color="#ef4444" />
                <span>Remove Photo</span>
              </button>
            )}

            <h2 className="summary-admin-name">{displayName}</h2>
            <div className="summary-role-pill">{admin.role}</div>
          </div>

          <div className="summary-info-divider" />

          <div className="summary-meta-list">
            <div className="summary-meta-item">
              <span className="summary-meta-label">Email Address</span>
              <span className="summary-meta-value">{admin.email || '—'}</span>
            </div>

            <div className="summary-meta-item">
              <span className="summary-meta-label">Mobile Number</span>
              <span className="summary-meta-value">{admin.mobile || '—'}</span>
            </div>

            <div className="summary-meta-item">
              <span className="summary-meta-label">Account Status</span>
              <span className="summary-status-badge active">
                <span className="status-dot"></span> Active
              </span>
            </div>

            <div className="summary-meta-item">
              <span className="summary-meta-label">Member Since</span>
              <span className="summary-meta-value date">{admin.date_joined}</span>
            </div>

            <div className="summary-meta-item">
              <span className="summary-meta-label">Last Login</span>
              <span className="summary-meta-value date">{admin.last_login}</span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Personal Information Form & Security */}
        <div className="profile-main-content-column">
          {/* Personal Information Card */}
          <div className="profile-card">
            <div className="profile-card-header personal-info-header">
              <div className="personal-info-header-text">
                <h3 className="profile-card-title">Personal Information</h3>
                <p className="profile-card-desc">
                  Update your contact info, full name, and administrator credentials.
                </p>
              </div>
              {!isEditing && (
                <button
                  type="button"
                  className="btn-edit-profile-trigger"
                  onClick={() => setIsEditing(true)}
                >
                  <AppIcon icon={EditIcon} size={15} color="#6366f1" />
                  <span>Edit Profile</span>
                </button>
              )}
            </div>

            <form onSubmit={handleSave} className="profile-form">
              <div className="profile-form-grid">
                <div className="form-field">
                  <label className="form-label">First Name</label>
                  <input
                    type="text"
                    className={`form-input ${!isEditing ? 'view-mode-input' : 'editable-input'}`}
                    value={formData.first_name}
                    placeholder="Enter first name"
                    readOnly={!isEditing}
                    onChange={(e) => handleInputChange('first_name', e.target.value)}
                  />
                </div>

                <div className="form-field">
                  <label className="form-label">Last Name</label>
                  <input
                    type="text"
                    className={`form-input ${!isEditing ? 'view-mode-input' : 'editable-input'}`}
                    value={formData.last_name}
                    placeholder="Enter last name"
                    readOnly={!isEditing}
                    onChange={(e) => handleInputChange('last_name', e.target.value)}
                  />
                </div>

                <div className="form-field">
                  <label className="form-label">Username</label>
                  <input
                    type="text"
                    className={`form-input ${!isEditing ? 'view-mode-input' : 'editable-input'}`}
                    value={formData.username}
                    placeholder="Username"
                    required
                    readOnly={!isEditing}
                    onChange={(e) => handleInputChange('username', e.target.value)}
                  />
                </div>

                <div className="form-field">
                  <label className="form-label">Email Address</label>
                  <input
                    type="email"
                    className={`form-input ${!isEditing ? 'view-mode-input' : 'editable-input'}`}
                    value={formData.email}
                    placeholder="name@moxie.com"
                    readOnly={!isEditing}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                  />
                </div>

                <div className="form-field">
                  <label className="form-label">Phone / Mobile</label>
                  <input
                    type="text"
                    className={`form-input ${!isEditing ? 'view-mode-input' : 'editable-input'}`}
                    value={formData.mobile}
                    placeholder="+91 9876543210"
                    readOnly={!isEditing}
                    onChange={(e) => handleInputChange('mobile', e.target.value)}
                  />
                </div>

                <div className="form-field">
                  <label className="form-label">Administrator Role</label>
                  <input
                    type="text"
                    className="form-input readonly-input"
                    value={admin.role}
                    disabled
                    readOnly
                  />
                </div>
              </div>

              {isEditing && (
                <div className="profile-form-actions">
                  <button
                    type="button"
                    className="btn-profile-cancel"
                    onClick={handleCancel}
                    disabled={isSaving}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-profile-save"
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <>Saving...</>
                    ) : (
                      <>
                        <AppIcon icon={CheckIcon} size={16} color="#ffffff" />
                        Save Changes
                      </>
                    )}
                  </button>
                </div>
              )}
            </form>
          </div>

          {/* Security & Password Section */}
          <div className="profile-card security-card">
            <div className="security-content-box">
              <div className="security-icon-circle">
                <AppIcon icon={LockIcon} size={22} color="#6366f1" />
              </div>
              <div className="security-text-box">
                <h4 className="security-title">Security & Password</h4>
                <p className="security-desc">
                  Keep your account secure by updating your administrator password regularly.
                </p>
              </div>
            </div>
            <button
              type="button"
              className="btn-change-password-action"
              onClick={() => {
                setResetMode(false)
                setResetToken('')
                setPasswordStatusMsg({ type: '', text: '' })
                setShowPasswordModal(true)
              }}
            >
              <AppIcon icon={LockIcon} size={16} color="currentColor" />
              Change Password
            </button>
          </div>
        </div>
      </div>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="modal-backdrop" onClick={handleClosePasswordModal}>
          <div className="password-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-wrap">
                <div className="modal-icon-badge">
                  <AppIcon icon={LockIcon} size={20} color="#6366f1" />
                </div>
                <div>
                  <h3 className="modal-title">
                    {resetMode ? 'Reset Password' : 'Change Password'}
                  </h3>
                  <p className="modal-subtitle">
                    {resetMode
                      ? 'Set a new strong password for your administrator account.'
                      : 'Ensure your account is protected with a strong password.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="btn-modal-close"
                onClick={handleClosePasswordModal}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {passwordStatusMsg.text && (
              <div className={`modal-status-alert ${passwordStatusMsg.type}`}>
                <span>{passwordStatusMsg.type === 'success' ? '✅' : '⚠️'}</span>
                <span>{passwordStatusMsg.text}</span>
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} className="modal-form">
              {resetMode ? (
                /* Identity Verified Banner in Reset Mode */
                <div className="verified-identity-banner">
                  <div className="verified-identity-icon-wrap">
                    <AppIcon icon={CheckIcon} size={18} color="#059669" />
                  </div>
                  <div>
                    <div className="verified-title">Identity Verified</div>
                    <div className="verified-subtitle">Verified through registered admin email. Current password not required.</div>
                  </div>
                </div>
              ) : (
                /* Normal Mode: Current Password Input */
                <div className="modal-form-group">
                  <div className="field-label-row">
                    <label className="form-label">Current Password</label>
                  </div>
                  <div className="pw-input-wrapper">
                    <input
                      type={showCurrentPw ? 'text' : 'password'}
                      className="form-input pw-input"
                      value={passwordData.current_password}
                      placeholder="Enter current password"
                      required
                      autoComplete="current-password"
                      onChange={(e) => {
                        setPasswordData(prev => ({ ...prev, current_password: e.target.value }))
                        if (passwordStatusMsg.text) setPasswordStatusMsg({ type: '', text: '' })
                      }}
                    />
                    <button
                      type="button"
                      className="pw-toggle-btn"
                      onClick={() => setShowCurrentPw(!showCurrentPw)}
                      title={showCurrentPw ? 'Hide password' : 'Show password'}
                    >
                      <AppIcon icon={showCurrentPw ? HideIcon : ViewIcon} size={16} color="#64748b" />
                    </button>
                  </div>
                  <div className="forgot-password-link-wrapper">
                    <button
                      type="button"
                      className="btn-forgot-password-link"
                      onClick={handleOpenForgotPassword}
                    >
                      Forgot Password?
                    </button>
                  </div>
                </div>
              )}

              <div className="modal-form-group">
                <label className="form-label">New Password</label>
                <div className="pw-input-wrapper">
                  <input
                    type={showNewPw ? 'text' : 'password'}
                    className="form-input pw-input"
                    value={passwordData.new_password}
                    placeholder="At least 8 characters (letters & numbers)"
                    required
                    autoComplete="new-password"
                    onChange={(e) => {
                      setPasswordData(prev => ({ ...prev, new_password: e.target.value }))
                      if (passwordStatusMsg.text) setPasswordStatusMsg({ type: '', text: '' })
                    }}
                  />
                  <button
                    type="button"
                    className="pw-toggle-btn"
                    onClick={() => setShowNewPw(!showNewPw)}
                    title={showNewPw ? 'Hide password' : 'Show password'}
                  >
                    <AppIcon icon={showNewPw ? HideIcon : ViewIcon} size={16} color="#64748b" />
                  </button>
                </div>
              </div>

              <div className="modal-form-group">
                <label className="form-label">Confirm New Password</label>
                <div className="pw-input-wrapper">
                  <input
                    type={showConfirmPw ? 'text' : 'password'}
                    className="form-input pw-input"
                    value={passwordData.confirm_password}
                    placeholder="Re-enter new password"
                    required
                    autoComplete="new-password"
                    onChange={(e) => {
                      setPasswordData(prev => ({ ...prev, confirm_password: e.target.value }))
                      if (passwordStatusMsg.text) setPasswordStatusMsg({ type: '', text: '' })
                    }}
                  />
                  <button
                    type="button"
                    className="pw-toggle-btn"
                    onClick={() => setShowConfirmPw(!showConfirmPw)}
                    title={showConfirmPw ? 'Hide password' : 'Show password'}
                  >
                    <AppIcon icon={showConfirmPw ? HideIcon : ViewIcon} size={16} color="#64748b" />
                  </button>
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-profile-cancel"
                  onClick={handleClosePasswordModal}
                  disabled={isUpdatingPassword}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-profile-save"
                  disabled={isUpdatingPassword}
                >
                  {isUpdatingPassword ? (
                    'Updating...'
                  ) : (
                    <>
                      <AppIcon icon={CheckIcon} size={16} color="#ffffff" />
                      Update Password
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Forgot Password Modal (2-Step Email & OTP Verification) */}
      {showForgotModal && (
        <div className="modal-backdrop" onClick={() => setShowForgotModal(false)}>
          <div className="password-modal-content forgot-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-wrap">
                <div className="modal-icon-badge">
                  <AppIcon icon={MailIcon} size={20} color="#6366f1" />
                </div>
                <div>
                  <h3 className="modal-title">Forgot Password</h3>
                  <p className="modal-subtitle">
                    {forgotStep === 1
                      ? 'Verify your administrator account to reset your password.'
                      : 'Enter the 6-digit verification code sent to your email.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="btn-modal-close"
                onClick={() => setShowForgotModal(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {forgotStatusMsg.text && (
              <div className={`modal-status-alert ${forgotStatusMsg.type}`}>
                <span>{forgotStatusMsg.type === 'success' ? '✅' : '⚠️'}</span>
                <span>{forgotStatusMsg.text}</span>
              </div>
            )}

            {forgotStep === 1 ? (
              /* STEP 1: Email Verification */
              <form onSubmit={handleSendVerificationCode} className="modal-form">
                <div className="modal-form-group">
                  <label className="form-label">Registered Admin Email</label>
                  <input
                    type="email"
                    className="form-input"
                    value={forgotEmail}
                    placeholder="admin@moxie.com"
                    required
                    onChange={(e) => {
                      setForgotEmail(e.target.value)
                      if (forgotStatusMsg.text) setForgotStatusMsg({ type: '', text: '' })
                    }}
                  />
                  <small className="field-hint-text">
                    We will send a 6-digit verification code to this administrator email address.
                  </small>
                </div>

                <div className="modal-actions">
                  <button
                    type="button"
                    className="btn-profile-cancel"
                    onClick={() => {
                      setShowForgotModal(false)
                      setShowPasswordModal(true)
                    }}
                    disabled={isSendingOtp}
                  >
                    Back to Login
                  </button>
                  <button
                    type="submit"
                    className="btn-profile-save"
                    disabled={isSendingOtp}
                  >
                    {isSendingOtp ? 'Sending Code...' : 'Send Verification Code'}
                  </button>
                </div>
              </form>
            ) : (
              /* STEP 2: OTP Verification */
              <form onSubmit={handleVerifyOtp} className="modal-form">
                <div className="modal-form-group">
                  <label className="form-label">Verification Code (6-digits)</label>
                  <input
                    type="text"
                    className="form-input otp-code-input"
                    value={forgotOtp}
                    maxLength={6}
                    placeholder="1 2 3 4 5 6"
                    required
                    autoFocus
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, '')
                      setForgotOtp(val)
                      if (forgotStatusMsg.text) setForgotStatusMsg({ type: '', text: '' })
                    }}
                  />
                  <div className="otp-helper-row">
                    <span className="otp-sent-to">
                      Sent to: <strong>{forgotEmail}</strong>
                    </span>
                    <button
                      type="button"
                      className="btn-link-action"
                      onClick={() => {
                        setForgotStep(1)
                        setForgotStatusMsg({ type: '', text: '' })
                      }}
                    >
                      Change Email
                    </button>
                  </div>
                </div>

                <div className="modal-actions">
                  <button
                    type="button"
                    className="btn-profile-cancel"
                    onClick={() => handleSendVerificationCode()}
                    disabled={resendTimer > 0 || isSendingOtp || isVerifyingOtp}
                  >
                    {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend Code'}
                  </button>
                  <button
                    type="submit"
                    className="btn-profile-save"
                    disabled={isVerifyingOtp || forgotOtp.trim().length !== 6}
                  >
                    {isVerifyingOtp ? 'Verifying...' : 'Verify Code'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

