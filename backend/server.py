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

# DEV MODE - Set to False in production
DEV_MODE = os.environ.get('DEV_MODE', 'true').lower() == 'true'
DEV_OTP = "123456"  # Fixed OTP for development testing

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
            # Append Z to indicate UTC timezone for proper frontend parsing
            result[key] = value.isoformat() + "Z"
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
    
    # DEV MODE: Accept fixed OTP bypass
    is_dev_otp = DEV_MODE and otp == DEV_OTP
    
    if is_dev_otp:
        logger.info(f"[DEV MODE] Using bypass OTP {DEV_OTP} for {mobile}")
    
    # Find OTP log (skip if using dev OTP)
    otp_log = await db.otp_logs.find_one({
        "mobile": mobile,
        "verified": False,
        "expires_at": {"$gt": datetime.utcnow()}
    })
    
    if not otp_log and not is_dev_otp:
        raise HTTPException(status_code=400, detail="OTP expired or not found. Please request a new OTP.")
    
    if otp_log and not is_dev_otp:
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
    
    # Mark OTP as verified (if exists)
    if otp_log:
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
    """Get current active deposit request for user - includes ALL active statuses until completed"""
    deposit = await db.deposits.find_one({
        "user_id": current_user["id"],
        "status": {"$in": ["requested", "agent_assigned", "arrived", "cash_collected", "deposited", "awaiting_confirmation"]}
    })
    
    if not deposit:
        return {"has_active": False, "deposit": None}
    
    # Mask BC mobile
    if deposit.get("bc_agent_mobile"):
        deposit["bc_agent_mobile"] = mask_mobile(deposit["bc_agent_mobile"])
    
    return {"has_active": True, "deposit": serialize_doc(deposit)}

# ======================= BC AGENT ENDPOINTS =======================

# BC Agent Location Model
class BCLocationUpdate(BaseModel):
    latitude: float
    longitude: float
    accuracy: Optional[float] = None

class JobOTPVerify(BaseModel):
    otp: str

async def require_bc_agent(current_user: dict = Depends(get_current_user)):
    """Dependency to require BC agent role"""
    if current_user.get("role") != "bc_agent":
        raise HTTPException(status_code=403, detail="BC agent access required")
    return current_user

@api_router.get("/bc/jobs/available")
async def get_available_jobs(current_user: dict = Depends(require_bc_agent)):
    """Get all available jobs for BC agents (status: requested)"""
    jobs = await db.deposits.find({
        "status": "requested"
    }).sort("created_at", 1).to_list(50)
    
    # Add distance info if BC has location
    bc_location = await db.bc_locations.find_one({"bc_agent_id": current_user["id"]})
    
    serialized_jobs = []
    for job in jobs:
        job_data = serialize_doc(job)
        # In production, calculate actual distance from BC location
        job_data["estimated_distance"] = "~2-5 km"  # Placeholder
        serialized_jobs.append(job_data)
    
    return {
        "jobs": serialized_jobs,
        "count": len(serialized_jobs)
    }

@api_router.get("/bc/jobs/assigned")
async def get_assigned_jobs(current_user: dict = Depends(require_bc_agent)):
    """Get jobs assigned to current BC agent - returns ONLY ONE active job (earliest by assigned_at)"""
    # Fetch all active jobs
    all_jobs = await db.deposits.find({
        "bc_agent_id": current_user["id"],
        "status": {"$in": ["agent_assigned", "arrived", "cash_collected", "deposited", "awaiting_confirmation"]}
    }).sort("assigned_at", 1).to_list(100)  # Sort ascending to get earliest first
    
    # Return only the first (earliest) active job - BC must have AT MOST ONE active job
    if all_jobs:
        primary_job = all_jobs[0]
        extra_jobs_count = len(all_jobs) - 1
        return {
            "jobs": [serialize_doc(primary_job)],
            "count": 1,
            "warning": f"You have {extra_jobs_count} other stale job(s) that need resolution" if extra_jobs_count > 0 else None
        }
    
    return {
        "jobs": [],
        "count": 0
    }

@api_router.get("/bc/jobs/history")
async def get_bc_job_history(current_user: dict = Depends(require_bc_agent)):
    """Get completed job history for BC agent"""
    jobs = await db.deposits.find({
        "bc_agent_id": current_user["id"],
        "status": {"$in": ["completed", "cancelled"]}
    }).sort("completed_at", -1).to_list(50)
    
    return {
        "jobs": [serialize_doc(job) for job in jobs],
        "count": len(jobs)
    }

