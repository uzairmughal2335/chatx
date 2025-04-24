"use client"

import type React from "react"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from "firebase/auth"
import { doc, getDoc, setDoc } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, AlertCircle, User, Upload } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import GoogleButton from "./google-button"
import { checkUsernameExists } from "@/lib/user-service"
import { uploadImageToImgBB } from "@/lib/image-upload"

interface SignupFormProps {
  redirect?: string | null
}

export default function SignupForm({ redirect }: SignupFormProps) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [profilePic, setProfilePic] = useState<File | null>(null)
  const [profilePicPreview, setProfilePicPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [imageUploading, setImageUploading] = useState(false)
  const [usernameChecking, setUsernameChecking] = useState(false)
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null)
  const [error, setError] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

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

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!usernameAvailable) {
      setError("Please choose an available username")
      return
    }

    setLoading(true)
    setError("")

    try {
      let profilePicUrl = ""

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

      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      const user = userCredential.user

      // Create user profile in Firestore
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        name,
        email,
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
      if (error.code === "auth/email-already-in-use") {
        setError("Email already in use. Please login instead.")
      } else {
        setError("Failed to create account. Please try again.")
        console.error(error)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignup = async () => {
    setLoading(true)
    setError("")

    try {
      const provider = new GoogleAuthProvider()
      const result = await signInWithPopup(auth, provider)
      const user = result.user

      // Check if user exists in Firestore
      const userDoc = await getDoc(doc(db, "users", user.uid))

      if (!userDoc.exists()) {
        // New Google user, redirect to username setup
        if (redirect) {
          router.push(`/auth/username?redirect=${encodeURIComponent(redirect)}`)
        } else {
          router.push("/auth/username")
        }
      } else {
        // Existing user, go to chat or redirect
        if (redirect) {
          router.push(redirect)
        } else {
          router.push("/chat")
        }
      }
    } catch (error: any) {
      setError("Google sign-up failed. Please try again.")
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleEmailSignup} className="space-y-4">
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
          <Label htmlFor="name">Full Name</Label>
          <Input id="name" placeholder="John Doe" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="username" className="flex items-center justify-between">
            <span>Username</span>
            {usernameChecking ? (
              <span className="text-xs text-gray-500">Checking...</span>
            ) : usernameAvailable === true ? (
              <span className="text-xs text-green-600">Available</span>
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

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
          <p className="text-xs text-gray-500">Must be at least 6 characters long.</p>
        </div>

        <Button type="submit" className="w-full" disabled={loading || !usernameAvailable}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating account...
            </>
          ) : (
            <>
              <User className="mr-2 h-4 w-4" />
              Create Account
            </>
          )}
        </Button>
      </form>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-white px-2 text-gray-500">Or continue with</span>
        </div>
      </div>

      <GoogleButton onClick={handleGoogleSignup} disabled={loading} />
    </div>
  )
}
