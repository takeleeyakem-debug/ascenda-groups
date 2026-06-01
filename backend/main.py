from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from database import supabase
from pydantic import BaseModel, EmailStr

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://ascendagroups.netlify.app", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---- Auth Dependency ----
async def get_current_user(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Missing token")
    token = authorization.split(" ")[1]
    try:
        user = supabase.auth.get_user(token)
        return user.user
    except:
        raise HTTPException(401, "Invalid token")

# ---- Models ----
class ContactMessage(BaseModel):
    name: str
    email: EmailStr
    subject: str = ""
    message: str

# ---- Routes ----
@app.post("/api/contact")
def contact(msg: ContactMessage):
    supabase.table("contact_messages").insert(msg.dict()).execute()
    return {"success": True}

@app.post("/api/agent/apply")
async def apply_agent(user = Depends(get_current_user)):
    existing = supabase.table("agents").select("*").eq("profile_id", user.id).execute()
    if existing.data:
        raise HTTPException(400, "Already applied")
    supabase.table("agents").insert({"profile_id": user.id}).execute()
    return {"success": True}

@app.put("/api/admin/agents/{agent_id}/approve")
async def approve_agent(agent_id: str, user = Depends(get_current_user)):
    # check admin
    profile = supabase.table("profiles").select("role").eq("id", user.id).single().execute()
    if profile.data['role'] != 'admin':
        raise HTTPException(403, "Admin required")
    supabase.table("agents").update({"status": "approved"}).eq("id", agent_id).execute()
    return {"success": True}

@app.post("/api/admin/jobs")
async def create_job(job: dict, user = Depends(get_current_user)):
    # similar admin check
    pass