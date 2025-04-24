"use client"

import { useRouter } from "next/navigation"
import { db } from "@/lib/firebase"
import { collection, query, where, getDocs, doc, setDoc } from "firebase/firestore"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { CheckCheck, MessageSquare, Loader2 } from "lucide-react"
import { useState } from "react"

interface UserProfileModalProps {
  user: any
  currentUser: any
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function UserProfileModal({ user, currentUser, open, onOpenChange }: UserProfileModalProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  if (!user) return null

  const startChat = async () => {
    if (!user || !currentUser) return

    setLoading(true)

    try {
      // Check if chat already exists
      const chatsRef = collection(db, "chats")
      const q = query(chatsRef, where("participants", "array-contains", currentUser.uid))

      const querySnapshot = await getDocs(q)
      let existingChatId = null

      querySnapshot.forEach((doc) => {
        const chatData = doc.data()
        if (chatData.participants.includes(user.uid)) {
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
          participants: [currentUser.uid, user.uid],
          createdAt: new Date().toISOString(),
          lastMessageAt: new Date().toISOString(),
          lastMessage: null,
        })

        router.push(`/chat/${newChatRef.id}`)
      }

      onOpenChange(false)
    } catch (error) {
      console.error("Error starting chat:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>User Profile</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center text-center p-4">
          <Avatar className="h-24 w-24 mb-4">
            <AvatarImage src={user.profilePic || ""} alt={user.name} />
            <AvatarFallback className="text-2xl">
              {user.name?.charAt(0) || user.username?.charAt(0) || "?"}
            </AvatarFallback>
          </Avatar>

          <div className="flex items-center mb-1">
            <h2 className="text-xl font-bold">{user.name || user.username}</h2>
            {user.verified && (
              <Badge variant="outline" className="ml-2 bg-blue-100 text-blue-800 border-blue-200">
                <CheckCheck className="h-3 w-3 mr-1" />
                <span className="text-xs">Verified</span>
              </Badge>
            )}
          </div>

          <p className="text-gray-500 mb-3">@{user.username}</p>

          {user.bio && <p className="text-gray-700 mb-6">{user.bio}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={startChat} disabled={loading || user.uid === currentUser?.uid}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Starting chat...
              </>
            ) : (
              <>
                <MessageSquare className="mr-2 h-4 w-4" />
                Message
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
