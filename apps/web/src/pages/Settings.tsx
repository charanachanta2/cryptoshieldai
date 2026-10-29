import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '../contexts/AuthContext'
import { useAuthStore } from '../stores/authStore'
import { useToast } from '../contexts/ToastContext'
import { User, Mail, Lock, Bell, Shield, Eye, EyeOff } from 'lucide-react'

const profileSchema = z.object({
  displayName: z.string().min(2, 'Display name must be at least 2 characters').max(80),
  email: z.string().email('Invalid email address'),
})

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(12, 'Password must be at least 12 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

type ProfileForm = z.infer<typeof profileSchema>
type PasswordForm = z.infer<typeof passwordSchema>

export function Settings() {
  const { user } = useAuth()
  const { updateUser } = useAuthStore()
  const { showToast } = useToast()
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'notifications'>('profile')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false)
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)
  
  const {
    register: registerProfile,
    handleSubmit: handleSubmitProfile,
    formState: { errors: profileErrors },
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: user?.displayName || '',
      email: user?.email || '',
    },
  })
  
  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    formState: { errors: passwordErrors },
    reset: resetPassword,
  } = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  })
  
  const onSubmitProfile = async (data: ProfileForm) => {
    setIsUpdatingProfile(true)
    try {
      // In a real app, this would call an API
      updateUser(data)
      showToast({ type: 'success', title: 'Profile updated' })
    } catch {
      showToast({ type: 'error', title: 'Failed to update profile' })
    } finally {
      setIsUpdatingProfile(false)
    }
  }
  
  const onSubmitPassword = async (_data: PasswordForm) => {
    setIsUpdatingPassword(true)
    try {
      // In a real app, this would call an API
      showToast({ type: 'success', title: 'Password updated' })
      resetPassword()
    } catch {
      showToast({ type: 'error', title: 'Failed to update password' })
    } finally {
      setIsUpdatingPassword(false)
    }
  }
  
  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
  ]
  
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1">Manage your account preferences</p>
      </div>
      
      {/* Tabs */}
      <div className="card">
        <div className="border-b border-gray-100">
          <nav className="flex gap-4 p-4" aria-label="Settings tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
        
        <div className="p-6">
          {activeTab === 'profile' && (
            <ProfileForm
              register={registerProfile}
              handleSubmit={handleSubmitProfile}
              errors={profileErrors}
              onSubmit={onSubmitProfile}
              isLoading={isUpdatingProfile}
            />
          )}
          
          {activeTab === 'security' && (
            <SecurityForm
              register={registerPassword}
              handleSubmit={handleSubmitPassword}
              errors={passwordErrors}
              onSubmit={onSubmitPassword}
              isLoading={isUpdatingPassword}
              showCurrentPassword={showCurrentPassword}
              setShowCurrentPassword={setShowCurrentPassword}
              showNewPassword={showNewPassword}
              setShowNewPassword={setShowNewPassword}
            />
          )}
          
          {activeTab === 'notifications' && (
            <NotificationsTab />
          )}
        </div>
      </div>
    </div>
  )
}

function ProfileForm({ register, handleSubmit, errors, onSubmit, isLoading }: {
  register: any
  handleSubmit: any
  errors: any
  onSubmit: any
  isLoading: boolean
}) {
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div>
        <label htmlFor="displayName" className="label">Display Name</label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input {...register('displayName')} id="displayName" className="input pl-10" disabled={isLoading} />
        </div>
        {errors.displayName && <p className="mt-1 text-sm text-red-600">{errors.displayName.message}</p>}
      </div>
      
      <div>
        <label htmlFor="email" className="label">Email Address</label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input {...register('email')} id="email" type="email" className="input pl-10" disabled={isLoading} />
        </div>
        {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
        <p className="mt-1 text-sm text-gray-500">Email changes require verification</p>
      </div>
      
      <button type="submit" disabled={isLoading} className="btn-primary">
        {isLoading ? 'Saving...' : 'Save Changes'}
      </button>
    </form>
  )
}

