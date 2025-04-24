"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { onAuthStateChanged } from "firebase/auth"
import { collection, addDoc, doc, updateDoc } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Users, AlertCircle, CheckCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import LoadingScreen from "@/components/loading-screen"
import { getUserById } from "@/lib/user-service"
import { getGroupInvite, joinGroupWithInvite } from "@/lib/group-service"

export default function GroupInvitePage({ params }: { params: { inviteId: string } }) {
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [inviteData, setInviteData] = useState<any>(null)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push(`/auth?redirect=${encodeURIComponent(`/invite/${params.inviteId}`)}`)
        return
      }

      try {
        // Get current user data
        const userData = await getUserById(currentUser.uid)
        setUser(userData)

        // Get invite data
        const invite = await getGroupInvite(params.inviteId)

        if (!invite) {
          setError("Invalid or expired invite link")
          setLoading(false)
          return
        }

        setInviteData(invite)
      } catch (error) {
        console.error("Error fetching data:", error)
        setError("Failed to load invite information")
      } finally {
        setLoading(false)
      }
    })

    return () => unsubscribe()
  }, [router, params.inviteId])

  const handleJoinGroup = async () => {
    if (!user || !inviteData) return

    setJoining(true)
    setError("")

    try {
      const success = await joinGroupWithInvite(params.inviteId, user.uid)

      if (!success) {
        setError("Failed to join group. Please try again.")
        return
      }

      // Create a system message
      const systemMessage = {
        text: `${user.name || user.username} joined the group via invite link`,
        senderId: "system",
        senderName: "ChatX System",
        createdAt: new Date().toISOString(),
        readBy: [user.uid],
      }

      // Add message to subcollection
      await addDoc(collection(db, `groups/${inviteData.group.id}/messages`), systemMessage)

      // Update group with last message
      await updateDoc(doc(db, "groups", inviteData.group.id), {
        lastMessage: systemMessage,
        lastMessageAt: new Date().toISOString(),
      })

      setSuccess(true)

      // Redirect to group chat after a short delay
      setTimeout(() => {
        router.push(`/chat/group/${inviteData.group.id}`)
      }, 2000)
    } catch (error) {
      console.error("Error joining group:", error)
      setError("Failed to join group. Please try again.")
    } finally {
      setJoining(false)
    }
  }

  if (loading) {
    return <LoadingScreen />
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-blue-100 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-blue-600">ChatX</h1>
          <p className="text-gray-600 mt-2">Group Invitation</p>
        </div>

        {error ? (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : success ? (
          <Alert className="bg-green-50 border-green-200 mb-4">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-600">
              You have successfully joined the group! Redirecting...
            </AlertDescription>
          </Alert>
        ) : null}

        {inviteData && (
          <Card>
            <CardHeader>
              <CardTitle>Join Group</CardTitle>
              <CardDescription>You've been invited to join a group on ChatX</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              <Avatar className="h-20 w-20 mb-4">
                {inviteData.group.groupPic ? (
                  <AvatarImage src={inviteData.group.groupPic || "/placeholder.svg"} alt={inviteData.group.name} />
                ) : (
                  <AvatarFallback className="bg-blue-100 text-blue-600">
                    {inviteData.group.name?.charAt(0) || <Users className="h-10 w-10" />}
                  </AvatarFallback>
                )}
              </Avatar>
              <h2 className="text-xl font-bold mb-1">{inviteData.group.name}</h2>
              {inviteData.group.description && (
                <p className="text-gray-600 text-center mb-4">{inviteData.group.description}</p>
              )}
              <p className="text-sm text-gray-500">
                {inviteData.group.members?.length || 0} members • Created by{" "}
                {inviteData.group.createdBy === user?.uid ? "you" : "someone else"}
              </p>
            </CardContent>
            <CardFooter className="flex justify-center">
              {inviteData.group.members?.includes(user?.uid) ? (
                <Button variant="outline" onClick={() => router.push(`/chat/group/${inviteData.group.id}`)}>
                  You're already a member
                </Button>
              ) : (
                <Button onClick={handleJoinGroup} disabled={joining}>
                  {joining ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Joining...
                    </>
                  ) : (
                    "Join Group"
                  )}
                </Button>
              )}
            </CardFooter>
          </Card>
        )}
      </div>
    </div>
  )
}
