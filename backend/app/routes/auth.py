from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import timedelta
from app.database.database import get_db
from app.models.user import User
from app.utils.schemas import UserCreate, UserResponse, Token, UserLogin
from app.core import security

router = APIRouter(
    prefix="/api/auth",
    tags=["Authentication"]
)

@router.post("/signup", response_model=UserResponse)
def signup(user_data: UserCreate, db: Session = Depends(get_db)):
    """
    Create a new user.
    """
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists."
        )
    
    # Hash the password
    hashed_password = security.get_password_hash(user_data.password)
    
    # Create new user
    new_user = User(
        name=user_data.name,
        email=user_data.email,
        password=hashed_password,
        role=user_data.role
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return new_user

@router.post("/login", response_model=Token)
def login(user_data: UserLogin, db: Session = Depends(get_db)):
    """
    Authenticate a user and return a JWT access token.
    (Note: Using UserCreate for login as a shortcut, typically uses a OAuth2PasswordRequestForm or similar)
    """
    # Find the user by email
    user = db.query(User).filter(User.email == user_data.email).first()
    if not user or not security.verify_password(user_data.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create access token
    access_token_expires = timedelta(minutes=security.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(
        data={"sub": user.email, "role": user.role}, 
        expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}
    
# TODO: In a production app, use OAuth2PasswordRequestForm for logic and separate schemas for input/output.
