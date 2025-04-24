import { db } from "@/lib/firebase"
import { doc, getDoc, updateDoc, setDoc, arrayUnion } from "firebase/firestore"
import { nanoid } from "nanoid"

/**
 * Generate a unique invite code for a group
 * @returns A unique invite code
 */
export function generateInviteCode(): string {
  return nanoid(10)
}

/**
 * Create an invite link for a group
 * @param groupId The ID of the group
 * @param createdBy The ID of the user who created the invite
 * @returns The invite code
 */
export async function createGroupInvite(groupId: string, createdBy: string): Promise<string> {
  try {
    // Generate a unique invite code
    const inviteCode = generateInviteCode()

    // Store the invite in Firestore
    await setDoc(doc(db, "groupInvites", inviteCode), {
      groupId,
      createdBy,
      createdAt: new Date().toISOString(),
      active: true,
    })

    // Update the group with the invite code
    await updateDoc(doc(db, "groups", groupId), {
      inviteCode,
      inviteCreatedAt: new Date().toISOString(),
    })

    return inviteCode
  } catch (error) {
    console.error("Error creating group invite:", error)
    throw error
  }
}

/**
 * Get a group invite by its code
 * @param inviteCode The invite code
 * @returns The invite data or null if not found
 */
export async function getGroupInvite(inviteCode: string) {
  try {
    const inviteDoc = await getDoc(doc(db, "groupInvites", inviteCode))

    if (!inviteDoc.exists() || !inviteDoc.data().active) {
      return null
    }

    const invite = inviteDoc.data()
    const groupDoc = await getDoc(doc(db, "groups", invite.groupId))

    if (!groupDoc.exists()) {
      return null
    }

    return {
      invite: { id: inviteDoc.id, ...invite },
      group: { id: groupDoc.id, ...groupDoc.data() },
    }
  } catch (error) {
    console.error("Error getting group invite:", error)
    return null
  }
}

/**
 * Join a group using an invite code
 * @param inviteCode The invite code
 * @param userId The ID of the user joining the group
 * @returns True if successful, false otherwise
 */
export async function joinGroupWithInvite(inviteCode: string, userId: string): Promise<boolean> {
  try {
    const inviteData = await getGroupInvite(inviteCode)

    if (!inviteData) {
      return false
    }

    const { group } = inviteData

    // Check if user is already a member
    if (group.members.includes(userId)) {
      return true
    }

    // Add user to group members
    await updateDoc(doc(db, "groups", group.id), {
      members: arrayUnion(userId),
    })

    return true
  } catch (error) {
    console.error("Error joining group with invite:", error)
    return false
  }
}

/**
 * Deactivate a group invite
 * @param inviteCode The invite code
 * @returns True if successful, false otherwise
 */
export async function deactivateGroupInvite(inviteCode: string): Promise<boolean> {
  try {
    await updateDoc(doc(db, "groupInvites", inviteCode), {
      active: false,
    })

    return true
  } catch (error) {
    console.error("Error deactivating group invite:", error)
    return false
  }
}

/**
 * Check if a user can add members to a group
 * @param groupId The ID of the group
 * @param userId The ID of the user
 * @returns True if the user can add members, false otherwise
 */
export async function canAddMembers(groupId: string, userId: string): Promise<boolean> {
  try {
    const groupDoc = await getDoc(doc(db, "groups", groupId))

    if (!groupDoc.exists()) {
      return false
    }

    const group = groupDoc.data()

    // Check if the user is a member of the group
    if (!group.members.includes(userId)) {
      return false
    }

    // If adminOnlyInvites is true, only admins can add members
    if (group.adminOnlyInvites && !group.admins.includes(userId)) {
      return false
    }

    return true
  } catch (error) {
    console.error("Error checking if user can add members:", error)
    return false
  }
}
