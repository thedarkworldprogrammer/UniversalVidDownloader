import { validateUrl, isValidUrl, sanitizeUrl, ValidationError } from './url';

describe('URL Validator', () => {
  describe('validateUrl', () => {
    it('should accept valid HTTP URLs', () => {
      expect(() => validateUrl('http://example.com')).not.toThrow();
      expect(() => validateUrl('http://www.example.com')).not.toThrow();
      expect(() => validateUrl('http://example.com/path')).not.toThrow();
      expect(() => validateUrl('http://example.com/path?query=value')).not.toThrow();
    });

    it('should accept valid HTTPS URLs', () => {
      expect(() => validateUrl('https://example.com')).not.toThrow();
      expect(() => validateUrl('https://www.example.com')).not.toThrow();
      expect(() => validateUrl('https://example.com/path')).not.toThrow();
      expect(() => validateUrl('https://example.com/path?query=value')).not.toThrow();
    });

    it('should accept valid YouTube URLs', () => {
      expect(() => validateUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).not.toThrow();
      expect(() => validateUrl('https://youtu.be/dQw4w9WgXcQ')).not.toThrow();
      expect(() => validateUrl('https://youtube.com/watch?v=dQw4w9WgXcQ')).not.toThrow();
    });

    it('should accept valid Vimeo URLs', () => {
      expect(() => validateUrl('https://vimeo.com/123456789')).not.toThrow();
      expect(() => validateUrl('https://www.vimeo.com/123456789')).not.toThrow();
    });

    it('should reject empty strings', () => {
      expect(() => validateUrl('')).toThrow(ValidationError);
      expect(() => validateUrl('   ')).toThrow(ValidationError);
    });

    it('should reject non-HTTP protocols', () => {
      expect(() => validateUrl('ftp://example.com')).toThrow(ValidationError);
      expect(() => validateUrl('file:///etc/passwd')).toThrow(ValidationError);
      expect(() => validateUrl('javascript:alert(1)')).toThrow(ValidationError);
      expect(() => validateUrl('data:text/html,<script>alert(1)</script>')).toThrow(ValidationError);
    });

    it('should reject localhost and loopback addresses', () => {
      expect(() => validateUrl('http://localhost')).toThrow(ValidationError);
      expect(() => validateUrl('http://127.0.0.1')).toThrow(ValidationError);
      expect(() => validateUrl('http://[::1]')).toThrow(ValidationError);
      expect(() => validateUrl('http://localhost:8080')).toThrow(ValidationError);
    });

    it('should reject private IP addresses (RFC 1918)', () => {
      expect(() => validateUrl('http://10.0.0.1')).toThrow(ValidationError);
      expect(() => validateUrl('http://192.168.1.1')).toThrow(ValidationError);
      expect(() => validateUrl('http://172.16.0.1')).toThrow(ValidationError);
      expect(() => validateUrl('http://172.31.255.255')).toThrow(ValidationError);
    });

    it('should reject link-local addresses', () => {
      expect(() => validateUrl('http://169.254.1.1')).toThrow(ValidationError);
    });

    it('should reject reserved/multicast addresses', () => {
      expect(() => validateUrl('http://224.0.0.1')).toThrow(ValidationError);
      expect(() => validateUrl('http://255.255.255.255')).toThrow(ValidationError);
      expect(() => validateUrl('http://0.0.0.0')).toThrow(ValidationError);
    });

    it('should reject blocked TLDs', () => {
      expect(() => validateUrl('http://example.local')).toThrow(ValidationError);
      expect(() => validateUrl('http://example.internal')).toThrow(ValidationError);
      expect(() => validateUrl('http://test.test')).toThrow(ValidationError);
      expect(() => validateUrl('http://example.localhost')).toThrow(ValidationError);
    });

    it('should reject malformed URLs', () => {
      expect(() => validateUrl('not a url')).toThrow(ValidationError);
      expect(() => validateUrl('http://')).toThrow(ValidationError);
      expect(() => validateUrl('http://.com')).toThrow(ValidationError);
    });
  });

  describe('isValidUrl', () => {
    it('should return true for valid URLs', () => {
      expect(isValidUrl('https://example.com')).toBe(true);
      expect(isValidUrl('https://www.youtube.com/watch?v=test')).toBe(true);
    });

    it('should return false for invalid URLs', () => {
      expect(isValidUrl('')).toBe(false);
      expect(isValidUrl('not a url')).toBe(false);
      expect(isValidUrl('http://localhost')).toBe(false);
      expect(isValidUrl('http://192.168.1.1')).toBe(false);
    });
  });

  describe('sanitizeUrl', () => {
    it('should trim whitespace', () => {
      expect(sanitizeUrl('  https://example.com  ')).toBe('https://example.com');
    });

    it('should remove fragment identifiers', () => {
      expect(sanitizeUrl('https://example.com#fragment')).toBe('https://example.com');
    });

    it('should preserve query parameters', () => {
      expect(sanitizeUrl('https://example.com?param=value')).toBe('https://example.com?param=value');
    });

    it('should handle empty string', () => {
      expect(sanitizeUrl('')).toBe('');
    });
  });
});