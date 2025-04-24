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
import { Badge } from "@/components/ui/badge"
import { Loader2, Send, ArrowLeft, MoreVertical, CheckCheck } from "lucide-react"
import LoadingScreen from "@/components/loading-screen"
import { getUserById } from "@/lib/user-service"
import MessageItem from "@/components/chat/message-item"
import MessageOptionsMenu from "@/components/chat/message-options-menu"

export default function ChatPage({ params }: { params: { chatId: string } }) {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [otherUser, setOtherUser] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [message, setMessage] = useState("")
  const [sending, setSending] = useState(false)
  const [selectedMessage, setSelectedMessage] = useState<any>(null)
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

        // Get chat data
        const chatDoc = await getDoc(doc(db, "chats", params.chatId))

        if (!chatDoc.exists()) {
          router.push("/chat")
          return
        }

        const chatData = chatDoc.data()

        // Find the other participant's ID
        const otherUserId = chatData.participants.find((id: string) => id !== currentUser.uid)

        if (otherUserId) {
          const otherUserData = await getUserById(otherUserId)
          setOtherUser(otherUserData)
        }

        // Mark messages as read
        if (
          chatData.lastMessage &&
          chatData.lastMessage.senderId !== currentUser.uid &&
          (!chatData.lastMessage.readBy || !chatData.lastMessage.readBy.includes(currentUser.uid))
        ) {
          await updateDoc(doc(db, "chats", params.chatId), {
            "lastMessage.readBy": arrayUnion(currentUser.uid),
          })
        }
      } catch (error) {
        console.error("Error fetching chat data:", error)
      } finally {
        setLoading(false)
      }
    })

    return () => unsubscribe()
  }, [router, params.chatId])

  useEffect(() => {
    if (!user?.uid) return

    // Subscribe to messages
    const messagesRef = collection(db, `chats/${params.chatId}/messages`)
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
          await updateDoc(doc(db, `chats/${params.chatId}/messages`, msg.id), {
            readBy: arrayUnion(user.uid),
          })
        }
      })
    })

    return () => unsubscribe()
  }, [user, params.chatId])

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
        createdAt: new Date().toISOString(),
        readBy: [user.uid],
      }

      // Add message to subcollection
      await addDoc(collection(db, `chats/${params.chatId}/messages`), newMessage)

      // Update chat with last message
      await updateDoc(doc(db, "chats", params.chatId), {
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
            <AvatarImage src={otherUser?.profilePic || ""} alt={otherUser?.name} />
            <AvatarFallback>{otherUser?.name?.charAt(0) || otherUser?.username?.charAt(0) || "?"}</AvatarFallback>
          </Avatar>

          <div className="ml-3 flex-1">
            <div className="flex items-center">
              <h2 className="font-medium">{otherUser?.name || otherUser?.username || "Chat"}</h2>
              {otherUser?.verified && (
                <Badge variant="outline" className="ml-1 bg-blue-100 text-blue-800 border-blue-200">
                  <CheckCheck className="h-3 w-3 mr-1" />
                  <span className="text-xs">Verified</span>
                </Badge>
              )}
            </div>
            <p className="text-xs text-gray-500">{otherUser?.online ? "Online" : "Offline"}</p>
          </div>

          <Button variant="ghost" size="icon">
            <MoreVertical className="h-5 w-5" />
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
            <p className="text-gray-500">No messages yet. Say hello!</p>
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
        chatId={params.chatId}
        onClose={() => setSelectedMessage(null)}
      />
    </div>
  )
}
