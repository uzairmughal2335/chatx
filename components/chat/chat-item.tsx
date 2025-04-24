"use client"

import { useState, useEffect } from "react"
import { db } from "@/lib/firebase"
import { doc, getDoc } from "firebase/firestore"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { CheckCheck } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface ChatItemProps {
  chat: any
  currentUser: any
  onClick: () => void
}

export default function ChatItem({ chat, currentUser, onClick }: ChatItemProps) {
  const [otherUser, setOtherUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchOtherUser = async () => {
      try {
        // Find the other participant's ID
        const otherUserId = chat.participants.find((id: string) => id !== currentUser.uid)

        if (otherUserId) {
          const userDoc = await getDoc(doc(db, "users", otherUserId))
          if (userDoc.exists()) {
            setOtherUser(userDoc.data())
          }
        }
      } catch (error) {
        console.error("Error fetching other user:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchOtherUser()
  }, [chat, currentUser])

  if (loading) {
    return null
  }

  const isRead = chat.lastMessage?.readBy?.includes(currentUser.uid)
  const lastMessageTime = chat.lastMessageAt
    ? formatDistanceToNow(new Date(chat.lastMessageAt), { addSuffix: true })
    : ""

  return (
    <div className={`p-4 hover:bg-gray-50 cursor-pointer ${!isRead ? "bg-blue-50" : ""}`} onClick={onClick}>
      <div className="flex items-center space-x-3">
        <Avatar className="h-12 w-12">
          <AvatarImage src={otherUser?.profilePic || ""} alt={otherUser?.name} />
          <AvatarFallback>{otherUser?.name?.charAt(0) || otherUser?.username?.charAt(0) || "?"}</AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <h3 className="font-medium truncate">{otherUser?.name || otherUser?.username || "Unknown User"}</h3>
              {otherUser?.verified && (
                <Badge variant="outline" className="ml-1 bg-blue-100 text-blue-800 border-blue-200">
                  <CheckCheck className="h-3 w-3 mr-1" />
                  <span className="text-xs">Verified</span>
                </Badge>
              )}
            </div>
            <span className="text-xs text-gray-500">{lastMessageTime}</span>
          </div>

          <div className="flex items-center justify-between mt-1">
            <p className="text-sm text-gray-600 truncate max-w-[200px]">
              {chat.lastMessage?.senderId === "system" ? (
                <span className="italic">{chat.lastMessage?.text || "No messages yet"}</span>
              ) : (
                chat.lastMessage?.text || "No messages yet"
              )}
            </p>
            {!isRead && chat.lastMessage?.senderId !== currentUser.uid && <Badge className="bg-blue-500">New</Badge>}
          </div>
        </div>
      </div>
    </div>
  )
}
