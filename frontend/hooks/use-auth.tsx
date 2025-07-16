"use client"

import type React from "react"

import { useState, useEffect, createContext, useContext } from "react"
import { authService, type AuthUser } from "@/lib/auth"

interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<void>
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshUser = async () => {
    try {
      const currentUser = await authService.getCurrentUser()
      setUser(currentUser)
    } catch (error) {
      console.error("Error refreshing user:", error)
      setUser(null)
    }
  }

  useEffect(() => {
    refreshUser().finally(() => setLoading(false))
  }, [])

  const signIn = async (email: string, password: string) => {
    await authService.signIn({ email, password })
    await refreshUser()
  }

  const signUp = async (email: string, password: string, firstName: string, lastName: string) => {
    await authService.signUp({ email, password, firstName, lastName })
    await refreshUser()
  }

  const signOut = async () => {
    await authService.signOut()
    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signIn,
        signUp,
        signOut,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