@api_router.post("/bc/jobs/{deposit_id}/accept")
async def accept_job(deposit_id: str, current_user: dict = Depends(require_bc_agent)):
    """Accept a job and get assigned to it"""
    deposit = await db.deposits.find_one({"id": deposit_id})
    
    if not deposit:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if deposit["status"] != "requested":
        raise HTTPException(status_code=400, detail="Job is no longer available")
    
    # Check if BC already has an active job (any non-completed/cancelled state)
    active_statuses = ["agent_assigned", "arrived", "cash_collected", "deposited", "awaiting_confirmation"]
    existing_job = await db.deposits.find_one({
        "bc_agent_id": current_user["id"],
        "status": {"$in": active_statuses}
    })
    
    if existing_job:
        raise HTTPException(
            status_code=400, 
            detail=f"You already have an active job (ID: {existing_job['id'][:8]}...). Complete it before accepting a new one."
        )
    
    # Generate job OTP (4 digits for simplicity)
    job_otp = ''.join(random.choices(string.digits, k=4))
    
    # Assign job to BC agent
    await db.deposits.update_one(
        {"id": deposit_id},
        {
            "$set": {
                "status": "agent_assigned",
                "bc_agent_id": current_user["id"],
                "bc_agent_name": current_user.get("name", "BC Agent"),
                "bc_agent_mobile": current_user["mobile"],
                "job_otp": job_otp,
                "assigned_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    logger.info(f"Job {deposit_id} assigned to BC {current_user['id']}, OTP: {job_otp}")
    
    return {
        "success": True,
        "message": "Job accepted successfully",
        "job_otp": job_otp,  # BC will share this with user for verification
        "user_location": deposit["location"]
    }

@api_router.post("/bc/jobs/{deposit_id}/reject")
async def reject_job(deposit_id: str, current_user: dict = Depends(require_bc_agent)):
    """Reject/release a job (only if assigned to this BC and not started)"""
    deposit = await db.deposits.find_one({"id": deposit_id})
    
    if not deposit:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if deposit.get("bc_agent_id") != current_user["id"]:
        raise HTTPException(status_code=403, detail="This job is not assigned to you")
    
    if deposit["status"] == "in_progress":
        raise HTTPException(status_code=400, detail="Cannot reject a job that is in progress")
    
    # Release the job back to pool
    await db.deposits.update_one(
        {"id": deposit_id},
        {
            "$set": {
                "status": "requested",
                "bc_agent_id": None,
                "bc_agent_name": None,
                "bc_agent_mobile": None,
                "job_otp": None,
                "assigned_at": None,
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    return {
        "success": True,
        "message": "Job released back to pool"
    }

@api_router.post("/bc/jobs/{deposit_id}/verify-otp")
async def verify_job_otp(deposit_id: str, request: JobOTPVerify, current_user: dict = Depends(require_bc_agent)):
    """Verify OTP from user after arriving to collect cash"""
    deposit = await db.deposits.find_one({"id": deposit_id})
    
    if not deposit:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if deposit.get("bc_agent_id") != current_user["id"]:
        raise HTTPException(status_code=403, detail="This job is not assigned to you")
    
    # OTP can be verified when status is 'arrived'
    if deposit["status"] != "arrived":
        raise HTTPException(status_code=400, detail="You must mark yourself as 'Arrived' before verifying OTP")
    
    # DEV MODE: Accept fixed OTP bypass (1234)
    is_dev_otp = DEV_MODE and request.otp == DEV_OTP[:4]  # Use first 4 digits of dev OTP
    
    if not is_dev_otp and deposit.get("job_otp") != request.otp:
        raise HTTPException(status_code=400, detail="Invalid OTP. Please check with customer.")
    
    # Mark OTP as verified and move to cash_collected
    await db.deposits.update_one(
        {"id": deposit_id},
        {
            "$set": {
                "status": "cash_collected",
                "job_otp_verified": True,
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    logger.info(f"Job {deposit_id} OTP verified, cash collected by BC {current_user['id']}")
    
    return {
        "success": True,
        "message": "OTP verified. Cash collected.",
        "status": "cash_collected"
    }

@api_router.post("/bc/jobs/{deposit_id}/complete")
async def complete_job(deposit_id: str, current_user: dict = Depends(require_bc_agent)):
    """BC marks deposit as initiated - awaiting user confirmation"""
    deposit = await db.deposits.find_one({"id": deposit_id})
    
    if not deposit:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if deposit.get("bc_agent_id") != current_user["id"]:
        raise HTTPException(status_code=403, detail="This job is not assigned to you")
    
    # OTP must be verified before completing
    if not deposit.get("job_otp_verified"):
        raise HTTPException(status_code=400, detail="You must verify customer OTP before completing the job")
    
    # Job must be in deposited status
    if deposit["status"] != "deposited":
        raise HTTPException(status_code=400, detail="You must mark the deposit as made first")
    
    # BC has done their part - now awaiting user confirmation
    await db.deposits.update_one(
        {"id": deposit_id},
        {
            "$set": {
                "status": "awaiting_confirmation",
                "bc_completed_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    logger.info(f"Job {deposit_id} - BC {current_user['id']} completed deposit, awaiting user confirmation")
    
    return {
        "success": True,
        "message": "Deposit completed. Awaiting customer confirmation.",
        "earnings": deposit["service_fee"]
    }

@api_router.post("/deposits/{deposit_id}/confirm-deposit")
async def user_confirm_deposit(deposit_id: str, current_user: dict = Depends(get_current_user)):
    """User confirms they received the deposit - final step to complete job"""
    deposit = await db.deposits.find_one({"id": deposit_id})
    
    if not deposit:
        raise HTTPException(status_code=404, detail="Deposit not found")
    
    if deposit.get("user_id") != current_user["id"]:
        raise HTTPException(status_code=403, detail="This deposit does not belong to you")
    
    # Must be in awaiting_confirmation status
    if deposit["status"] != "awaiting_confirmation":
        raise HTTPException(status_code=400, detail="Deposit is not awaiting confirmation")
    
    # User confirms - job is now completed
    await db.deposits.update_one(
        {"id": deposit_id},
        {
            "$set": {
                "status": "completed",
                "completed_at": datetime.utcnow(),
                "user_confirmed_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    logger.info(f"Deposit {deposit_id} confirmed by user {current_user['id']} - job completed")
    
    return {
        "success": True,
        "message": "Deposit confirmed. Thank you for using CashJama!"
    }

@api_router.post("/bc/jobs/{deposit_id}/update-status")
async def update_job_status(deposit_id: str, status: str, current_user: dict = Depends(require_bc_agent)):
    """Update job status: arrived, deposited"""
    deposit = await db.deposits.find_one({"id": deposit_id})
    
    if not deposit:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if deposit.get("bc_agent_id") != current_user["id"]:
        raise HTTPException(status_code=403, detail="This job is not assigned to you")
    
    # Valid status transitions (cash_collected is set via OTP verification)
    valid_statuses = ["arrived", "deposited"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
    
    # Check valid transitions
    current_status = deposit["status"]
    status_order = ["agent_assigned", "arrived", "cash_collected", "deposited", "completed"]
    
    if current_status not in status_order:
        raise HTTPException(status_code=400, detail="Job is not in a valid state for status update")
    
    current_idx = status_order.index(current_status)
    new_idx = status_order.index(status)
    
    # Allow forward progression only (with one step at a time)
    if new_idx != current_idx + 1:
        raise HTTPException(status_code=400, detail=f"Cannot move from {current_status} to {status}. Follow the correct sequence.")
    
    update_data = {
        "status": status,
        "updated_at": datetime.utcnow()
    }
    
    # Set timestamps based on status
    if status == "arrived":
        update_data["arrived_at"] = datetime.utcnow()
    elif status == "deposited":
        update_data["deposited_at"] = datetime.utcnow()
    
    await db.deposits.update_one({"id": deposit_id}, {"$set": update_data})
    
    logger.info(f"Job {deposit_id} status updated to {status} by BC {current_user['id']}")
    
    return {
        "success": True,
        "message": f"Status updated to {status}",
        "status": status
    }

@api_router.put("/bc/online-status")
async def update_online_status(is_online: bool, current_user: dict = Depends(require_bc_agent)):
    """Update BC agent online/offline status"""
    await db.users.update_one(
        {"id": current_user["id"]},
        {
            "$set": {
                "is_online": is_online,
                "last_online_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    return {
        "success": True,
        "is_online": is_online,
        "message": "Online" if is_online else "Offline"
    }

@api_router.get("/bc/online-status")
async def get_online_status(current_user: dict = Depends(require_bc_agent)):
    """Get BC agent online/offline status"""
    user = await db.users.find_one({"id": current_user["id"]})
    return {
        "is_online": user.get("is_online", False)
    }

@api_router.put("/bc/location")
async def update_bc_location(location: BCLocationUpdate, current_user: dict = Depends(require_bc_agent)):
    """Update BC agent's current GPS location"""
    await db.bc_locations.update_one(
        {"bc_agent_id": current_user["id"]},
        {
            "$set": {
                "bc_agent_id": current_user["id"],
                "latitude": location.latitude,
                "longitude": location.longitude,
                "accuracy": location.accuracy,
                "updated_at": datetime.utcnow()
            }
        },
        upsert=True
    )
    
    return {
        "success": True,
        "message": "Location updated"
    }

@api_router.get("/bc/location/{bc_agent_id}")
async def get_bc_location(bc_agent_id: str, current_user: dict = Depends(get_current_user)):
    """Get BC agent's current location (for users tracking their assigned agent)"""
    # Verify user has a deposit with this BC agent
    if current_user.get("role") == "user":
        deposit = await db.deposits.find_one({
            "user_id": current_user["id"],
            "bc_agent_id": bc_agent_id,
            "status": {"$in": ["agent_assigned", "in_progress"]}
        })
        if not deposit:
            raise HTTPException(status_code=403, detail="Access denied")
    
    bc_location = await db.bc_locations.find_one({"bc_agent_id": bc_agent_id})
    
    if not bc_location:
        return {"has_location": False, "location": None}
    
    return {
        "has_location": True,
        "location": {
            "latitude": bc_location["latitude"],
            "longitude": bc_location["longitude"],
            "updated_at": bc_location.get("updated_at")
        }
    }

@api_router.get("/bc/earnings")
async def get_bc_earnings(current_user: dict = Depends(require_bc_agent)):
    """Get BC agent's earnings summary"""
    # Get completed jobs
    completed_jobs = await db.deposits.find({
        "bc_agent_id": current_user["id"],
        "status": "completed"
    }).to_list(1000)
    
    total_earnings = sum(job.get("service_fee", 0) for job in completed_jobs)
    total_jobs = len(completed_jobs)
    
    # Today's earnings
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    today_jobs = [j for j in completed_jobs if j.get("completed_at") and j["completed_at"] >= today_start]
    today_earnings = sum(job.get("service_fee", 0) for job in today_jobs)
    
    return {
        "total_earnings": total_earnings,
        "total_jobs": total_jobs,
        "today_earnings": today_earnings,
        "today_jobs": len(today_jobs)
    }

@api_router.get("/bc/job/{deposit_id}")
async def get_bc_job_details(deposit_id: str, current_user: dict = Depends(require_bc_agent)):
    """Get specific job details for BC agent"""
    deposit = await db.deposits.find_one({"id": deposit_id})
    
    if not deposit:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # BC can only see jobs that are available or assigned to them
    if deposit["status"] != "requested" and deposit.get("bc_agent_id") != current_user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return serialize_doc(deposit)

# ======================= ADMIN: CREATE BC AGENT =======================

@api_router.post("/admin/create-bc-agent")
async def create_bc_agent(mobile: str, name: str = "BC Agent"):
    """Create a BC agent account (for testing/pilot)"""
    # Check if user exists
    existing = await db.users.find_one({"mobile": mobile})
    
    if existing:
        # Update role to bc_agent
        await db.users.update_one(
            {"mobile": mobile},
            {"$set": {"role": "bc_agent", "name": name, "updated_at": datetime.utcnow()}}
        )
        return {"success": True, "message": "User upgraded to BC agent"}
    
    # Create new BC agent
    bc_agent = User(
        mobile=mobile,
        name=name,
        role="bc_agent",
        is_verified=True
    )
    await db.users.insert_one(bc_agent.dict())
    
    return {
        "success": True,
        "message": "BC agent created",
        "user_id": bc_agent.id
    }

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
