"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { onAuthStateChanged } from "firebase/auth"
import { doc, setDoc, getDoc } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, AlertCircle, Check, Upload, User } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { checkUsernameExists } from "@/lib/user-service"
import { uploadImageToImgBB } from "@/lib/image-upload"

export default function UsernameSetupPage() {
  const [username, setUsername] = useState("")
  const [profilePic, setProfilePic] = useState<File | null>(null)
  const [profilePicPreview, setProfilePicPreview] = useState<string | null>(null)
  const [googleUser, setGoogleUser] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [imageUploading, setImageUploading] = useState(false)
  const [usernameChecking, setUsernameChecking] = useState(false)
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null)
  const [error, setError] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams?.get("redirect")

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/auth")
      } else {
        // Check if user already has a username
        const userDoc = await getDoc(doc(db, "users", user.uid))
        if (userDoc.exists() && userDoc.data().username) {
          if (redirect) {
            router.push(redirect)
          } else {
            router.push("/chat")
          }
        } else {
          // Set Google user data for profile pic preview
          setGoogleUser(user)
          setProfilePicPreview(user.photoURL)
        }
      }
      setInitialLoading(false)
    })

    return () => unsubscribe()
  }, [router, redirect])

  const checkUsername = async (username: string) => {
    if (username.length < 3) {
      setUsernameAvailable(null)
      return
    }

    setUsernameChecking(true)
    const exists = await checkUsernameExists(username)
    setUsernameAvailable(!exists)
    setUsernameChecking(false)
  }

  const handleProfilePicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Check file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError("Image size should be less than 2MB")
      return
    }

    // Check file type
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file")
      return
    }

    setProfilePic(file)

    // Create preview
    const reader = new FileReader()
    reader.onload = () => {
      setProfilePicPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!usernameAvailable) {
      setError("Please choose an available username")
      return
    }

    setLoading(true)
    setError("")

    try {
      const user = auth.currentUser
      if (!user) {
        throw new Error("User not authenticated")
      }

      let profilePicUrl = user.photoURL || ""

      // Upload profile pic if selected
      if (profilePic) {
        setImageUploading(true)
        try {
          profilePicUrl = await uploadImageToImgBB(profilePic)
        } catch (error) {
          console.error("Error uploading profile picture:", error)
          setError("Failed to upload profile picture. Please try again.")
          setLoading(false)
          setImageUploading(false)
          return
        }
        setImageUploading(false)
      }

      // Create user profile in Firestore
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        name: user.displayName || "",
        email: user.email,
        username,
        profilePic: profilePicUrl,
        bio: "",
        verified: false,
        verificationRequestDen: false,
        createdAt: new Date().toISOString(),
      })

      // Create username reference for uniqueness check
      await setDoc(doc(db, "usernames", username), {
        uid: user.uid,
      })

      if (redirect) {
        router.push(redirect)
      } else {
        router.push("/chat")
      }
    } catch (error: any) {
      setError("Failed to set username. Please try again.")
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  if (initialLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-blue-100 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-blue-600">ChatX</h1>
          <p className="text-gray-600 mt-2">Complete your profile</p>
          {redirect && (
            <p className="text-sm text-blue-600 mt-2">You'll be redirected after setting up your username</p>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex flex-col items-center mb-4">
              <div className="relative mb-2">
                <Avatar className="h-20 w-20">
                  {profilePicPreview ? (
                    <AvatarImage src={profilePicPreview || "/placeholder.svg"} alt="Profile preview" />
                  ) : (
                    <AvatarFallback>
                      <User className="h-10 w-10 text-gray-400" />
                    </AvatarFallback>
                  )}
                </Avatar>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className="absolute bottom-0 right-0 rounded-full h-8 w-8"
                  onClick={triggerFileInput}
                  disabled={imageUploading}
                >
                  {imageUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                </Button>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleProfilePicChange}
                  disabled={imageUploading}
                />
              </div>
              <p className="text-xs text-gray-500">Profile picture (optional)</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="username" className="flex items-center justify-between">
                <span>Username</span>
                {usernameChecking ? (
                  <span className="text-xs text-gray-500">Checking...</span>
                ) : usernameAvailable === true ? (
                  <span className="text-xs text-green-600 flex items-center">
                    <Check className="h-3 w-3 mr-1" /> Available
                  </span>
                ) : usernameAvailable === false ? (
                  <span className="text-xs text-red-600">Already taken</span>
                ) : null}
              </Label>
              <Input
                id="username"
                placeholder="johndoe"
                value={username}
                onChange={(e) => {
                  const value = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "")
                  setUsername(value)
                  checkUsername(value)
                }}
                required
                minLength={3}
                maxLength={20}
                className={
                  usernameAvailable === true ? "border-green-500" : usernameAvailable === false ? "border-red-500" : ""
                }
              />
              <p className="text-xs text-gray-500">Only letters, numbers, and underscores. Min 3 characters.</p>
            </div>

            <Button type="submit" className="w-full" disabled={loading || !usernameAvailable}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Setting username...
                </>
              ) : (
                "Continue to ChatX"
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
