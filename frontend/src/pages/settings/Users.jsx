import { useContext, useEffect, useMemo, useRef, useState } from 'react'
import { Plus, UserRound, Save, Trash2, LockKeyhole, Check } from 'lucide-react'
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'

import ActionButton from '../../components/ActionButton'
import ConfirmationModal from '../../components/ConfirmationModal'
import LabeledInput from '../../components/LabeledInput'
import LabeledSelect from '../../components/LabeledSelect'
import { AuthContext } from '../../AuthContext'
import { useDelayedSkeleton } from '../../hooks/useDelayedSkeleton'
import { getSharedRequest } from '../../lib/sharedRequest'
import { createUser, deleteUser, getUserById, resetUserPassword, searchUsers, updateUser } from '../../lib/usersApi'

const EMPTY_CREATE_FORM = {
  name: '',
  email: '',
  password: '',
  role: 'User',
}

const EMPTY_PASSWORD_FORM = {
  password: '',
  confirmPassword: '',
}

const ROLE_OPTIONS = [
  { id: 'User', name: 'User' },
  { id: 'Admin', name: 'Admin' },
]

function normalizeRole(role) {
  return `${role ?? ''}`.trim().toLowerCase() === 'admin' ? 'Admin' : 'User'
}

function isSameUser(left, right) {
  return left?.id != null && right?.id != null && Number(left.id) === Number(right.id)
}

function getPasswordIntegrityChecks(password) {
  const value = `${password ?? ''}`

  return [
    { label: 'Minst 8 tecken', isValid: value.length >= 8 },
    { label: 'Minst en versal (A-Z)', isValid: /[A-Z]/.test(value) },
    { label: 'Minst en gemen (a-z)', isValid: /[a-z]/.test(value) },
    { label: 'Minst en siffra (0-9)', isValid: /\d/.test(value) },
    { label: 'Minst ett specialtecken', isValid: /[^A-Za-z0-9]/.test(value) },
  ]
}

