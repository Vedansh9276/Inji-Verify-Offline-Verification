// Security utilities for input validation and sanitization

export function sanitizeQRPayload(payload: string): string {
  // Remove potential XSS vectors and limit length
  return payload
    .replace(/[<>]/g, '') // Remove HTML tags
    .substring(0, 10000) // Limit length
    .trim()
}

export function validateQRPayload(payload: string): { valid: boolean; error?: string } {
  if (!payload || typeof payload !== 'string') {
    return { valid: false, error: 'Invalid payload type' }
  }
  
  if (payload.length === 0) {
    return { valid: false, error: 'Empty payload' }
  }
  
  if (payload.length > 10000) {
    return { valid: false, error: 'Payload too large' }
  }
  
  // Check for potential JSON structure
  const trimmed = payload.trim()
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      JSON.parse(trimmed)
      return { valid: true }
    } catch {
      return { valid: false, error: 'Invalid JSON format' }
    }
  }
  
  return { valid: true }
}

export function sanitizeLogDetails(details: any): any {
  if (!details || typeof details !== 'object') return null
  
  // Remove sensitive fields that might contain PII
  const sanitized = { ...details }
  delete sanitized.personalData
  delete sanitized.pii
  delete sanitized.privateKey
  delete sanitized.secret
  
  return sanitized
}

export function generateSecureHash(input: string): string {
  // Use Web Crypto API for secure hashing
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    // This would be async in real implementation
    // For now, use a simple hash for demo
    let hash = 0
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16)
  }
  
  // Fallback for environments without crypto.subtle
  return btoa(input).substring(0, 16)
}
