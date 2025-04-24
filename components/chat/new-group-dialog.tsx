"use client"

import type React from "react"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { db } from "@/lib/firebase"
import { collection, doc, setDoc, addDoc, updateDoc } from "firebase/firestore"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Loader2, AlertCircle, Users, Upload } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Switch } from "@/components/ui/switch"
import { uploadImageToImgBB } from "@/lib/image-upload"
import { createGroupInvite } from "@/lib/group-service"

interface NewGroupDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentUser: any
}

export default function NewGroupDialog({ open, onOpenChange, currentUser }: NewGroupDialogProps) {
  const [groupName, setGroupName] = useState("")
  const [groupDescription, setGroupDescription] = useState("")
  const [groupPic, setGroupPic] = useState<File | null>(null)
  const [groupPicPreview, setGroupPicPreview] = useState<string | null>(null)
  const [adminOnlyInvites, setAdminOnlyInvites] = useState(false)
  const [loading, setLoading] = useState(false)
  const [imageUploading, setImageUploading] = useState(false)
  const [error, setError] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

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

  const createGroup = async () => {
    if (!groupName.trim() || !currentUser) return

    setLoading(true)
    setError("")

    try {
      let groupPicUrl = ""

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

      // Create new group
      const newGroupRef = doc(collection(db, "groups"))
      await setDoc(newGroupRef, {
        name: groupName.trim(),
        description: groupDescription.trim(),
        groupPic: groupPicUrl,
        createdBy: currentUser.uid,
        createdAt: new Date().toISOString(),
        lastMessageAt: new Date().toISOString(),
        members: [currentUser.uid],
        admins: [currentUser.uid],
        adminOnlyInvites: adminOnlyInvites,
      })

      // Create a system message
      const systemMessage = {
        text: `${currentUser.name || currentUser.username} has created the group "${groupName.trim()}"`,
        senderId: "system",
        senderName: "ChatX System",
        createdAt: new Date().toISOString(),
        readBy: [currentUser.uid],
      }

      // Add message to subcollection
      await addDoc(collection(db, `groups/${newGroupRef.id}/messages`), systemMessage)

      // Update group with last message
      await updateDoc(doc(db, "groups", newGroupRef.id), {
        lastMessage: systemMessage,
        lastMessageAt: new Date().toISOString(),
      })

      // Generate an invite link for the group
      await createGroupInvite(newGroupRef.id, currentUser.uid)

      router.push(`/chat/group/${newGroupRef.id}`)
      onOpenChange(false)
    } catch (error) {
      console.error("Error creating group:", error)
      setError("Failed to create group. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Group</DialogTitle>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <div className="flex flex-col items-center mb-2">
            <div className="relative mb-2">
              <Avatar className="h-20 w-20">
                {groupPicPreview ? (
                  <AvatarImage src={groupPicPreview || "/placeholder.svg"} alt="Group preview" />
                ) : (
                  <AvatarFallback>
                    <Users className="h-10 w-10 text-gray-400" />
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
                onChange={handleGroupPicChange}
                disabled={imageUploading}
              />
            </div>
            <p className="text-xs text-gray-500">Group picture (optional)</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="groupName">Group Name</Label>
            <Input
              id="groupName"
              placeholder="Enter group name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              maxLength={50}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="groupDescription">Description (optional)</Label>
            <Textarea
              id="groupDescription"
              placeholder="What's this group about?"
              value={groupDescription}
              onChange={(e) => setGroupDescription(e.target.value)}
              maxLength={200}
              rows={3}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Admin-only Invites</p>
              <p className="text-xs text-gray-500">Only admins can add members or generate invite links</p>
            </div>
            <Switch checked={adminOnlyInvites} onCheckedChange={setAdminOnlyInvites} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={createGroup} disabled={loading || !groupName.trim()}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Users className="mr-2 h-4 w-4" />
                Create Group
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
