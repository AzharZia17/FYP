import os
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

import logging

logger = logging.getLogger(__name__)

# JWT configuration
SECRET_KEY = os.getenv("SECRET_KEY", "yoursecretkeyhere")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))

# Password hashing configuration
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

import bcrypt

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify if the plain password matches the hashed password directly using bcrypt.
    Handles various bcrypt prefixes and potential encoding issues.
    """
    try:
        # Bcrypt passwords are limited to 72 bytes.
        # We encode and check length to avoid ValueError.
        pw_bytes = plain_password.encode('utf-8')
        if len(pw_bytes) > 72:
            # Note: Bcrypt silently truncates, but some versions of the library throw ValueError.
            # Here we manually truncate if needed or just let it be if it's within limits.
            pw_bytes = pw_bytes[:72]
            
        # Ensure hashed_password is bytes. 
        # Most DB drivers return it as str.
        if isinstance(hashed_password, str):
            # Normalizing prefix: Some old hashes might use $2a$, $2y$, etc.
            # Modern bcrypt library handles $2b$ and $2a$ well.
            hash_bytes = hashed_password.encode('utf-8')
        else:
            hash_bytes = hashed_password
            
        return bcrypt.checkpw(pw_bytes, hash_bytes)
    except Exception as e:
        logger.error(f"Hash verification error: {str(e)}")
        return False

def get_password_hash(password: str) -> str:
    """
    Hash a password directly using the bcrypt library.
    """
    pw_bytes = password.encode('utf-8')
    # Truncate to 72 bytes to prevent bcrypt issues
    if len(pw_bytes) > 72:
        pw_bytes = pw_bytes[:72]
        
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pw_bytes, salt).decode('utf-8')

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """
    Create a JWT access token with user details.
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt
