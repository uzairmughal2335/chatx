import { db } from "@/lib/firebase"
import { doc, getDoc, setDoc } from "firebase/firestore"

export async function checkUsernameExists(username: string): Promise<boolean> {
  try {
    const usernameDoc = await getDoc(doc(db, "usernames", username))
    return usernameDoc.exists()
  } catch (error) {
    console.error("Error checking username:", error)
    return false
  }
}

export async function createUserProfile(
  uid: string,
  data: {
    name: string
    email: string
    username: string
    profilePic?: string
  },
) {
  try {
    // Create user profile in Firestore
    await setDoc(doc(db, "users", uid), {
      uid,
      name: data.name,
      email: data.email,
      username: data.username,
      profilePic: data.profilePic || "",
      bio: "",
      verified: false,
      verificationRequestDen: false,
      createdAt: new Date().toISOString(),
    })

    // Create username reference for uniqueness check
    await setDoc(doc(db, "usernames", data.username), {
      uid,
    })

    return true
  } catch (error) {
    console.error("Error creating user profile:", error)
    return false
  }
}

export async function getUserByUsername(username: string) {
  try {
    const usernameDoc = await getDoc(doc(db, "usernames", username))

    if (!usernameDoc.exists()) {
      return null
    }

    const uid = usernameDoc.data().uid
    const userDoc = await getDoc(doc(db, "users", uid))

    if (!userDoc.exists()) {
      return null
    }

    return userDoc.data()
  } catch (error) {
    console.error("Error getting user by username:", error)
    return null
  }
}

export async function getUserById(uid: string) {
  try {
    const userDoc = await getDoc(doc(db, "users", uid))

    if (!userDoc.exists()) {
      return null
    }

    return userDoc.data()
  } catch (error) {
    console.error("Error getting user by ID:", error)
    return null
  }
}