export default function Users() {
  const auth = useContext(AuthContext)
  const currentUser = auth?.user ?? null
  const isAdmin = normalizeRole(currentUser?.role) === 'Admin'

  const listContainerRef = useRef(null)
  const isCreateModeRef = useRef(false)

  const [users, setUsers] = useState([])
  const [selectedUserId, setSelectedUserId] = useState(null)
  const [selectedUserDetails, setSelectedUserDetails] = useState(null)
  const [isCreateMode, setIsCreateMode] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const [isLoadingUsers, setIsLoadingUsers] = useState(false)
  const [isSavingUser, setIsSavingUser] = useState(false)
  const [isDeletingUser, setIsDeletingUser] = useState(false)
  const [isResettingSelectedPassword, setIsResettingSelectedPassword] = useState(false)
  const [createForm, setCreateForm] = useState(() => ({ ...EMPTY_CREATE_FORM }))
  const [selectedPasswordForm, setSelectedPasswordForm] = useState(() => ({ ...EMPTY_PASSWORD_FORM }))
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false)
  const [passwordModalErrorMessage, setPasswordModalErrorMessage] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const showUsersSkeleton = useDelayedSkeleton(isLoadingUsers, 250, 200)

  useEffect(() => {
    isCreateModeRef.current = isCreateMode
  }, [isCreateMode])

  useEffect(() => {
    let isActive = true

    if (!isAdmin) {
      setUsers([])
      setSelectedUserId(null)
      setIsLoadingUsers(false)
      return () => {
        isActive = false
      }
    }

    setIsLoadingUsers(true)
    setErrorMessage('')

    const requestKey = `settings:users:${searchValue.trim().toLowerCase()}`

    getSharedRequest(requestKey, () => searchUsers({ searchTerm: searchValue }))
      .then((result) => {
        if (!isActive) {
          return
        }

        setUsers(result)

        if (result.length === 0) {
          setSelectedUserId(null)
          return
        }

        if (isCreateModeRef.current) {
          return
        }

        setSelectedUserId((previousSelectedId) => {
          const existingSelected = previousSelectedId == null
            ? null
            : result.find((user) => user.id === previousSelectedId)

          const fallbackSelected = result.find((user) => !isSameUser(user, currentUser)) ?? result[0]
          return (existingSelected ?? fallbackSelected)?.id ?? null
        })
      })
      .catch((requestError) => {
        if (!isActive) {
          return
        }

        setErrorMessage(requestError?.message || 'Kunde inte hämta användare.')
      })
      .finally(() => {
        if (isActive) {
          setIsLoadingUsers(false)
        }
      })

    return () => {
      isActive = false
    }
  }, [isAdmin, searchValue, currentUser?.id])

  useEffect(() => {
    if (!isAdmin) {
      return
    }

    if (isCreateMode) {
      return
    }

    if (selectedUserId == null && currentUser?.id != null) {
      setSelectedUserId(Number(currentUser.id))
    }
  }, [isAdmin, currentUser?.id, selectedUserId, isCreateMode])

  useEffect(() => {
    let isActive = true

    if (!isAdmin || isCreateMode) {
      setSelectedUserDetails(null)
      return () => {
        isActive = false
      }
    }

    if (selectedUserId == null) {
      setSelectedUserDetails(null)
      return () => {
        isActive = false
      }
    }

    const requestKey = `settings:user:${selectedUserId}`

    getSharedRequest(requestKey, () => getUserById(selectedUserId))
      .then((user) => {
        if (!isActive) {
          return
        }

        setSelectedUserDetails(user)
      })
      .catch((requestError) => {
        if (!isActive) {
          return
        }

        setSelectedUserDetails(null)
        setErrorMessage(requestError?.message || 'Kunde inte hämta vald användare.')
      })

    return () => {
      isActive = false
    }
  }, [isAdmin, isCreateMode, selectedUserId])

  const selectedUser = useMemo(() => {
    if (selectedUserId == null) {
      return null
    }

    return users.find((user) => user.id === selectedUserId) ?? null
  }, [selectedUserId, users])

  useEffect(() => {
    if (!isAdmin) {
      return
    }

    if (isCreateMode) {
      return
    }

    if (selectedUserId == null) {
      setCreateForm({ ...EMPTY_CREATE_FORM })
      return
    }

    if (!selectedUserDetails || selectedUserDetails.id !== selectedUserId) {
      setCreateForm({ ...EMPTY_CREATE_FORM })
      return
    }

    setCreateForm({
      ...EMPTY_CREATE_FORM,
      name: selectedUserDetails.name ?? '',
      email: selectedUserDetails.email ?? '',
      role: normalizeRole(selectedUserDetails.role),
    })
  }, [isAdmin, isCreateMode, selectedUserId, selectedUserDetails])

  const hasSelectedPersistedUser = !isCreateMode && selectedUser?.id != null
  const canOpenPasswordModal = isAdmin && hasSelectedPersistedUser
  const canDeleteSelectedUser = isAdmin && hasSelectedPersistedUser && !isSavingUser && !isDeletingUser && !isResettingSelectedPassword
  const passwordIntegrityChecks = getPasswordIntegrityChecks(selectedPasswordForm.password)
  const hasValidPasswordIntegrity = passwordIntegrityChecks.every((check) => check.isValid)

  function setMessage(message, type = 'success') {
    setStatusMessage(type === 'success' ? message : '')
    setErrorMessage(type === 'error' ? message : '')
  }

  function handleStartCreateUser() {
    if (!isAdmin) {
      return
    }

    setIsCreateMode(true)
    setSelectedUserId(null)
    setSelectedUserDetails(null)
    setCreateForm({ ...EMPTY_CREATE_FORM })
    setSelectedPasswordForm({ ...EMPTY_PASSWORD_FORM })
    setStatusMessage('')
    setErrorMessage('')
  }

  async function handleSaveUser(event) {
    event?.preventDefault?.()

    if (!isAdmin) {
      return
    }

    if (!createForm.name.trim() || !createForm.email.trim()) {
      setMessage('Fyll i namn och e-post.', 'error')
      return
    }

    if (isCreateMode && !createForm.password) {
      setMessage('Ange lösenord för ny användare.', 'error')
      return
    }

    setIsSavingUser(true)

    try {
      if (isCreateMode) {
        const createdUser = await createUser(createForm)
        setMessage('Användaren skapades.')

        const refreshedUsers = await searchUsers({ searchTerm: searchValue })
        setUsers(refreshedUsers)
        setIsCreateMode(false)
        setSelectedUserId(createdUser?.id ?? null)
      } else {
        if (!selectedUserId) {
          setMessage('Välj en användare först.', 'error')
          return
        }

        const updatedUser = await updateUser(selectedUserId, createForm)
        setMessage('Användaren uppdaterades.')

        const refreshedUsers = await searchUsers({ searchTerm: searchValue })
        setUsers(refreshedUsers)
        setSelectedUserId(updatedUser?.id ?? selectedUserId)
        setSelectedUserDetails(updatedUser ?? null)
      }
    } catch (requestError) {
      setMessage(requestError?.message || 'Kunde inte spara användaren.', 'error')
    } finally {
      setIsSavingUser(false)
    }
  }

  function handleOpenPasswordModal() {
    if (!canOpenPasswordModal) {
      return
    }

    setSelectedPasswordForm({ ...EMPTY_PASSWORD_FORM })
    setPasswordModalErrorMessage('')
    setIsPasswordModalOpen(true)
  }

  function handleClosePasswordModal() {
    setPasswordModalErrorMessage('')
    setIsPasswordModalOpen(false)
  }

  async function handleChangeSelectedPassword(event) {
    event.preventDefault()

    if (!isAdmin || !selectedUser?.id) {
      return
    }

    setPasswordModalErrorMessage('')

    if (!selectedPasswordForm.password || selectedPasswordForm.password !== selectedPasswordForm.confirmPassword) {
      setPasswordModalErrorMessage('Lösenorden måste matcha.')
      return
    }

    if (!hasValidPasswordIntegrity) {
      setPasswordModalErrorMessage('Lösenordet uppfyller inte lösenordskraven.')
      return
    }

    setIsResettingSelectedPassword(true)

    try {
      await resetUserPassword(selectedUser.id, selectedPasswordForm.password)
      setSelectedPasswordForm({ ...EMPTY_PASSWORD_FORM })
      handleClosePasswordModal()
      setMessage(`Lösenordet för ${selectedUser.name} har uppdaterats.`)
    } catch (requestError) {
      setPasswordModalErrorMessage(requestError?.message || 'Kunde inte uppdatera lösenordet.')
    } finally {
      setIsResettingSelectedPassword(false)
    }
  }

  async function handleConfirmDeleteUser() {
    if (!canDeleteSelectedUser || !selectedUser?.id) {
      return
    }

    setIsDeletingUser(true)

    try {
      await deleteUser(selectedUser.id)
      setIsDeleteModalOpen(false)
      setMessage('Användaren raderades.')

      const refreshedUsers = await searchUsers({ searchTerm: searchValue })
      setUsers(refreshedUsers)

      const fallbackSelected = refreshedUsers.find((user) => !isSameUser(user, currentUser)) ?? refreshedUsers[0] ?? null
      setSelectedUserId(fallbackSelected?.id ?? null)
      setIsCreateMode(false)
    } catch (requestError) {
      setMessage(requestError?.message || 'Kunde inte radera användaren.', 'error')
    } finally {
      setIsDeletingUser(false)
    }
  }

  return (
    <div className="flex h-full min-h-full w-full flex-col px-0 pb-10 md:px-[clamp(8px,15vw,10vw)]">
      <div className="mt-3 flex min-h-0 flex-1 flex-col">
        <div className={[
          'grid min-h-0 flex-1 lg:items-stretch',
          isAdmin ? 'lg:grid-cols-[450px_1px_minmax(0,1fr)] lg:gap-8' : 'lg:grid-cols-[minmax(0,1fr)]',
        ].join(' ')}>
          {isAdmin && (
            <aside className="mb-8 border-b border-gray-300 pr-4 text-gray-700 lg:border-b-0">
              <div className="mr-5">
                <div className="flex items-center justify-between gap-2">
                  <input
                    value={searchValue}
                    onChange={(event) => setSearchValue(event.target.value)}
                    placeholder="Sök användare, fritext"
                    className="h-7 w-70 rounded-full border border-lime-600 bg-white px-4 text-xs text-gray-700 outline-none transition placeholder:text-gray-500 focus:border-lime-700"
                  />
                  <ActionButton
                    label="Ny"
                    icon={Plus}
                    accent="sky"
                    onClick={handleStartCreateUser}
                    disabled={!isAdmin}
                  />
                </div>
              </div>

              <div
                ref={listContainerRef}
                className="mt-5 max-h-[calc(100vh-360px)] overflow-y-auto pr-2 focus:outline-none"
              >
                {showUsersSkeleton && users.length === 0 && (
                  <div className="space-y-3 px-1 py-1">
                    {Array.from({ length: 6 }).map((_, index) => (
                      <Skeleton key={`users-list-skeleton-${index}`} height={72} className="mb-1" />
                    ))}
                  </div>
                )}

                {isLoadingUsers && !showUsersSkeleton && (
                  <div className="py-4 text-xs text-gray-500">Laddar användare...</div>
                )}

                {!isLoadingUsers && users.length === 0 && (
                  <div className="py-4 text-center text-xs text-gray-500">Inga användare matchar sökningen.</div>
                )}

                {!isLoadingUsers && users.map((user) => {
                  const isSelected = user.id === selectedUserId

                  return (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => {
                        setSelectedUserId(user.id)
                        setIsCreateMode(false)
                        setStatusMessage('')
                        setErrorMessage('')
                      }}
                      className={`mb-2 w-full rounded-sm border px-3 pt-2.5 pb-1.5 text-left transition ${
                        isSelected
                          ? 'border-lime-500 bg-lime-100/50 text-gray-900'
                          : 'border-gray-200 bg-white text-gray-800 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-2">
                          <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-slate-300 text-slate-500">
                            <UserRound className="h-3.5 w-3.5" />
                          </span>

                          <div className="min-w-0">
                            <div className="truncate text-xs leading-none text-slate-900">
                              {user.name || '-'}
                            </div>
                            <div className="mt-1 truncate text-tiny text-slate-500">
                              {user.email || '-'}
                            </div>
                          </div>
                        </div>

                        <span className={[
                          'inline-flex shrink-0 items-center rounded-full px-3 py-0 text-tiny uppercase tracking-[0.08em]',
                          user.role === 'Admin'
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : 'bg-gray-100 text-gray-700 border border-gray-300',
                        ].join(' ')}>
                          {user.role || '-'}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </aside>
          )}

          {isAdmin && <div aria-hidden="true" className="mt-6 bg-gray-300" />}

          <section className="px-3 lg:px-4">
            <div className="mb-4 flex items-start justify-between gap-5">
              <div>
                <h1 className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-700">Användare</h1>
                <p className="mt-2 max-w-2xl text-xs text-gray-500">
                  Admin kan lägga till användare och byta lösenord för andra användare. Alla kan byta sitt eget lösenord.
                </p>
              </div>

              <div className="mb-0 min-h-[42px] w-80">
                {errorMessage && (
                  <div className="rounded-full border border-rose-200 bg-rose-50 px-5 py-1 text-center text-xs text-rose-700">
                    {errorMessage}
                  </div>
                )}

                {statusMessage && (
                  <div className="rounded-full border border-emerald-200 bg-emerald-50 px-5 py-1 text-center text-xs text-emerald-700">
                    {statusMessage}
                  </div>
                )}

              </div>
            </div>

            <div className="space-y-8">
              {isAdmin && (
                <div className="max-w-[620px]">
                  {/* <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-gray-600">
                    <UserRound className="h-4 w-4" />
                    <span>{isCreateMode ? 'Ny användare' : 'Vald användare'}</span>
                  </div> */}

                  <div className="mb-6 flex flex-wrap gap-3">
                    <ActionButton
                      label="Spara"
                      icon={Save}
                      type="button"
                      accent="lime"
                      onClick={handleSaveUser}
                      disabled={!isAdmin || isSavingUser || isDeletingUser || isResettingSelectedPassword}
                    />
                    <ActionButton
                      label="Radera"
                      icon={Trash2}
                      type="button"
                      accent="rose"
                      onClick={() => setIsDeleteModalOpen(true)}
                      disabled={!canDeleteSelectedUser}
                    />
                    <ActionButton
                      label="Byt lösenord"
                      icon={LockKeyhole}
                      type="button"
                      accent="yellow"
                      onClick={handleOpenPasswordModal}
                      disabled={!canOpenPasswordModal || isResettingSelectedPassword}
                    />
                  </div>

                  <form className="w-100 gap-4 sm:grid-cols-2" onSubmit={handleSaveUser}>
                    <LabeledInput
                      label="Namn"
                      labelWidth="w-16"
                      value={createForm.name}
                      onChange={(value) => setCreateForm((prev) => ({ ...prev, name: value }))}
                      disabled={!isAdmin || isSavingUser || isDeletingUser}
                    />
                    <LabeledInput
                      label="E-post"
                      labelWidth="w-16"
                      value={createForm.email}
                      onChange={(value) => setCreateForm((prev) => ({ ...prev, email: value }))}
                      type="email"
                      disabled={!isAdmin || isSavingUser || isDeletingUser}
                    />

                    {isCreateMode && (
                      <LabeledInput
                        label="Lösenord"
                        labelWidth="w-16"
                        value={createForm.password}
                        type="password"
                        onChange={(value) => setCreateForm((prev) => ({ ...prev, password: value }))}
                        disabled={!isAdmin || isSavingUser || isDeletingUser}
                      />
                    )}

                    <LabeledSelect
                      label="Roll"
                      labelWidth="w-16"
                      value={createForm.role}
                      items={ROLE_OPTIONS}
                      onChange={(value) => setCreateForm((prev) => ({ ...prev, role: normalizeRole(value) }))}
                      disabled={!isAdmin || isSavingUser || isDeletingUser}
                    />
                  </form>

                  {!isCreateMode && !selectedUser && (
                    <div className="mt-4 text-xs text-gray-500">Välj en användare i listan eller klicka Ny.</div>
                  )}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDeleteUser}
        title="RADERA ANVÄNDARE"
        message={selectedUser ? `Vill du radera ${selectedUser.name}?` : 'Vill du radera vald användare?'}
        confirmText="Radera"
        cancelText="Avbryt"
        isDestructive
      />

      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={handleClosePasswordModal} />

          <div className="relative z-10 flex min-h-screen items-start justify-center pt-20" onClick={handleClosePasswordModal}>
            <div
              className="relative mx-4 w-full max-w-md rounded-sm bg-white p-6 shadow-xl"
              style={{ background: 'rgb(255, 255, 234)' }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="relative mb-4 flex items-center justify-center">
                <h2 className="text-sm font-semibold text-center">BYT LÖSENORD</h2>
                <button
                  type="button"
                  onClick={handleClosePasswordModal}
                  className="absolute right-0 text-l leading-none text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>

              {passwordModalErrorMessage && (
                <div className="mb-3 rounded-full border border-rose-200 bg-rose-50 px-5 py-1 text-center text-xs text-rose-700">
                  {passwordModalErrorMessage}
                </div>
              )}

              <form className="mx-10 mt-7 grid gap-1" onSubmit={handleChangeSelectedPassword}>
                <LabeledInput
                  label="Nytt lösenord"
                  labelWidth="w-24"
                  value={selectedPasswordForm.password}
                  type="password"
                  onChange={(value) => {
                    setSelectedPasswordForm((prev) => ({ ...prev, password: value }))
                    setPasswordModalErrorMessage('')
                  }}
                  disabled={isResettingSelectedPassword}
                />
                <LabeledInput
                  label="Bekräfta lösenord"
                  labelWidth="w-24"
                  value={selectedPasswordForm.confirmPassword}
                  type="password"
                  onChange={(value) => {
                    setSelectedPasswordForm((prev) => ({ ...prev, confirmPassword: value }))
                    setPasswordModalErrorMessage('')
                  }}
                  disabled={isResettingSelectedPassword}
                />

                <div className="mt-1 rounded-sm border border-gray-200 bg-white px-3 py-2 text-xs">
                  <div className="mb-1 text-gray-700">Lösenordskrav:</div>
                  <ul className="space-y-1">
                    {passwordIntegrityChecks.map((check) => (
                      <li key={check.label} className={`flex items-center gap-2 ${check.isValid ? 'text-emerald-700' : 'text-gray-500'}`}>
                        <span className="inline-flex h-3.5 w-3.5 items-center justify-center">
                          {check.isValid && <Check className="h-3.5 w-3.5 text-emerald-600" />}
                        </span>
                        <span>{check.label}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mb-3 mt-3 flex justify-end gap-4 pt-4">
                  <button
                    type="button"
                    onClick={handleClosePasswordModal}
                    className="bg-orange-400 p-[5px] px-10 text-xs text-white shadow-md/30 hover:bg-orange-600"
                  >
                    Avbryt
                  </button>
                  <button
                    type="submit"
                    disabled={isResettingSelectedPassword}
                    className="bg-lime-700 p-[5px] px-10 text-xs text-white shadow-md/30 hover:bg-lime-900 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Spara
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}