from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timedelta
import jwt
import random
import string
import requests

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'cashjama')]

# JWT Settings
JWT_SECRET = os.environ.get('JWT_SECRET', 'cashjama-secret-key-2025')
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_HOURS = 24

# MSG91 Settings (to be configured with real API key)
MSG91_API_KEY = os.environ.get('MSG91_API_KEY', None)
MSG91_TEMPLATE_ID = os.environ.get('MSG91_TEMPLATE_ID', None)
MSG91_SENDER_ID = os.environ.get('MSG91_SENDER_ID', 'CASHJM')

# Create the main app
app = FastAPI(title="CashJama API", version="1.0.0")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ======================= MODELS =======================

# User Models
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    mobile: str
    name: Optional[str] = None
    role: str = "user"  # user, bc_agent, admin
    is_active: bool = True
    is_verified: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class UserCreate(BaseModel):
    mobile: str
    name: Optional[str] = None
    role: str = "user"

class UserUpdate(BaseModel):
    name: Optional[str] = None

# OTP Models
class OTPLog(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    mobile: str
    otp: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: datetime
    attempts: int = 0
    max_attempts: int = 3
    verified: bool = False
    job_id: Optional[str] = None  # For job-specific OTPs
    resend_count: int = 0
    max_resend: int = 3

class SendOTPRequest(BaseModel):
    mobile: str

class VerifyOTPRequest(BaseModel):
    mobile: str
    otp: str

class ResendOTPRequest(BaseModel):
    mobile: str

# Location Models
class Location(BaseModel):
    latitude: float
    longitude: float
    address: Optional[str] = None
    accuracy: Optional[float] = None

# Deposit Request Models
class DepositRequest(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    user_mobile: str
    user_name: Optional[str] = None
    amount: float
    service_fee: float
    total_cash: float
    location: Location
    status: str = "requested"  # requested, agent_assigned, in_progress, completed, cancelled
    bc_agent_id: Optional[str] = None
    bc_agent_name: Optional[str] = None
    bc_agent_mobile: Optional[str] = None
    job_otp: Optional[str] = None
    job_otp_verified: bool = False
    photo_proof: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    assigned_at: Optional[datetime] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    cancelled_at: Optional[datetime] = None
    cancellation_reason: Optional[str] = None

class CreateDepositRequest(BaseModel):
    amount: float
    location: Location

class DepositStatusUpdate(BaseModel):
    status: str
    cancellation_reason: Optional[str] = None

# Auth Response Models
class AuthResponse(BaseModel):
    success: bool
    message: str
    token: Optional[str] = None
    user: Optional[dict] = None

class OTPResponse(BaseModel):
    success: bool
    message: str
    expires_in: int = 60
    resend_available: bool = True

# ======================= HELPER FUNCTIONS =======================

def calculate_service_fee(amount: float) -> float:
    """Calculate service fee based on flat slabs"""
    if amount < 300:
        raise ValueError("Minimum deposit amount is ₹300")
    elif amount < 1000:
        return 40.0
    elif amount < 2000:
        return 50.0
    elif amount < 5000:
        return 70.0
    else:
        return 100.0

def generate_otp(length: int = 6) -> str:
    """Generate random numeric OTP"""
    return ''.join(random.choices(string.digits, k=length))

def create_jwt_token(user_id: str, mobile: str, role: str) -> str:
    """Create JWT token for authentication"""
    payload = {
        "user_id": user_id,
        "mobile": mobile,
        "role": role,
        "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRY_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def verify_jwt_token(token: str) -> dict:
    """Verify JWT token and return payload"""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user(authorization: str = Header(None)):
    """Dependency to get current authenticated user"""
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header missing")
    
    try:
        token = authorization.replace("Bearer ", "")
        payload = verify_jwt_token(token)
        user = await db.users.find_one({"id": payload["user_id"]})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))

async def send_otp_via_msg91(mobile: str, otp: str) -> bool:
    """Send OTP via MSG91 API - Production ready hook"""
    if not MSG91_API_KEY:
        # Mock mode - just log the OTP
        logger.info(f"[MOCK OTP] Sending OTP {otp} to {mobile}")
        return True
    
    try:
        url = "https://control.msg91.com/api/v5/otp"
        payload = {
            "template_id": MSG91_TEMPLATE_ID,
            "mobile": f"91{mobile}",
            "authkey": MSG91_API_KEY,
            "otp": otp
        }
        headers = {
            "Content-Type": "application/json"
        }
        response = requests.post(url, json=payload, headers=headers)
        if response.status_code == 200:
            logger.info(f"[MSG91] OTP sent successfully to {mobile}")
            return True
        else:
            logger.error(f"[MSG91] Failed to send OTP: {response.text}")
            return False
    except Exception as e:
        logger.error(f"[MSG91] Error sending OTP: {str(e)}")
        return False

def mask_mobile(mobile: str) -> str:
    """Mask mobile number for privacy"""
    if len(mobile) >= 10:
        return f"{mobile[:2]}****{mobile[-4:]}"
    return mobile

def serialize_doc(doc: dict) -> dict:
    """Convert MongoDB document to JSON-serializable format"""
    if doc is None:
        return None
    result = {}
    for key, value in doc.items():
        if key == "_id":
            continue  # Skip MongoDB _id
        elif isinstance(value, datetime):
            result[key] = value.isoformat()
        elif isinstance(value, dict):
            result[key] = serialize_doc(value)
        elif isinstance(value, list):
            result[key] = [serialize_doc(v) if isinstance(v, dict) else v for v in value]
        else:
            result[key] = value
    return result

# ======================= AUTH ENDPOINTS =======================

@api_router.post("/auth/send-otp", response_model=OTPResponse)
async def send_otp(request: SendOTPRequest):
    """Send OTP to mobile number for login/signup"""
    mobile = request.mobile.strip()
    
    if len(mobile) != 10 or not mobile.isdigit():
        raise HTTPException(status_code=400, detail="Invalid mobile number. Must be 10 digits.")
    
    # Check for existing unexpired OTP
    existing_otp = await db.otp_logs.find_one({
        "mobile": mobile,
        "verified": False,
        "expires_at": {"$gt": datetime.utcnow()}
    })
    
    if existing_otp:
        # Check resend limit
        if existing_otp.get("resend_count", 0) >= 3:
            raise HTTPException(status_code=429, detail="Maximum resend attempts exceeded. Please try after some time.")
    
    # Generate new OTP
    otp = generate_otp()
    expires_at = datetime.utcnow() + timedelta(seconds=60)
    
    # Create OTP log
    otp_log = OTPLog(
        mobile=mobile,
        otp=otp,
        expires_at=expires_at,
        resend_count=0
    )
    
    # Invalidate previous OTPs
    await db.otp_logs.update_many(
        {"mobile": mobile, "verified": False},
        {"$set": {"verified": True}}
    )
    
    # Save new OTP
    await db.otp_logs.insert_one(otp_log.dict())
    
    # Send OTP
    sent = await send_otp_via_msg91(mobile, otp)
    
    if not sent and MSG91_API_KEY:
        raise HTTPException(status_code=500, detail="Failed to send OTP. Please try again.")
    
    logger.info(f"OTP sent to {mobile}: {otp}")  # Remove in production
    
    return OTPResponse(
        success=True,
        message="OTP sent successfully",
        expires_in=60,
        resend_available=True
    )

@api_router.post("/auth/verify-otp", response_model=AuthResponse)
async def verify_otp(request: VerifyOTPRequest):
    """Verify OTP and login/signup user"""
    mobile = request.mobile.strip()
    otp = request.otp.strip()
    
    # Find OTP log
    otp_log = await db.otp_logs.find_one({
        "mobile": mobile,
        "verified": False,
        "expires_at": {"$gt": datetime.utcnow()}
    })
    
    if not otp_log:
        raise HTTPException(status_code=400, detail="OTP expired or not found. Please request a new OTP.")
    
    # Check attempts
    if otp_log.get("attempts", 0) >= 3:
        raise HTTPException(status_code=429, detail="Maximum verification attempts exceeded. Please request a new OTP.")
    
    # Update attempts
    await db.otp_logs.update_one(
        {"id": otp_log["id"]},
        {"$inc": {"attempts": 1}}
    )
    
    # Verify OTP
    if otp_log["otp"] != otp:
        remaining = 3 - (otp_log.get("attempts", 0) + 1)
        raise HTTPException(status_code=400, detail=f"Invalid OTP. {remaining} attempts remaining.")
    
    # Mark OTP as verified
    await db.otp_logs.update_one(
        {"id": otp_log["id"]},
        {"$set": {"verified": True}}
    )
    
    # Find or create user
    user = await db.users.find_one({"mobile": mobile})
    
    if not user:
        # Create new user
        new_user = User(
            mobile=mobile,
            is_verified=True
        )
        await db.users.insert_one(new_user.dict())
        user = new_user.dict()
    else:
        # Update existing user
        await db.users.update_one(
            {"id": user["id"]},
            {"$set": {"is_verified": True, "updated_at": datetime.utcnow()}}
        )
    
    # Generate JWT token
    token = create_jwt_token(user["id"], mobile, user.get("role", "user"))
    
    return AuthResponse(
        success=True,
        message="Login successful",
        token=token,
        user={
            "id": user["id"],
            "mobile": user["mobile"],
            "name": user.get("name"),
            "role": user.get("role", "user"),
            "is_verified": True
        }
    )

@api_router.post("/auth/resend-otp", response_model=OTPResponse)
async def resend_otp(request: ResendOTPRequest):
    """Resend OTP to mobile number"""
    mobile = request.mobile.strip()
    
    if len(mobile) != 10 or not mobile.isdigit():
        raise HTTPException(status_code=400, detail="Invalid mobile number")
    
    # Find existing OTP
    existing_otp = await db.otp_logs.find_one({
        "mobile": mobile,
        "verified": False
    }, sort=[("created_at", -1)])
    
    resend_count = 0
    if existing_otp:
        resend_count = existing_otp.get("resend_count", 0)
        if resend_count >= 3:
            raise HTTPException(status_code=429, detail="Maximum resend attempts (3) exceeded. Please try after 10 minutes.")
    
    # Generate new OTP
    otp = generate_otp()
    expires_at = datetime.utcnow() + timedelta(seconds=60)
    
    # Invalidate previous OTPs
    await db.otp_logs.update_many(
        {"mobile": mobile, "verified": False},
        {"$set": {"verified": True}}
    )
    
    # Create new OTP log with incremented resend count
    otp_log = OTPLog(
        mobile=mobile,
        otp=otp,
        expires_at=expires_at,
        resend_count=resend_count + 1
    )
    await db.otp_logs.insert_one(otp_log.dict())
    
    # Send OTP
    sent = await send_otp_via_msg91(mobile, otp)
    
    logger.info(f"OTP resent to {mobile}: {otp}")  # Remove in production
    
    return OTPResponse(
        success=True,
        message="OTP resent successfully",
        expires_in=60,
        resend_available=(resend_count + 1) < 3
    )

@api_router.get("/auth/me")
async def get_current_user_profile(current_user: dict = Depends(get_current_user)):
    """Get current authenticated user profile"""
    return {
        "id": current_user["id"],
        "mobile": current_user["mobile"],
        "name": current_user.get("name"),
        "role": current_user.get("role", "user"),
        "is_verified": current_user.get("is_verified", False),
        "created_at": current_user.get("created_at")
    }

@api_router.put("/auth/update-profile")
async def update_profile(update: UserUpdate, current_user: dict = Depends(get_current_user)):
    """Update user profile"""
    update_data = {}
    if update.name is not None:
        update_data["name"] = update.name
    update_data["updated_at"] = datetime.utcnow()
    
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": update_data}
    )
    
    updated_user = await db.users.find_one({"id": current_user["id"]})
    return {
        "success": True,
        "message": "Profile updated successfully",
        "user": {
            "id": updated_user["id"],
            "mobile": updated_user["mobile"],
            "name": updated_user.get("name"),
            "role": updated_user.get("role", "user")
        }
    }

