"use client"

import type React from "react"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { signOut } from "firebase/auth"
import { doc, updateDoc } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LogOut, User, Settings, Shield, CheckCheck, Upload, Loader2, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { checkUsernameExists } from "@/lib/user-service"
import { uploadImageToImgBB } from "@/lib/image-upload"

interface ProfileSectionProps {
  user: any
}

export default function ProfileSection({ user }: ProfileSectionProps) {
  const [activeTab, setActiveTab] = useState("profile")
  const [name, setName] = useState(user?.name || "")
  const [bio, setBio] = useState(user?.bio || "")
  const [username, setUsername] = useState(user?.username || "")
  const [profilePic, setProfilePic] = useState<File | null>(null)
  const [profilePicPreview, setProfilePicPreview] = useState<string | null>(user?.profilePic || null)
  const [usernameChecking, setUsernameChecking] = useState(false)
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(false)
  const [imageUploading, setImageUploading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const checkUsername = async (username: string) => {
    if (username === user?.username) {
      setUsernameAvailable(true)
      return
    }

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

  const handleUpdateProfile = async () => {
    if (!user?.uid) return

    if (username !== user.username && !usernameAvailable) {
      setError("Please choose an available username")
      return
    }

    setLoading(true)
    setError("")
    setSuccess("")

    try {
      let profilePicUrl = user.profilePic || ""

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

      // Update user profile in Firestore
      await updateDoc(doc(db, "users", user.uid), {
        name,
        bio,
        profilePic: profilePicUrl,
        username: username !== user.username ? username : user.username,
        updatedAt: new Date().toISOString(),
      })

      // If username changed, update the username reference
      if (username !== user.username) {
        // Delete old username reference
        // In a real app, you would use a transaction to ensure atomicity
        // await deleteDoc(doc(db, "usernames", user.username));
        // Create new username reference
        // await setDoc(doc(db, "usernames", username), {
        //   uid: user.uid
        // });
      }

      setSuccess("Profile updated successfully!")
    } catch (error) {
      console.error("Error updating profile:", error)
      setError("Failed to update profile. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await signOut(auth)
      router.push("/auth")
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  const handleVerificationRequest = () => {
    // In a real app, you would send a verification request to the server
    // For this example, we'll open a mailto link
    const subject = "Verification Request for ChatX"
    const body = `
Username: ${user?.username}
Email: ${user?.email}
UID: ${user?.uid}
    `

    window.open(`mailto:uzairxdev223@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`)
  }

  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="p-4 max-w-md mx-auto">
      <div className="flex flex-col items-center mb-6">
        <div className="relative mb-4">
          <Avatar className="h-24 w-24">
            {profilePicPreview ? (
              <AvatarImage src={profilePicPreview || "/placeholder.svg"} alt={user?.name} />
            ) : (
              <AvatarFallback className="text-2xl">
                {user?.name?.charAt(0) || user?.username?.charAt(0) || "?"}
              </AvatarFallback>
            )}
          </Avatar>
          <Button
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

        <div className="flex items-center mb-1">
          <h2 className="text-xl font-bold">{user?.name || user?.username}</h2>
          {user?.verified && (
            <Badge variant="outline" className="ml-2 bg-blue-100 text-blue-800 border-blue-200">
              <CheckCheck className="h-3 w-3 mr-1" />
              <span className="text-xs">Verified</span>
            </Badge>
          )}
        </div>

        <p className="text-gray-500">@{user?.username}</p>
      </div>

      <Tabs defaultValue="profile" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="profile">
            <User className="h-4 w-4 mr-2" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </TabsTrigger>
          <TabsTrigger value="verification">
            <Shield className="h-4 w-4 mr-2" />
            Verification
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCheck className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-600">{success}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input id="name" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
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
              placeholder="username"
              value={username}
              onChange={(e) => {
                const value = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "")
                setUsername(value)
                checkUsername(value)
              }}
              className={
                usernameAvailable === true ? "border-green-500" : usernameAvailable === false ? "border-red-500" : ""
              }
            />
            <p className="text-xs text-gray-500">Only letters, numbers, and underscores. Min 3 characters.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              placeholder="Tell us about yourself"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              maxLength={200}
            />
            <p className="text-xs text-gray-500">{bio.length}/200 characters</p>
          </div>

          <Button
            onClick={handleUpdateProfile}
            disabled={loading || (username !== user?.username && !usernameAvailable)}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              "Update Profile"
            )}
          </Button>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Privacy Settings</h3>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Show online status</p>
                <p className="text-sm text-gray-500">Allow others to see when you're online</p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Read receipts</p>
                <p className="text-sm text-gray-500">Let others know when you've read their messages</p>
              </div>
              <Switch defaultChecked />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium">Notification Settings</h3>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Message notifications</p>
                <p className="text-sm text-gray-500">Get notified when you receive new messages</p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Group notifications</p>
                <p className="text-sm text-gray-500">Get notified about activity in your groups</p>
              </div>
              <Switch defaultChecked />
            </div>
          </div>

          <div className="pt-6 border-t">
            <Button variant="destructive" className="w-full" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="verification" className="space-y-4">
          {user?.verified ? (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
              <div className="flex justify-center mb-2">
                <Badge className="bg-blue-500 px-3 py-1 text-white">
                  <CheckCheck className="h-4 w-4 mr-1" />
                  Verified
                </Badge>
              </div>
              <p className="text-blue-800">Your account is verified. Enjoy all the benefits!</p>
            </div>
          ) : user?.verificationRequestDen ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
              <p className="text-red-800 mb-2">Your verification request has been denied.</p>
              <p className="text-gray-600 mb-4">Please contact support for more information.</p>
              <Button variant="outline" onClick={() => window.open("mailto:uzairxdev223@gmail.com")}>
                Contact Support
              </Button>
            </div>
          ) : (
            <>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium mb-2">Verification Badge</h3>
                <p className="text-gray-600 mb-4">
                  Get a blue verification badge to show others that your account is authentic.
                </p>
                <ul className="list-disc pl-5 mb-4 text-gray-600">
                  <li>Show that your account is authentic</li>
                  <li>Build trust with other users</li>
                  <li>Stand out in chats and groups</li>
                </ul>
                <Button onClick={handleVerificationRequest} className="w-full">
                  Request Verification
                </Button>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h3 className="font-medium mb-2">Verification Process</h3>
                <p className="text-gray-600">
                  When you request verification, we'll review your account to confirm it's authentic. This process may
                  take a few days.
                </p>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
