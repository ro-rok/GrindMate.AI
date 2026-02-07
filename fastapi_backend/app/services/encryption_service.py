"""
Encryption Service

Provides encryption/decryption for sensitive data like BYOK API keys.
Uses Fernet symmetric encryption (AES-128 in CBC mode).
"""

import os
import base64
from typing import Optional

from cryptography.fernet import Fernet, InvalidToken

from ..config import get_settings


class EncryptionService:
    """Service for encrypting and decrypting sensitive data"""
    
    def __init__(self):
        self.settings = get_settings()
        self._fernet = None
    
    @property
    def fernet(self) -> Fernet:
        """Lazy-load Fernet instance"""
        if self._fernet is None:
            encryption_key = self._get_encryption_key()
            self._fernet = Fernet(encryption_key)
        return self._fernet
    
    def _get_encryption_key(self) -> bytes:
        """
        Get or generate encryption key
        
        In production, this should come from environment variable or secrets manager.
        For development, we generate a key if not present.
        """
        # Try to get from environment
        key_str = os.getenv("ENCRYPTION_KEY")
        
        if key_str:
            # Validate it's a valid Fernet key
            try:
                key_bytes = key_str.encode()
                # Test if it's valid
                Fernet(key_bytes)
                return key_bytes
            except Exception:
                logger = logging.getLogger("uvicorn")
                logger.warning("Invalid ENCRYPTION_KEY in environment, generating new key")
        
        # Generate a new key for development
        # WARNING: This means encrypted data won't persist across restarts in dev
        logger = logging.getLogger("uvicorn")
        logger.warning("No ENCRYPTION_KEY found, generating temporary key. Set ENCRYPTION_KEY environment variable for production")
        return Fernet.generate_key()
    
    def encrypt(self, plaintext: str) -> str:
        """
        Encrypt a plaintext string
        
        Args:
            plaintext: String to encrypt
            
        Returns:
            Base64-encoded encrypted string
        """
        if not plaintext:
            return ""
        
        encrypted_bytes = self.fernet.encrypt(plaintext.encode())
        return encrypted_bytes.decode()
    
    def decrypt(self, encrypted: str) -> Optional[str]:
        """
        Decrypt an encrypted string
        
        Args:
            encrypted: Base64-encoded encrypted string
            
        Returns:
            Decrypted plaintext string, or None if decryption fails
        """
        if not encrypted:
            return None
        
        try:
            decrypted_bytes = self.fernet.decrypt(encrypted.encode())
            return decrypted_bytes.decode()
        except InvalidToken:
            logger = logging.getLogger("uvicorn")
            logger.warning("Failed to decrypt data (invalid token or wrong key)")
            return None
        except Exception as e:
            logger = logging.getLogger("uvicorn")
            logger.warning(f"Failed to decrypt data: {e}")
            return None
    
    def encrypt_api_key(self, api_key: str) -> str:
        """
        Encrypt an API key for storage
        
        Args:
            api_key: API key to encrypt
            
        Returns:
            Encrypted API key
        """
        return self.encrypt(api_key)
    
    def decrypt_api_key(self, encrypted_key: str) -> Optional[str]:
        """
        Decrypt an API key from storage
        
        Args:
            encrypted_key: Encrypted API key
            
        Returns:
            Decrypted API key, or None if decryption fails
        """
        return self.decrypt(encrypted_key)


# Singleton instance
_encryption_service: Optional[EncryptionService] = None


def get_encryption_service() -> EncryptionService:
    """Get or create encryption service instance"""
    global _encryption_service
    if _encryption_service is None:
        _encryption_service = EncryptionService()
    return _encryption_service