@api_router.post("/auth/logout")
async def logout(current_user: dict = Depends(get_current_user)):
    """Logout user - invalidate session"""
    # In a production environment, you might want to blacklist the token
    # For now, we just return success and the client should delete the token
    return {
        "success": True,
        "message": "Logged out successfully"
    }

# ======================= DEPOSIT ENDPOINTS =======================

@api_router.get("/deposits/fee-calculator")
async def get_fee_calculation(amount: float):
    """Calculate service fee for a given amount"""
    if amount < 300:
        raise HTTPException(status_code=400, detail="Minimum deposit amount is ₹300")
    
    service_fee = calculate_service_fee(amount)
    return {
        "amount": amount,
        "service_fee": service_fee,
        "total_cash": amount + service_fee,
        "fee_slabs": [
            {"range": "₹300 - ₹999", "fee": 40},
            {"range": "₹1000 - ₹1999", "fee": 50},
            {"range": "₹2000 - ₹4999", "fee": 70},
            {"range": "₹5000+", "fee": 100}
        ]
    }

@api_router.post("/deposits/create")
async def create_deposit(request: CreateDepositRequest, current_user: dict = Depends(get_current_user)):
    """Create a new deposit request"""
    # Validate amount
    if request.amount < 300:
        raise HTTPException(status_code=400, detail="Minimum deposit amount is ₹300")
    
    # Check if user has any pending deposit
    pending = await db.deposits.find_one({
        "user_id": current_user["id"],
        "status": {"$in": ["requested", "agent_assigned", "in_progress"]}
    })
    
    if pending:
        raise HTTPException(status_code=400, detail="You already have a pending deposit request. Please wait for it to complete.")
    
    # Calculate service fee
    service_fee = calculate_service_fee(request.amount)
    total_cash = request.amount + service_fee
    
    # Create deposit request
    deposit = DepositRequest(
        user_id=current_user["id"],
        user_mobile=current_user["mobile"],
        user_name=current_user.get("name"),
        amount=request.amount,
        service_fee=service_fee,
        total_cash=total_cash,
        location=request.location
    )
    
    await db.deposits.insert_one(deposit.dict())
    
    logger.info(f"New deposit request created: {deposit.id} for user {current_user['id']}")
    
    return {
        "success": True,
        "message": "Deposit request created successfully",
        "deposit": deposit.dict()
    }

