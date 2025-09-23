// Offline Face Matching Service
// Based on MOSIP's tflite/ML Kit implementation

export interface FaceImage {
  data: Uint8Array
  format: 'jpeg' | 'png' | 'webp'
  width: number
  height: number
}

export interface FaceMatchConfig {
  confidenceThreshold: number
  maxFaces: number
  modelPath: string
}

export interface FaceDetectionResult {
  faces: Array<{
    boundingBox: { x: number; y: number; width: number; height: number }
    landmarks: Array<{ x: number; y: number }>
    confidence: number
  }>
  success: boolean
  error?: string
}

export interface FaceMatchResult {
  match: boolean
  confidence: number
  similarity: number
  error?: string
}

class OfflineFaceMatchService {
  private config: FaceMatchConfig
  private modelLoaded = false

  constructor(config: FaceMatchConfig) {
    this.config = config
  }

  async initialize(): Promise<void> {
    try {
      // In real implementation, load tflite model
      // For now, simulate model loading
      console.log('Loading face matching model...')
      await this.loadModel()
      this.modelLoaded = true
      console.log('Face matching model loaded successfully')
    } catch (error: any) {
      throw new Error(`Failed to initialize face matching: ${error.message}`)
    }
  }

  async detectFaces(image: FaceImage): Promise<FaceDetectionResult> {
    if (!this.modelLoaded) {
      throw new Error('Face matching service not initialized')
    }

    try {
      // In real implementation, use tflite/ML Kit for face detection
      // For now, simulate face detection
      const faces = this.simulateFaceDetection(image)
      
      return {
        faces,
        success: true
      }
    } catch (error: any) {
      return {
        faces: [],
        success: false,
        error: error.message
      }
    }
  }

  async matchFaces(
    referenceImage: FaceImage, 
    candidateImage: FaceImage
  ): Promise<FaceMatchResult> {
    if (!this.modelLoaded) {
      throw new Error('Face matching service not initialized')
    }

    try {
      // Detect faces in both images
      const refFaces = await this.detectFaces(referenceImage)
      const candFaces = await this.detectFaces(candidateImage)

      if (refFaces.faces.length === 0) {
        return {
          match: false,
          confidence: 0,
          similarity: 0,
          error: 'No face detected in reference image'
        }
      }

      if (candFaces.faces.length === 0) {
        return {
          match: false,
          confidence: 0,
          similarity: 0,
          error: 'No face detected in candidate image'
        }
      }

      // Use the first detected face from each image
      const refFace = refFaces.faces[0]
      const candFace = candFaces.faces[0]

      // In real implementation, extract face embeddings and compare
      // For now, simulate face matching
      const similarity = this.simulateFaceSimilarity(refFace, candFace)
      const confidence = Math.min(similarity * 1.2, 1.0) // Boost confidence slightly
      const match = confidence >= this.config.confidenceThreshold

      return {
        match,
        confidence,
        similarity,
        error: match ? undefined : 'Face match confidence below threshold'
      }

    } catch (error: any) {
      return {
        match: false,
        confidence: 0,
        similarity: 0,
        error: error.message
      }
    }
  }

  async extractFaceEmbedding(_image: FaceImage): Promise<Float32Array> {
    if (!this.modelLoaded) {
      throw new Error('Face matching service not initialized')
    }

    // In real implementation, extract face embedding using tflite model
    // For now, simulate embedding extraction
    const embedding = new Float32Array(128) // Typical face embedding size
    for (let i = 0; i < embedding.length; i++) {
      embedding[i] = Math.random() * 2 - 1 // Random values between -1 and 1
    }
    
    return embedding
  }

