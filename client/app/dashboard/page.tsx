'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import Cookies from 'js-cookie'
import Link from 'next/link'

interface Account {
  id: string
  platform: string
  platformUsername: string
  isActive: boolean
}

interface Post {
  id: string
  postType: 'IMAGE' | 'CAROUSEL' | 'REEL'
  caption?: string
  scheduledAt: string
  status: 'PENDING' | 'PUBLISHED' | 'FAILED' | 'CANCELLED'
  platformPostId?: string
  mediaAssets: Array<{ id: string; fileUrl: string }>
  socialAccount: { platformUsername: string }
}

export default function DashboardPage() {
  const router = useRouter()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'posts' | 'accounts' | 'create'>('posts')

  useEffect(() => {
    const token = Cookies.get('token')
    if (!token) {
      router.push('/login')
      return
    }

    loadData()
  }, [router])

  const loadData = async () => {
    try {
      const [accountsData, postsData] = await Promise.all([
        api.getAccounts(),
        api.getPosts(),
      ])
      setAccounts(accountsData)
      setPosts(postsData)
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleInstagramConnect = async () => {
    try {
      const url = await api.getInstagramOAuthUrl()
      window.location.href = url
    } catch (error) {
      console.error('Failed to get OAuth URL:', error)
      alert('Failed to connect Instagram. Please try again.')
    }
  }

  const handleLogout = () => {
    api.logout()
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">Social Auto</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleLogout}
                className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('posts')}
              className={`border-b-2 py-4 px-1 text-sm font-medium ${
                activeTab === 'posts'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              Scheduled Posts
            </button>
            <button
              onClick={() => setActiveTab('create')}
              className={`border-b-2 py-4 px-1 text-sm font-medium ${
                activeTab === 'create'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              Create Post
            </button>
            <button
              onClick={() => setActiveTab('accounts')}
              className={`border-b-2 py-4 px-1 text-sm font-medium ${
                activeTab === 'accounts'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              Connected Accounts
            </button>
          </nav>
        </div>

        {activeTab === 'posts' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Scheduled Posts</h2>
            {posts.length === 0 ? (
              <div className="rounded-lg bg-white p-8 text-center shadow">
                <p className="text-gray-500">No scheduled posts yet.</p>
                <button
                  onClick={() => setActiveTab('create')}
                  className="mt-4 rounded-md bg-primary-600 px-4 py-2 text-white hover:bg-primary-700"
                >
                  Create Your First Post
                </button>
              </div>
            ) : (
              <div className="grid gap-4">
                {posts.map((post) => (
                  <div key={post.id} className="rounded-lg bg-white p-6 shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                            post.status === 'PUBLISHED' ? 'bg-green-100 text-green-800' :
                            post.status === 'FAILED' ? 'bg-red-100 text-red-800' :
                            post.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {post.status}
                          </span>
                          <span className="text-sm text-gray-500">
                            {post.postType}
                          </span>
                          <span className="text-sm text-gray-500">
                            @{post.socialAccount.platformUsername}
                          </span>
                        </div>
                        {post.caption && (
                          <p className="text-gray-700 mb-2">{post.caption.substring(0, 100)}...</p>
                        )}
                        <p className="text-sm text-gray-500">
                          Scheduled for: {new Date(post.scheduledAt).toLocaleString()}
                        </p>
                        {post.status === 'FAILED' && (
                          <button
                            onClick={async () => {
                              try {
                                await api.retryPost(post.id)
                                loadData()
                              } catch (error) {
                                alert('Failed to retry post')
                              }
                            }}
                            className="mt-2 rounded-md bg-primary-600 px-3 py-1 text-sm text-white hover:bg-primary-700"
                          >
                            Retry
                          </button>
                        )}
                      </div>
                      {post.mediaAssets.length > 0 && (
                        <img
                          src={post.mediaAssets[0].fileUrl}
                          alt="Post preview"
                          className="ml-4 h-20 w-20 rounded object-cover"
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'create' && (
          <div>
            <CreatePostForm
              accounts={accounts}
              onSuccess={() => {
                setActiveTab('posts')
                loadData()
              }}
            />
          </div>
        )}

        {activeTab === 'accounts' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Connected Accounts</h2>
            {accounts.length === 0 ? (
              <div className="rounded-lg bg-white p-8 text-center shadow">
                <p className="text-gray-500 mb-4">No connected accounts yet.</p>
                <button
                  onClick={handleInstagramConnect}
                  className="rounded-md bg-primary-600 px-4 py-2 text-white hover:bg-primary-700"
                >
                  Connect Instagram Account
                </button>
              </div>
            ) : (
              <div className="grid gap-4">
                {accounts.map((account) => (
                  <div key={account.id} className="rounded-lg bg-white p-6 shadow">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{account.platform}</h3>
                        <p className="text-sm text-gray-500">@{account.platformUsername}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        {account.isActive ? (
                          <span className="inline-flex rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-800">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-800">
                            Inactive
                          </span>
                        )}
                        <button
                          onClick={async () => {
                            if (confirm('Are you sure you want to disconnect this account?')) {
                              try {
                                await api.disconnectAccount(account.id)
                                loadData()
                              } catch (error) {
                                alert('Failed to disconnect account')
                              }
                            }
                          }}
                          className="rounded-md bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700"
                        >
                          Disconnect
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                <button
                  onClick={handleInstagramConnect}
                  className="rounded-lg border-2 border-dashed border-gray-300 p-6 text-center hover:border-primary-500"
                >
                  <p className="text-gray-500">+ Connect Another Account</p>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function CreatePostForm({ accounts, onSuccess }: { accounts: Account[]; onSuccess: () => void }) {
  const [postType, setPostType] = useState<'IMAGE' | 'CAROUSEL' | 'REEL'>('IMAGE')
  const [socialAccountId, setSocialAccountId] = useState('')
  const [caption, setCaption] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [selectedMedia, setSelectedMedia] = useState<string[]>([])
  const [uploadedMedia, setUploadedMedia] = useState<Array<{ id: string; fileUrl: string }>>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    setLoading(true)
    setError('')

    try {
      const uploadPromises = Array.from(files).map((file) => api.uploadMedia(file))
      const results = await Promise.all(uploadPromises)
      setUploadedMedia([...uploadedMedia, ...results])
      setSelectedMedia([...selectedMedia, ...results.map((r) => r.id)])
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to upload media')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!socialAccountId) {
      setError('Please select an account')
      return
    }

    if (selectedMedia.length === 0) {
      setError('Please upload at least one media file')
      return
    }

    if ((postType === 'IMAGE' || postType === 'REEL') && selectedMedia.length !== 1) {
      setError(`${postType === 'IMAGE' ? 'Image' : 'Reel'} posts must have exactly 1 file`)
      return
    }

    if (postType === 'CAROUSEL' && (selectedMedia.length < 2 || selectedMedia.length > 10)) {
      setError('Carousel posts must have between 2 and 10 images')
      return
    }

    if (!scheduledAt) {
      setError('Please select a scheduled time')
      return
    }

    if (new Date(scheduledAt) <= new Date()) {
      setError('Scheduled time must be in the future')
      return
    }

    setLoading(true)

    try {
      await api.createPost({
        socialAccountId,
        postType,
        caption: caption || undefined,
        scheduledAt: new Date(scheduledAt).toISOString(),
        mediaAssetIds: selectedMedia,
      })
      onSuccess()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create post')
    } finally {
      setLoading(false)
    }
  }

  if (accounts.length === 0) {
    return (
      <div className="rounded-lg bg-white p-8 text-center shadow">
        <p className="text-gray-500 mb-4">Please connect an Instagram account first.</p>
        <Link
          href="/dashboard?tab=accounts"
          className="rounded-md bg-primary-600 px-4 py-2 text-white hover:bg-primary-700"
        >
          Connect Account
        </Link>
      </div>
    )
  }

  return (
    <div className="rounded-lg bg-white p-6 shadow">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Create Scheduled Post</h2>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Account
          </label>
          <select
            value={socialAccountId}
            onChange={(e) => setSocialAccountId(e.target.value)}
            className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-primary-500"
            required
          >
            <option value="">Select an account</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                @{account.platformUsername} ({account.platform})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Post Type
          </label>
          <div className="flex space-x-4">
            {(['IMAGE', 'CAROUSEL', 'REEL'] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setPostType(type)}
                className={`rounded-md px-4 py-2 ${
                  postType === type
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Media Files
          </label>
          <input
            type="file"
            multiple={postType !== 'IMAGE' && postType !== 'REEL'}
            accept={postType === 'REEL' ? 'video/*' : 'image/*'}
            onChange={handleFileUpload}
            disabled={loading}
            className="block w-full text-sm text-gray-500 file:mr-4 file:rounded-md file:border-0 file:bg-primary-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-primary-700 hover:file:bg-primary-100"
          />
          {uploadedMedia.length > 0 && (
            <div className="mt-4 grid grid-cols-4 gap-4">
              {uploadedMedia.map((media) => (
                <div key={media.id} className="relative">
                  {postType === 'REEL' || media.fileUrl.includes('video') ? (
                    <video src={media.fileUrl} className="h-24 w-full rounded object-cover" />
                  ) : (
                    <img src={media.fileUrl} alt="Media" className="h-24 w-full rounded object-cover" />
                  )}
                  {selectedMedia.includes(media.id) && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                      <span className="text-white">✓</span>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedMedia.includes(media.id)) {
                        setSelectedMedia(selectedMedia.filter((id) => id !== media.id))
                      } else {
                        setSelectedMedia([...selectedMedia, media.id])
                      }
                    }}
                    className="absolute top-1 right-1 rounded-full bg-black bg-opacity-50 p-1 text-white hover:bg-opacity-70"
                  >
                    {selectedMedia.includes(media.id) ? 'Selected' : 'Select'}
                  </button>
                </div>
              ))}
            </div>
          )}
          <p className="mt-2 text-sm text-gray-500">
            {postType === 'IMAGE' && 'Upload 1 image'}
            {postType === 'CAROUSEL' && 'Upload 2-10 images'}
            {postType === 'REEL' && 'Upload 1 video'}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Caption
          </label>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows={4}
            className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-primary-500"
            placeholder="Write a caption... #hashtags"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Scheduled Date & Time
          </label>
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            min={new Date().toISOString().slice(0, 16)}
            className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-primary-500"
            required
          />
        </div>

        <div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-primary-600 px-4 py-2 text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Schedule Post'}
          </button>
        </div>
      </form>
    </div>
  )
}

