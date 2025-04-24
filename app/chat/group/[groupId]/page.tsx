"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { onAuthStateChanged } from "firebase/auth"
import { doc, getDoc, collection, query, orderBy, onSnapshot, addDoc, updateDoc, arrayUnion } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, Send, ArrowLeft, Users } from "lucide-react"
import LoadingScreen from "@/components/loading-screen"
import { getUserById } from "@/lib/user-service"
import MessageItem from "@/components/chat/message-item"
import MessageOptionsMenu from "@/components/chat/message-options-menu"
import GroupInfoDialog from "@/components/chat/group-info-dialog"

export default function GroupChatPage({ params }: { params: { groupId: string } }) {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [group, setGroup] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [message, setMessage] = useState("")
  const [sending, setSending] = useState(false)
  const [selectedMessage, setSelectedMessage] = useState<any>(null)
  const [groupInfoOpen, setGroupInfoOpen] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push("/auth")
        return
      }

      try {
        // Get current user data
        const userData = await getUserById(currentUser.uid)
        setUser(userData)

        // Get group data
        const groupDoc = await getDoc(doc(db, "groups", params.groupId))

        if (!groupDoc.exists()) {
          router.push("/chat")
          return
        }

        const groupData = groupDoc.data()
        setGroup(groupData)

        // Mark messages as read
        if (
          groupData.lastMessage &&
          groupData.lastMessage.senderId !== currentUser.uid &&
          (!groupData.lastMessage.readBy || !groupData.lastMessage.readBy.includes(currentUser.uid))
        ) {
          await updateDoc(doc(db, "groups", params.groupId), {
            "lastMessage.readBy": arrayUnion(currentUser.uid),
          })
        }
      } catch (error) {
        console.error("Error fetching group data:", error)
      } finally {
        setLoading(false)
      }
    })

    return () => unsubscribe()
  }, [router, params.groupId])

  useEffect(() => {
    if (!user?.uid) return

    // Subscribe to messages
    const messagesRef = collection(db, `groups/${params.groupId}/messages`)
    const q = query(messagesRef, orderBy("createdAt", "asc"))

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messageList: any[] = []
      snapshot.forEach((doc) => {
        messageList.push({ id: doc.id, ...doc.data() })
      })
      setMessages(messageList)
      scrollToBottom()

      // Mark messages as read
      messageList.forEach(async (msg) => {
        if (msg.senderId !== user.uid && (!msg.readBy || !msg.readBy.includes(user.uid))) {
          await updateDoc(doc(db, `groups/${params.groupId}/messages`, msg.id), {
            readBy: arrayUnion(user.uid),
          })
        }
      })
    })

    return () => unsubscribe()
  }, [user, params.groupId])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!message.trim() || !user) return

    setSending(true)

    try {
      const newMessage = {
        text: message.trim(),
        senderId: user.uid,
        senderName: user.name || user.username,
        senderUsername: user.username,
        senderProfilePic: user.profilePic || "",
        senderVerified: user.verified || false,
        createdAt: new Date().toISOString(),
        readBy: [user.uid],
      }

      // Add message to subcollection
      await addDoc(collection(db, `groups/${params.groupId}/messages`), newMessage)

      // Update group with last message
      await updateDoc(doc(db, "groups", params.groupId), {
        lastMessage: newMessage,
        lastMessageAt: new Date().toISOString(),
      })

      setMessage("")
      scrollToBottom()
    } catch (error) {
      console.error("Error sending message:", error)
    } finally {
      setSending(false)
    }
  }

  const handleMessageOptions = (message: any) => {
    setSelectedMessage(message)
  }

  const handleBack = () => {
    router.push("/chat")
  }

  if (loading) {
    return <LoadingScreen />
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 shadow-sm">
        <div className="flex items-center">
          <Button variant="ghost" size="icon" onClick={handleBack} className="mr-2">
            <ArrowLeft className="h-5 w-5" />
          </Button>

          <Avatar className="h-10 w-10">
            {group?.groupPic ? (
              <AvatarImage src={group.groupPic || "/placeholder.svg"} alt={group?.name} />
            ) : (
              <AvatarFallback className="bg-blue-100 text-blue-600">
                {group?.name?.charAt(0) || <Users className="h-5 w-5" />}
              </AvatarFallback>
            )}
          </Avatar>

          <div className="ml-3 flex-1">
            <h2 className="font-medium">{group?.name || "Group Chat"}</h2>
            <p className="text-xs text-gray-500">{group?.members?.length || 0} members</p>
          </div>

          <Button variant="ghost" size="icon" onClick={() => setGroupInfoOpen(true)}>
            <Users className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length > 0 ? (
          messages.map((msg) => (
            <MessageItem
              key={msg.id}
              message={msg}
              isCurrentUser={msg.senderId === user?.uid}
              onOptions={() => msg.senderId !== "system" && handleMessageOptions(msg)}
            />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-gray-500">No messages yet. Start the conversation!</p>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message input */}
      <div className="p-4 border-t bg-white">
        <form onSubmit={sendMessage} className="flex space-x-2">
          <Input
            placeholder="Type a message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={sending}
          />
          <Button type="submit" disabled={sending || !message.trim()}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </div>

      {/* Message options menu */}
      <MessageOptionsMenu
        message={selectedMessage}
        isCurrentUser={selectedMessage?.senderId === user?.uid}
        chatId={`groups/${params.groupId}`}
        onClose={() => setSelectedMessage(null)}
      />

      {/* Group info dialog */}
      <GroupInfoDialog
        group={group}
        groupId={params.groupId}
        currentUser={user}
        open={groupInfoOpen}
        onOpenChange={setGroupInfoOpen}
      />
    </div>
  )
}