  private async loadModel(): Promise<void> {
    // In real implementation, load tflite model from assets
    // For now, simulate loading delay
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  private simulateFaceDetection(_image: FaceImage): Array<{
    boundingBox: { x: number; y: number; width: number; height: number }
    landmarks: Array<{ x: number; y: number }>
    confidence: number
  }> {
    // Simulate detecting 1 face in the center of the image
    const centerX = _image.width / 2
    const centerY = _image.height / 2
    const faceSize = Math.min(_image.width, _image.height) * 0.3

    return [{
      boundingBox: {
        x: centerX - faceSize / 2,
        y: centerY - faceSize / 2,
        width: faceSize,
        height: faceSize
      },
      landmarks: [
        { x: centerX - faceSize * 0.2, y: centerY - faceSize * 0.1 }, // Left eye
        { x: centerX + faceSize * 0.2, y: centerY - faceSize * 0.1 }, // Right eye
        { x: centerX, y: centerY + faceSize * 0.1 }, // Nose
        { x: centerX - faceSize * 0.15, y: centerY + faceSize * 0.3 }, // Left mouth
        { x: centerX + faceSize * 0.15, y: centerY + faceSize * 0.3 }  // Right mouth
      ],
      confidence: 0.95 + Math.random() * 0.05 // 95-100% confidence
    }]
  }

  private simulateFaceSimilarity(face1: any, face2: any): number {
    // In real implementation, compare face embeddings
    // For now, simulate similarity based on bounding box overlap
    const box1 = face1.boundingBox
    const box2 = face2.boundingBox
    
    const overlap = this.calculateBoundingBoxOverlap(box1, box2)
    const baseSimilarity = 0.6 + Math.random() * 0.3 // 60-90% base similarity
    
    return Math.min(baseSimilarity + overlap * 0.2, 1.0)
  }

  private calculateBoundingBoxOverlap(box1: any, box2: any): number {
    const x1 = Math.max(box1.x, box2.x)
    const y1 = Math.max(box1.y, box2.y)
    const x2 = Math.min(box1.x + box1.width, box2.x + box2.width)
    const y2 = Math.min(box1.y + box1.height, box2.y + box2.height)

    if (x2 <= x1 || y2 <= y1) return 0

    const intersection = (x2 - x1) * (y2 - y1)
    const area1 = box1.width * box1.height
    const area2 = box2.width * box2.height
    const union = area1 + area2 - intersection

    return intersection / union
  }

  isModelLoaded(): boolean {
    return this.modelLoaded
  }

  getConfig(): FaceMatchConfig {
    return { ...this.config }
  }
}

export const createFaceMatchService = (config: FaceMatchConfig) => 
  new OfflineFaceMatchService(config)

// Default configuration
export const DEFAULT_FACE_MATCH_CONFIG: FaceMatchConfig = {
  confidenceThreshold: 0.8,
  maxFaces: 5,
  modelPath: '/models/face_match.tflite'
}

// Utility functions for image processing
export async function loadImageFromFile(file: File): Promise<FaceImage> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Could not get canvas context'))
          return
        }

        canvas.width = img.width
        canvas.height = img.height
        ctx.drawImage(img, 0, 0)

        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('Could not convert image to blob'))
            return
          }

          const reader = new FileReader()
          reader.onload = (e) => {
            const arrayBuffer = e.target?.result as ArrayBuffer
            resolve({
              data: new Uint8Array(arrayBuffer),
              format: 'jpeg',
              width: img.width,
              height: img.height
            })
          }
          reader.readAsArrayBuffer(blob)
        }, 'image/jpeg', 0.9)
      }
      img.src = e.target?.result as string
    }
    reader.readAsDataURL(file)
  })
}

export async function captureImageFromCamera(): Promise<FaceImage> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: { 
        facingMode: 'user',
        width: { ideal: 640 },
        height: { ideal: 480 }
      } 
    })
    
    const video = document.createElement('video')
    video.srcObject = stream
    video.play()

    return new Promise((resolve, reject) => {
      video.onloadedmetadata = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Could not get canvas context'))
          return
        }

        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        ctx.drawImage(video, 0, 0)

        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('Could not capture image'))
            return
          }

          const reader = new FileReader()
          reader.onload = (e) => {
            const arrayBuffer = e.target?.result as ArrayBuffer
            resolve({
              data: new Uint8Array(arrayBuffer),
              format: 'jpeg',
              width: video.videoWidth,
              height: video.videoHeight
            })
          }
          reader.readAsArrayBuffer(blob)
        }, 'image/jpeg', 0.9)

        // Stop the stream
        stream.getTracks().forEach(track => track.stop())
      }
    })
  } catch (error: any) {
    throw new Error(`Camera capture failed: ${error.message}`)
  }
}