function SecurityForm({ register, handleSubmit, errors, onSubmit, isLoading, showCurrentPassword, setShowCurrentPassword, showNewPassword, setShowNewPassword }: {
  register: any
  handleSubmit: any
  errors: any
  onSubmit: any
  isLoading: boolean
  showCurrentPassword: boolean
  setShowCurrentPassword: (value: boolean | ((prev: boolean) => boolean)) => void
  showNewPassword: boolean
  setShowNewPassword: (value: boolean | ((prev: boolean) => boolean)) => void
}) {
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div>
        <h3 className="font-medium text-gray-900 mb-4">Change Password</h3>
        <div>
          <label htmlFor="currentPassword" className="label">Current Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              {...register('currentPassword')}
              id="currentPassword"
              type={showCurrentPassword ? 'text' : 'password'}
              className="input pl-10 pr-10"
              disabled={isLoading}
            />
            <button type="button" onClick={() => setShowCurrentPassword((prev) => !prev)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {errors.currentPassword && <p className="mt-1 text-sm text-red-600">{errors.currentPassword.message}</p>}
        </div>
        
        <div>
          <label htmlFor="newPassword" className="label">New Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              {...register('newPassword')}
              id="newPassword"
              type={showNewPassword ? 'text' : 'password'}
              className="input pl-10 pr-10"
              disabled={isLoading}
            />
            <button type="button" onClick={() => setShowNewPassword((prev) => !prev)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {errors.newPassword && <p className="mt-1 text-sm text-red-600">{errors.newPassword.message}</p>}
          <p className="mt-1 text-sm text-gray-500">Must be at least 12 characters</p>
        </div>
        
        <div>
          <label htmlFor="confirmPassword" className="label">Confirm New Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              {...register('confirmPassword')}
              id="confirmPassword"
              type={showNewPassword ? 'text' : 'password'}
              className="input pl-10"
              disabled={isLoading}
            />
          </div>
          {errors.confirmPassword && <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>}
        </div>
      </div>
      
      <div className="pt-4 border-t border-gray-100">
        <h3 className="font-medium text-gray-900 mb-4">Two-Factor Authentication</h3>
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <p className="font-medium text-gray-900">Authenticator App</p>
            <p className="text-sm text-gray-500">Add an extra layer of security to your account</p>
          </div>
          <button className="btn-secondary">Enable 2FA</button>
        </div>
      </div>
      
      <button type="submit" disabled={isLoading} className="btn-primary">
        {isLoading ? 'Updating...' : 'Update Password'}
      </button>
    </form>
  )
}

function NotificationsTab() {
  return (
    <div className="space-y-4">
      <div className="p-4 bg-gray-50 rounded-lg">
        <h3 className="font-medium text-gray-900 mb-2">Email Notifications</h3>
        <p className="text-sm text-gray-500">Configure when you receive email alerts</p>
      </div>
      
      <div className="space-y-3">
        <NotificationToggle title="Watchlist Alerts" description="Risk changes and new threat reports for watched assets" defaultChecked />
        <NotificationToggle title="Scan Completion" description="Notify when a scan finishes processing" defaultChecked />
        <NotificationToggle title="Report Ready" description="Notify when a PDF report is ready for download" defaultChecked />
        <NotificationToggle title="Security Updates" description="Important security announcements and updates" defaultChecked />
        <NotificationToggle title="Weekly Digest" description="Summary of your scan activity and threat trends" defaultChecked={false} />
      </div>
      
      <div className="pt-4 border-t border-gray-100">
        <h3 className="font-medium text-gray-900 mb-2">In-App Notifications</h3>
        <p className="text-sm text-gray-500 mb-4">These appear in the notification center</p>
        <NotificationToggle title="All Alerts" description="Show all watchlist and threat alerts in-app" defaultChecked />
        <NotificationToggle title="Scan Updates" description="Real-time scan progress updates" defaultChecked />
      </div>
    </div>
  )
}

function NotificationToggle({ title, description, defaultChecked }: { title: string; description: string; defaultChecked?: boolean }) {
  const [checked, setChecked] = useState(defaultChecked || false)
  
  return (
    <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer">
      <div>
        <p className="font-medium text-gray-900">{title}</p>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => setChecked(e.target.checked)}
        className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
      />
    </label>
  )
}