@api_router.get("/deposits/my-requests")
async def get_my_deposits(current_user: dict = Depends(get_current_user)):
    """Get all deposit requests for current user"""
    deposits = await db.deposits.find(
        {"user_id": current_user["id"]}
    ).sort("created_at", -1).to_list(100)
    
    return {
        "deposits": [serialize_doc(d) for d in deposits],
        "count": len(deposits)
    }

@api_router.get("/deposits/{deposit_id}")
async def get_deposit_details(deposit_id: str, current_user: dict = Depends(get_current_user)):
    """Get specific deposit request details"""
    deposit = await db.deposits.find_one({"id": deposit_id})
    
    if not deposit:
        raise HTTPException(status_code=404, detail="Deposit request not found")
    
    # Check access - user can only see their own deposits, BC can see assigned deposits
    if current_user["role"] == "user" and deposit["user_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    if current_user["role"] == "bc_agent" and deposit.get("bc_agent_id") != current_user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Mask BC mobile for users
    if current_user["role"] == "user" and deposit.get("bc_agent_mobile"):
        deposit["bc_agent_mobile"] = mask_mobile(deposit["bc_agent_mobile"])
    
    return serialize_doc(deposit)

@api_router.put("/deposits/{deposit_id}/cancel")
async def cancel_deposit(deposit_id: str, reason: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    """Cancel a deposit request (only if not yet in progress)"""
    deposit = await db.deposits.find_one({"id": deposit_id})
    
    if not deposit:
        raise HTTPException(status_code=404, detail="Deposit request not found")
    
    if deposit["user_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    if deposit["status"] in ["in_progress", "completed"]:
        raise HTTPException(status_code=400, detail="Cannot cancel a deposit that is in progress or completed")
    
    await db.deposits.update_one(
        {"id": deposit_id},
        {
            "$set": {
                "status": "cancelled",
                "cancelled_at": datetime.utcnow(),
                "cancellation_reason": reason or "Cancelled by user",
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    return {
        "success": True,
        "message": "Deposit request cancelled successfully"
    }

@api_router.get("/deposits/active/current")
async def get_active_deposit(current_user: dict = Depends(get_current_user)):
    """Get current active deposit request for user"""
    deposit = await db.deposits.find_one({
        "user_id": current_user["id"],
        "status": {"$in": ["requested", "agent_assigned", "in_progress"]}
    })
    
    if not deposit:
        return {"has_active": False, "deposit": None}
    
    # Mask BC mobile
    if deposit.get("bc_agent_mobile"):
        deposit["bc_agent_mobile"] = mask_mobile(deposit["bc_agent_mobile"])
    
    return {"has_active": True, "deposit": deposit}

# ======================= HEALTH CHECK =======================

@api_router.get("/")
async def root():
    return {
        "message": "CashJama API",
        "version": "1.0.0",
        "status": "running"
    }

@api_router.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "database": "connected"
    }

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
