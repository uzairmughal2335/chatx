"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { collection, doc, addDoc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
  Loader2,
  Upload,
  Users,
  UserPlus,
  LogOut,
  MoreVertical,
  AlertCircle,
  LinkIcon,
  Copy,
  RefreshCw,
  Settings,
} from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Switch } from "@/components/ui/switch"
import { uploadImageToImgBB } from "@/lib/image-upload"
import { getUserByUsername, getUserById } from "@/lib/user-service"
import { createGroupInvite } from "@/lib/group-service"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface GroupInfoDialogProps {
  group: any
  groupId: string
  currentUser: any
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function GroupInfoDialog({ group, groupId, currentUser, open, onOpenChange }: GroupInfoDialogProps) {
  const [activeTab, setActiveTab] = useState("members")
  const [groupName, setGroupName] = useState(group?.name || "")
  const [groupDescription, setGroupDescription] = useState(group?.description || "")
  const [groupPic, setGroupPic] = useState<File | null>(null)
  const [groupPicPreview, setGroupPicPreview] = useState<string | null>(group?.groupPic || null)
  const [newMemberUsername, setNewMemberUsername] = useState("")
  const [loading, setLoading] = useState(false)
  const [inviteLoading, setInviteLoading] = useState(false)
  const [imageUploading, setImageUploading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [inviteLink, setInviteLink] = useState("")
  const [inviteCopied, setInviteCopied] = useState(false)
  const [adminOnlyInvites, setAdminOnlyInvites] = useState(group?.adminOnlyInvites || false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const isAdmin = group?.admins?.includes(currentUser?.uid)
  const baseUrl = typeof window !== "undefined" ? `${window.location.origin}/invite/` : ""

  useEffect(() => {
    if (group?.inviteCode) {
      setInviteLink(`${baseUrl}${group.inviteCode}`)
    }
    setAdminOnlyInvites(group?.adminOnlyInvites || false)
  }, [group, baseUrl])

  const handleGroupPicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

    setGroupPic(file)

    // Create preview
    const reader = new FileReader()
    reader.onload = () => {
      setGroupPicPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  const handleUpdateGroup = async () => {
    if (!groupName.trim() || !currentUser) return

    setLoading(true)
    setError("")
    setSuccess("")

    try {
      let groupPicUrl = group?.groupPic || ""

      // Upload group pic if selected
      if (groupPic) {
        setImageUploading(true)
        try {
          groupPicUrl = await uploadImageToImgBB(groupPic)
        } catch (error) {
          console.error("Error uploading group picture:", error)
          setError("Failed to upload group picture. Please try again.")
          setLoading(false)
          setImageUploading(false)
          return
        }
        setImageUploading(false)
      }

      await updateDoc(doc(db, "groups", groupId), {
        name: groupName.trim(),
        description: groupDescription.trim(),
        groupPic: groupPicUrl,
        adminOnlyInvites,
        updatedAt: new Date().toISOString(),
      })

      setSuccess("Group updated successfully!")
      setTimeout(() => setSuccess(""), 3000)
    } catch (error) {
      console.error("Error updating group:", error)
      setError("Failed to update group. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleAddMember = async () => {
    if (!newMemberUsername.trim() || !currentUser) return

    // Check if user can add members
    if (adminOnlyInvites && !isAdmin) {
      setError("Only admins can add members to this group")
      return
    }

    setLoading(true)
    setError("")

    try {
      // Find user by username
      const user = await getUserByUsername(newMemberUsername.trim())

      if (!user) {
        setError("User not found. Please check the username and try again.")
        setLoading(false)
        return
      }

      if (group.members.includes(user.uid)) {
        setError("This user is already a member of the group.")
        setLoading(false)
        return
      }

      // Add user to group members
      await updateDoc(doc(db, "groups", groupId), {
        members: arrayUnion(user.uid),
      })

      // Create a system message
      const systemMessage = {
        text: `${currentUser.name || currentUser.username} added ${user.name || user.username} to the group`,
        senderId: "system",
        senderName: "ChatX System",
        createdAt: new Date().toISOString(),
        readBy: [currentUser.uid],
      }

      // Add message to subcollection
      await addDoc(collection(db, `groups/${groupId}/messages`), systemMessage)

      // Update group with last message
      await updateDoc(doc(db, "groups", groupId), {
        lastMessage: systemMessage,
        lastMessageAt: new Date().toISOString(),
      })

      setNewMemberUsername("")
      setSuccess("Member added successfully!")
      setTimeout(() => setSuccess(""), 3000)
    } catch (error) {
      console.error("Error adding member:", error)
      setError("Failed to add member. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleLeaveGroup = async () => {
    if (!currentUser) return

    setLoading(true)

    try {
      // Create a system message about leaving
      const systemMessage = {
        text: `${currentUser.name || currentUser.username} has left the group`,
        senderId: "system",
        senderName: "ChatX System",
        createdAt: new Date().toISOString(),
        readBy: [],
      }

      // Add message to subcollection
      await addDoc(collection(db, `groups/${groupId}/messages`), systemMessage)

      // Update group with last message
      await updateDoc(doc(db, "groups", groupId), {
        lastMessage: systemMessage,
        lastMessageAt: new Date().toISOString(),
        members: arrayRemove(currentUser.uid),
        admins: arrayRemove(currentUser.uid),
      })

      router.push("/chat")
    } catch (error) {
      console.error("Error leaving group:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleMemberAction = async (memberId: string, action: string) => {
    if (!isAdmin || !currentUser) return

    setLoading(true)

    try {
      // Fetch the member's data to get their name
      const memberData = await getUserById(memberId)
      const memberName = memberData?.name || memberData?.username || "A user"

      if (action === "makeAdmin") {
        await updateDoc(doc(db, "groups", groupId), {
          admins: arrayUnion(memberId),
        })

        // Create a system message
        const systemMessage = {
          text: `${currentUser.name || currentUser.username} made ${memberName} an admin`,
          senderId: "system",
          senderName: "ChatX System",
          createdAt: new Date().toISOString(),
          readBy: [currentUser.uid],
        }

        // Add message to subcollection
        await addDoc(collection(db, `groups/${groupId}/messages`), systemMessage)

        // Update group with last message
        await updateDoc(doc(db, "groups", groupId), {
          lastMessage: systemMessage,
          lastMessageAt: new Date().toISOString(),
        })
      } else if (action === "removeAdmin") {
        await updateDoc(doc(db, "groups", groupId), {
          admins: arrayRemove(memberId),
        })

        // Create a system message
        const systemMessage = {
          text: `${currentUser.name || currentUser.username} removed admin status from ${memberName}`,
          senderId: "system",
          senderName: "ChatX System",
          createdAt: new Date().toISOString(),
          readBy: [currentUser.uid],
        }

        // Add message to subcollection
        await addDoc(collection(db, `groups/${groupId}/messages`), systemMessage)

        // Update group with last message
        await updateDoc(doc(db, "groups", groupId), {
          lastMessage: systemMessage,
          lastMessageAt: new Date().toISOString(),
        })
      } else if (action === "removeMember") {
        await updateDoc(doc(db, "groups", groupId), {
          members: arrayRemove(memberId),
          admins: arrayRemove(memberId),
        })

        // Create a system message
        const systemMessage = {
          text: `${currentUser.name || currentUser.username} removed ${memberName} from the group`,
          senderId: "system",
          senderName: "ChatX System",
          createdAt: new Date().toISOString(),
          readBy: [currentUser.uid],
        }

        // Add message to subcollection
        await addDoc(collection(db, `groups/${groupId}/messages`), systemMessage)

        // Update group with last message
        await updateDoc(doc(db, "groups", groupId), {
          lastMessage: systemMessage,
          lastMessageAt: new Date().toISOString(),
        })
      }

      setSuccess("Group updated successfully!")
      setTimeout(() => setSuccess(""), 3000)
    } catch (error) {
      console.error("Error updating member:", error)
      setError("Failed to update member. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const generateInviteLink = async () => {
    if (!currentUser) return

    // Check if user can generate invite links
    if (adminOnlyInvites && !isAdmin) {
      setError("Only admins can generate invite links for this group")
      return
    }

    setInviteLoading(true)
    setError("")

    try {
      const inviteCode = await createGroupInvite(groupId, currentUser.uid)
      setInviteLink(`${baseUrl}${inviteCode}`)
      setSuccess("Invite link generated successfully!")
      setTimeout(() => setSuccess(""), 3000)
    } catch (error) {
      console.error("Error generating invite link:", error)
      setError("Failed to generate invite link. Please try again.")
    } finally {
      setInviteLoading(false)
    }
  }

  const copyInviteLink = () => {
    if (!inviteLink) return

    navigator.clipboard.writeText(inviteLink)
    setInviteCopied(true)
    setTimeout(() => setInviteCopied(false), 2000)
  }

  const handleAdminOnlyInvitesChange = async (checked: boolean) => {
    if (!isAdmin) return

    setAdminOnlyInvites(checked)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Group Information</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="members" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="members">
              <Users className="h-4 w-4 mr-2" />
              Members
            </TabsTrigger>
            <TabsTrigger value="invite">
              <LinkIcon className="h-4 w-4 mr-2" />
              Invite
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="members" className="space-y-4">
            <div className="max-h-[300px] overflow-y-auto space-y-2">
              {group?.members?.map((memberId: string) => (
                <div key={memberId} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>{memberId.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">
                        {memberId === currentUser?.uid ? "You" : memberId}
                        {group?.admins?.includes(memberId) && (
                          <Badge variant="outline" className="ml-2 bg-blue-100 text-blue-800 border-blue-200">
                            Admin
                          </Badge>
                        )}
                      </p>
                    </div>
                  </div>

                  {isAdmin && memberId !== currentUser?.uid && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {!group?.admins?.includes(memberId) ? (
                          <DropdownMenuItem onClick={() => handleMemberAction(memberId, "makeAdmin")}>
                            Make Admin
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => handleMemberAction(memberId, "removeAdmin")}>
                            Remove Admin
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => handleMemberAction(memberId, "removeMember")}
                          className="text-red-500"
                        >
                          Remove from Group
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              ))}
            </div>

            {(!adminOnlyInvites || isAdmin) && (
              <div className="pt-4 border-t">
                <h3 className="text-sm font-medium mb-2">Add Member</h3>
                <div className="flex space-x-2">
                  <Input
                    placeholder="Enter username"
                    value={newMemberUsername}
                    onChange={(e) => setNewMemberUsername(e.target.value)}
                  />
                  <Button onClick={handleAddMember} disabled={!newMemberUsername.trim() || loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="invite" className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="bg-green-50 border-green-200">
                <AlertCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-600">{success}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              <h3 className="text-sm font-medium">Invite Link</h3>
              <p className="text-xs text-gray-500">
                Share this link with others to invite them to join this group.
                {adminOnlyInvites && !isAdmin && " Only admins can generate invite links for this group."}
              </p>

              <div className="flex space-x-2">
                <Input
                  value={inviteLink}
                  readOnly
                  placeholder="No invite link generated yet"
                  className="font-mono text-xs"
                />
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={copyInviteLink}
                        disabled={!inviteLink}
                        className="flex-shrink-0"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{inviteCopied ? "Copied!" : "Copy link"}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              {(!adminOnlyInvites || isAdmin) && (
                <Button
                  onClick={generateInviteLink}
                  disabled={inviteLoading}
                  className="w-full"
                  variant={inviteLink ? "outline" : "default"}
                >
                  {inviteLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      {inviteLink ? "Regenerate Invite Link" : "Generate Invite Link"}
                    </>
                  )}
                </Button>
              )}
            </div>

            {isAdmin && (
              <div className="pt-4 border-t">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium">Admin-only Invites</h3>
                    <p className="text-xs text-gray-500">Only admins can add members or generate invite links</p>
                  </div>
                  <Switch checked={adminOnlyInvites} onCheckedChange={handleAdminOnlyInvitesChange} />
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="bg-green-50 border-green-200">
                <AlertCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-600">{success}</AlertDescription>
              </Alert>
            )}

            <div className="flex flex-col items-center mb-4">
              <div className="relative mb-4">
                <Avatar className="h-20 w-20">
                  {groupPicPreview ? (
                    <AvatarImage src={groupPicPreview || "/placeholder.svg"} alt={groupName} />
                  ) : (
                    <AvatarFallback className="text-xl">{groupName?.charAt(0) || "G"}</AvatarFallback>
                  )}
                </Avatar>
                {isAdmin && (
                  <Button
                    size="icon"
                    variant="outline"
                    className="absolute bottom-0 right-0 rounded-full h-8 w-8"
                    onClick={triggerFileInput}
                    disabled={imageUploading}
                  >
                    {imageUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  </Button>
                )}
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleGroupPicChange}
                  disabled={imageUploading}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Group Name</label>
                <Input value={groupName} onChange={(e) => setGroupName(e.target.value)} disabled={!isAdmin} />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={groupDescription}
                  onChange={(e) => setGroupDescription(e.target.value)}
                  rows={3}
                  disabled={!isAdmin}
                />
              </div>

              {isAdmin && (
                <Button onClick={handleUpdateGroup} disabled={loading || !groupName.trim()} className="w-full">
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    "Update Group"
                  )}
                </Button>
              )}

              <div className="pt-4 border-t">
                <Button variant="destructive" className="w-full" onClick={handleLeaveGroup}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Leave Group
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
