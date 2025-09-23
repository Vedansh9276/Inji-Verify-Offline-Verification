import { describe, it, expect, beforeEach, vi } from 'vitest'
import { 
  createFaceMatchService, 
  DEFAULT_FACE_MATCH_CONFIG,
  loadImageFromFile,
  captureImageFromCamera,
  type FaceImage
} from '../lib/face-match'

describe('Face Match Service', () => {
  let service: ReturnType<typeof createFaceMatchService>

  beforeEach(() => {
    service = createFaceMatchService(DEFAULT_FACE_MATCH_CONFIG)
  })

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      await expect(service.initialize()).resolves.not.toThrow()
      expect(service.isModelLoaded()).toBe(true)
    })

    it('should handle initialization errors', async () => {
      // Mock initialization failure
      vi.spyOn(console, 'log').mockImplementation(() => {
        throw new Error('Model loading failed')
      })

      await expect(service.initialize()).rejects.toThrow('Failed to initialize face matching')
    })
  })

  describe('Face Detection', () => {
    beforeEach(async () => {
      await service.initialize()
    })

    it('should detect faces in image', async () => {
      const mockImage: FaceImage = {
        data: new Uint8Array([1, 2, 3, 4]),
        format: 'jpeg',
        width: 640,
        height: 480
      }

      const result = await service.detectFaces(mockImage)
      
      expect(result.success).toBe(true)
      expect(result.faces).toHaveLength(1)
      expect(result.faces[0]).toHaveProperty('boundingBox')
      expect(result.faces[0]).toHaveProperty('landmarks')
      expect(result.faces[0]).toHaveProperty('confidence')
    })

    it('should handle detection errors', async () => {
      const invalidImage: FaceImage = {
        data: new Uint8Array([]),
        format: 'jpeg',
        width: 0,
        height: 0
      }

      const result = await service.detectFaces(invalidImage)
      expect(result.success).toBe(false)
      expect(result.faces).toHaveLength(0)
    })

    it('should reject detection when not initialized', async () => {
      const uninitializedService = createFaceMatchService(DEFAULT_FACE_MATCH_CONFIG)
      const mockImage: FaceImage = {
        data: new Uint8Array([1, 2, 3, 4]),
        format: 'jpeg',
        width: 640,
        height: 480
      }

      await expect(uninitializedService.detectFaces(mockImage))
        .rejects.toThrow('Face matching service not initialized')
    })
  })

  describe('Face Matching', () => {
    beforeEach(async () => {
      await service.initialize()
    })

    it('should match faces successfully', async () => {
      const mockImage1: FaceImage = {
        data: new Uint8Array([1, 2, 3, 4]),
        format: 'jpeg',
        width: 640,
        height: 480
      }

      const mockImage2: FaceImage = {
        data: new Uint8Array([5, 6, 7, 8]),
        format: 'jpeg',
        width: 640,
        height: 480
      }

      const result = await service.matchFaces(mockImage1, mockImage2)
      
      expect(result).toHaveProperty('match')
      expect(result).toHaveProperty('confidence')
      expect(result).toHaveProperty('similarity')
      expect(typeof result.match).toBe('boolean')
      expect(typeof result.confidence).toBe('number')
      expect(typeof result.similarity).toBe('number')
    })

    it('should handle no face in reference image', async () => {
      const mockImage1: FaceImage = {
        data: new Uint8Array([]), // Empty image
        format: 'jpeg',
        width: 0,
        height: 0
      }

      const mockImage2: FaceImage = {
        data: new Uint8Array([5, 6, 7, 8]),
        format: 'jpeg',
        width: 640,
        height: 480
      }

      const result = await service.matchFaces(mockImage1, mockImage2)
      
      expect(result.match).toBe(false)
      expect(result.error).toContain('No face detected in reference image')
    })

    it('should handle no face in candidate image', async () => {
      const mockImage1: FaceImage = {
        data: new Uint8Array([1, 2, 3, 4]),
        format: 'jpeg',
        width: 640,
        height: 480
      }

      const mockImage2: FaceImage = {
        data: new Uint8Array([]), // Empty image
        format: 'jpeg',
        width: 0,
        height: 0
      }

      const result = await service.matchFaces(mockImage1, mockImage2)
      
      expect(result.match).toBe(false)
      expect(result.error).toContain('No face detected in candidate image')
    })
  })

  describe('Face Embedding', () => {
    beforeEach(async () => {
      await service.initialize()
    })

    it('should extract face embedding', async () => {
      const mockImage: FaceImage = {
        data: new Uint8Array([1, 2, 3, 4]),
        format: 'jpeg',
        width: 640,
        height: 480
      }

      const embedding = await service.extractFaceEmbedding(mockImage)
      
      expect(embedding).toBeInstanceOf(Float32Array)
      expect(embedding.length).toBe(128) // Typical embedding size
    })

    it('should reject embedding extraction when not initialized', async () => {
      const uninitializedService = createFaceMatchService(DEFAULT_FACE_MATCH_CONFIG)
      const mockImage: FaceImage = {
        data: new Uint8Array([1, 2, 3, 4]),
        format: 'jpeg',
        width: 640,
        height: 480
      }

      await expect(uninitializedService.extractFaceEmbedding(mockImage))
        .rejects.toThrow('Face matching service not initialized')
    })
  })

  describe('Configuration', () => {
    it('should return current configuration', () => {
      const config = service.getConfig()
      
      expect(config).toHaveProperty('confidenceThreshold')
      expect(config).toHaveProperty('maxFaces')
      expect(config).toHaveProperty('modelPath')
      expect(config.confidenceThreshold).toBe(0.8)
      expect(config.maxFaces).toBe(5)
    })

    it('should use custom configuration', () => {
      const customConfig = {
        confidenceThreshold: 0.9,
        maxFaces: 3,
        modelPath: '/custom/model.tflite'
      }

      const customService = createFaceMatchService(customConfig)
      const config = customService.getConfig()
      
      expect(config.confidenceThreshold).toBe(0.9)
      expect(config.maxFaces).toBe(3)
      expect(config.modelPath).toBe('/custom/model.tflite')
    })
  })

  describe('Utility Functions', () => {
    it('should load image from file', async () => {
      // Mock File and FileReader
      const mockFile = new File(['mock image data'], 'test.jpg', { type: 'image/jpeg' })
      
      // Mock Image constructor
      const mockImage = {
        width: 640,
        height: 480,
        onload: null as any,
        src: ''
      }
      
      vi.stubGlobal('Image', vi.fn(() => mockImage))
      vi.stubGlobal('FileReader', vi.fn(() => ({
        readAsDataURL: vi.fn(),
        result: 'data:image/jpeg;base64,mock'
      })))

      // Mock canvas
      const mockCanvas = {
        width: 640,
        height: 480,
        getContext: vi.fn(() => ({
          drawImage: vi.fn()
        })),
        toBlob: vi.fn((callback) => callback(new Blob(['mock'])))
      }
      
      vi.stubGlobal('document', {
        createElement: vi.fn((tag) => {
          if (tag === 'canvas') return mockCanvas
          return {}
        })
      })

      const result = await loadImageFromFile(mockFile)
      
      expect(result).toHaveProperty('data')
      expect(result).toHaveProperty('format')
      expect(result).toHaveProperty('width')
      expect(result).toHaveProperty('height')
    })

    it('should capture image from camera', async () => {
      // Mock getUserMedia
      const mockStream = {
        getTracks: vi.fn(() => [{ stop: vi.fn() }])
      }
      
      vi.stubGlobal('navigator', {
        mediaDevices: {
          getUserMedia: vi.fn(() => Promise.resolve(mockStream))
        }
      })

      // Mock video element
      const mockVideo = {
        srcObject: null,
        play: vi.fn(),
        videoWidth: 640,
        videoHeight: 480,
        onloadedmetadata: null as any
      }

      vi.stubGlobal('document', {
        createElement: vi.fn((tag) => {
          if (tag === 'video') return mockVideo
          if (tag === 'canvas') return {
            width: 640,
            height: 480,
            getContext: vi.fn(() => ({
              drawImage: vi.fn()
            })),
            toBlob: vi.fn((callback) => callback(new Blob(['mock'])))
          }
          return {}
        })
      })

      // Mock FileReader
      vi.stubGlobal('FileReader', vi.fn(() => ({
        readAsArrayBuffer: vi.fn(),
        result: new ArrayBuffer(8)
      })))

      const result = await captureImageFromCamera()
      
      expect(result).toHaveProperty('data')
      expect(result).toHaveProperty('format')
      expect(result).toHaveProperty('width')
      expect(result).toHaveProperty('height')
    })

    it('should handle camera capture errors', async () => {
      vi.stubGlobal('navigator', {
        mediaDevices: {
          getUserMedia: vi.fn(() => Promise.reject(new Error('Camera access denied')))
        }
      })

      await expect(captureImageFromCamera())
        .rejects.toThrow('Camera capture failed: Camera access denied')
    })
  })
})
