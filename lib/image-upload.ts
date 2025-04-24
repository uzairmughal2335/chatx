/**
 * Uploads an image to ImgBB and returns the URL
 * @param file The image file to upload
 * @returns The URL of the uploaded image
 */
export async function uploadImageToImgBB(file: File): Promise<string> {
  try {
    // Convert the file to base64
    const base64 = await fileToBase64(file)
    const base64Data = base64.split(",")[1] // Remove the data:image/jpeg;base64, part

    // Create form data
    const formData = new FormData()
    formData.append("image", base64Data)

    // ImgBB API key - in a real app, this would be an environment variable
    // For demo purposes, we're using a free API key with limited uploads
    const apiKey = "6df2b4e0d48735b758b92874ac0b73d9"

    // Upload to ImgBB
    const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
      method: "POST",
      body: formData,
    })

    const data = await response.json()

    if (!data.success) {
      throw new Error(data.error?.message || "Failed to upload image")
    }

    // Return the image URL
    return data.data.url
  } catch (error) {
    console.error("Error uploading image:", error)
    throw error
  }
}

/**
 * Converts a file to base64
 * @param file The file to convert
 * @returns A promise that resolves to the base64 string
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = (error) => reject(error)
  })
}
