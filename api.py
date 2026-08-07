from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pymongo import MongoClient
import os
from bson import ObjectId
from typing import Optional
from dotenv import load_dotenv

from agent_service import orchestrator

load_dotenv()

app = FastAPI(title="Jinvexa API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://crystal-trailside-transform.ngrok-free.dev"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MONGO_URI = os.getenv("MONGODB_URI")
try:
    client = MongoClient(MONGO_URI)
    db = client["jinvexa_db"]
    users_collection = db["users"]
    print("✅ Successfully connected to MongoDB Atlas!")
except Exception as e:
    print(f"❌ MongoDB Connection Error: {e}")

class LoginRequest(BaseModel):
    username: str
    password: str

class SignUpRequest(BaseModel):
    name: str
    email: str
    phone: str
    password: str

class UserProfileUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    bio: Optional[str] = None
    learning_goal: Optional[str] = None

@app.post("/api/signup")
async def signup(user: SignUpRequest):
    if users_collection.find_one({"email": user.email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    
    new_user = {
        "name": user.name,
        "email": user.email,
        "phone": user.phone,
        "password": user.password,
        "username": user.name.split()[0].lower()
    }
    users_collection.insert_one(new_user)
    return {"message": "User created successfully"}

@app.post("/api/login")
async def login(credentials: LoginRequest):
    user = users_collection.find_one({
        "$or": [{"email": credentials.username}, {"username": credentials.username}],
        "password": credentials.password
    })
    
    if user:
        return {
            "token": f"mock_jwt_token_for_{str(user['_id'])}", 
            "user_id": str(user["_id"]),
            "username": user.get("username", user["name"])
        }
        
    raise HTTPException(status_code=401, detail="Invalid credentials")

@app.put("/api/users/{user_id}")
async def update_user_profile(user_id: str, profile_data: UserProfileUpdate):
    try:
        update_data = {k: v for k, v in profile_data.dict().items() if v is not None}
        if not update_data:
            return {"message": "No data provided to update"}
        
        result = users_collection.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": update_data}
        )
        if result.modified_count == 1:
            return {"message": "Profile updated successfully"}
        return {"message": "No changes made"}
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid User ID or database error")

@app.get("/api/users/{user_id}")
async def get_user_profile(user_id: str):
    try:
        user = users_collection.find_one({"_id": ObjectId(user_id)})
        if user:
            return {
                "name": user.get("name", ""),
                "phone": user.get("phone", ""),
                "bio": user.get("bio", ""),
                "learning_goal": user.get("learning_goal", "")
            }
        raise HTTPException(status_code=404, detail="User not found")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid User ID")

# ==========================================
# AGENT API ENDPOINTS
# ==========================================

@app.post("/api/agents/discover")
async def run_discovery_agent(payload: dict):
    try:
        return await orchestrator.discovery_agent.process(payload)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/agents/teach")
async def run_teaching_agent(payload: dict):
    try:
        return await orchestrator.teaching_agent.process(payload)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/agents/mentor")
async def run_mentoring_agent(payload: dict):
    try:
        return await orchestrator.mentoring_agent.process(payload)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/agents/assignment/generate")
async def generate_assignment(payload: dict):
    try:
        return await orchestrator.assignment_generator.process(payload)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/agents/assignment/evaluate")
async def evaluate_assignment(payload: dict):
    try:
        return await orchestrator.assignment_evaluator.process(payload)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/agents/tracker/progress")
async def get_user_progress(payload: dict):
    try:
        return await orchestrator.assignment_tracker.process(payload)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/users/{user_id}/sessions")
async def get_user_sessions(user_id: str):
    """Fetches all learning sessions for the dropdown menus."""
    try:
        sessions = orchestrator.memory.get_user_sessions(user_id)
        available = []
        for s in sessions:
            if s.learning_plan:
                # Parse learning plan if it's stored as a JSON string
                import json
                plan = s.learning_plan
                if isinstance(plan, str):
                    try:
                        plan = json.loads(plan)
                    except:
                        continue
                
                available.append({
                    "session_id": s.session_id,
                    "main_topic": plan.get("main_topic", "Unknown Course")
                })
        return {"sessions": available}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))