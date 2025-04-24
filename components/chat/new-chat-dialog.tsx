"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { db } from "@/lib/firebase"
import { collection, query, where, getDocs, doc, setDoc, addDoc, updateDoc } from "firebase/firestore"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Search, AlertCircle, User } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { getUserByUsername } from "@/lib/user-service"

interface NewChatDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentUser: any
}

export default function NewChatDialog({ open, onOpenChange, currentUser }: NewChatDialogProps) {
  const [username, setUsername] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [foundUser, setFoundUser] = useState<any>(null)
  const router = useRouter()

  const handleSearch = async () => {
    if (!username.trim()) return

    setLoading(true)
    setError("")
    setFoundUser(null)

    try {
      const user = await getUserByUsername(username.trim())

      if (!user) {
        setError("User not found. Please check the username and try again.")
        return
      }

      if (user.uid === currentUser.uid) {
        setError("You cannot start a chat with yourself.")
        return
      }

      setFoundUser(user)
    } catch (error) {
      console.error("Error searching for user:", error)
      setError("An error occurred while searching for the user.")
    } finally {
      setLoading(false)
    }
  }

  const startChat = async () => {
    if (!foundUser || !currentUser) return

    setLoading(true)

    try {
      // Check if chat already exists
      const chatsRef = collection(db, "chats")
      const q = query(chatsRef, where("participants", "array-contains", currentUser.uid))

      const querySnapshot = await getDocs(q)
      let existingChatId = null

      querySnapshot.forEach((doc) => {
        const chatData = doc.data()
        if (chatData.participants.includes(foundUser.uid)) {
          existingChatId = doc.id
        }
      })

      if (existingChatId) {
        // Chat exists, navigate to it
        router.push(`/chat/${existingChatId}`)
      } else {
        // Create new chat
        const newChatRef = doc(collection(db, "chats"))
        await setDoc(newChatRef, {
          participants: [currentUser.uid, foundUser.uid],
          createdAt: new Date().toISOString(),
          lastMessageAt: new Date().toISOString(),
          lastMessage: null,
        })

        // Create a system message
        const systemMessage = {
          text: `${currentUser.name || currentUser.username} has started a chat with ${foundUser.name || foundUser.username}`,
          senderId: "system",
          senderName: "ChatX System",
          createdAt: new Date().toISOString(),
          readBy: [currentUser.uid, foundUser.uid],
        }

        // Add message to subcollection
        await addDoc(collection(db, `chats/${newChatRef.id}/messages`), systemMessage)

        // Update chat with last message
        await updateDoc(doc(db, "chats", newChatRef.id), {
          lastMessage: systemMessage,
          lastMessageAt: new Date().toISOString(),
        })

        router.push(`/chat/${newChatRef.id}`)
      }

      onOpenChange(false)
    } catch (error) {
      console.error("Error starting chat:", error)
      setError("Failed to start chat. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Chat</DialogTitle>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Enter username</Label>
            <div className="flex space-x-2">
              <Input
                id="username"
                placeholder="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
              <Button onClick={handleSearch} disabled={loading || !username.trim()}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {foundUser && (
            <div className="border rounded-lg p-4">
              <div className="flex items-center space-x-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={foundUser.profilePic || ""} alt={foundUser.name} />
                  <AvatarFallback>{foundUser.name?.charAt(0) || foundUser.username?.charAt(0) || "?"}</AvatarFallback>
                </Avatar>

                <div className="flex-1">
                  <div className="flex items-center">
                    <h3 className="font-medium">{foundUser.name || foundUser.username}</h3>
                    {foundUser.verified && <span className="ml-1 text-blue-500 text-xs">✓</span>}
                  </div>
                  <p className="text-sm text-gray-500">@{foundUser.username}</p>
                  {foundUser.bio && <p className="text-sm text-gray-600 mt-1">{foundUser.bio}</p>}
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={startChat} disabled={loading || !foundUser}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Starting chat...
              </>
            ) : (
              <>
                <User className="mr-2 h-4 w-4" />
                Start Chat
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
