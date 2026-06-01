from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from database import supabase
from config import FRONTEND_URL
from typing import Optional

app = FastAPI(title="Ascenda Groups API")

# CORS - Allow frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "http://localhost:3000", "http://localhost:5500", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ========== MODELS ==========
class ContactMessage(BaseModel):
    name: str
    email: str
    subject: str = ""
    message: str

class JobCreate(BaseModel):
    title: str
    description: str
    category: str
    location: str = "Remote"
    type: str = "Full-time"
    salary: Optional[str] = None

class MarketplaceCreate(BaseModel):
    title: str
    description: str
    category: str
    price: float
    seller_contact: str

class BlogCreate(BaseModel):
    title: str
    slug: str
    content: str
    excerpt: str = ""

# ========== AUTH HELPERS ==========
async def get_current_user(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    token = authorization.split(" ")[1]
    try:
        user = supabase.auth.get_user(token)
        return user.user
    except:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_admin_user(user = Depends(get_current_user)):
    res = supabase.table("profiles").select("role").eq("id", user.id).single().execute()
    if not res.data or res.data.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

# ========== PUBLIC ROUTES ==========
@app.get("/")
def root():
    return {"status": "ok", "message": "Ascenda Groups API Running"}

@app.get("/api/health")
def health():
    return {"status": "healthy"}

@app.post("/api/contact")
def submit_contact(msg: ContactMessage):
    res = supabase.table("contact_messages").insert(msg.dict()).execute()
    if hasattr(res, 'error') and res.error:
        raise HTTPException(status_code=500, detail="Failed to send message")
    return {"success": True, "message": "Message sent!"}

# ========== AUTH ROUTES ==========
@app.post("/api/agent/apply")
async def apply_agent(user = Depends(get_current_user)):
    existing = supabase.table("agents").select("*").eq("profile_id", user.id).execute()
    if existing.data and len(existing.data) > 0:
        raise HTTPException(status_code=400, detail="Already applied")
    supabase.table("agents").insert({
        "profile_id": user.id,
        "status": "pending"
    }).execute()
    return {"success": True, "message": "Application submitted!"}

@app.get("/api/agent/status")
async def agent_status(user = Depends(get_current_user)):
    res = supabase.table("agents").select("*").eq("profile_id", user.id).single().execute()
    if not res.data:
        return {"applied": False}
    return {"applied": True, "status": res.data.get("status"), "earnings": res.data.get("total_earnings", 0)}

# ========== ADMIN ROUTES ==========
@app.get("/api/admin/dashboard")
async def admin_dashboard(admin = Depends(get_admin_user)):
    agents = supabase.table("agents").select("*, profiles(full_name, email)").eq("status", "pending").execute()
    messages = supabase.table("contact_messages").select("*").order("created_at", desc=True).limit(20).execute()
    jobs = supabase.table("jobs").select("*").order("created_at", desc=True).execute()
    return {
        "pending_agents": agents.data or [],
        "messages": messages.data or [],
        "jobs": jobs.data or []
    }

@app.put("/api/admin/agents/{agent_id}/approve")
async def approve_agent(agent_id: str, admin = Depends(get_admin_user)):
    supabase.table("agents").update({
        "status": "approved",
        "approved_by": admin.id
    }).eq("id", agent_id).execute()
    return {"success": True}

@app.put("/api/admin/agents/{agent_id}/reject")
async def reject_agent(agent_id: str, admin = Depends(get_admin_user)):
    supabase.table("agents").update({"status": "rejected"}).eq("id", agent_id).execute()
    return {"success": True}

@app.post("/api/admin/jobs")
async def create_job(job: JobCreate, admin = Depends(get_admin_user)):
    supabase.table("jobs").insert({
        **job.dict(),
        "posted_by": admin.id,
        "is_active": True
    }).execute()
    return {"success": True, "message": "Job created!"}

@app.delete("/api/admin/jobs/{job_id}")
async def delete_job(job_id: str, admin = Depends(get_admin_user)):
    supabase.table("jobs").update({"is_active": False}).eq("id", job_id).execute()
    return {"success": True}

@app.post("/api/admin/marketplace")
async def create_marketplace(item: MarketplaceCreate, admin = Depends(get_admin_user)):
    supabase.table("marketplace_items").insert({
        **item.dict(),
        "posted_by": admin.id,
        "is_active": True
    }).execute()
    return {"success": True, "message": "Item created!"}

@app.delete("/api/admin/marketplace/{item_id}")
async def delete_marketplace(item_id: str, admin = Depends(get_admin_user)):
    supabase.table("marketplace_items").update({"is_active": False}).eq("id", item_id).execute()
    return {"success": True}

@app.post("/api/admin/blog")
async def create_blog(post: BlogCreate, admin = Depends(get_admin_user)):
    supabase.table("blog_posts").insert({
        **post.dict(),
        "author_id": admin.id,
        "published": True
    }).execute()
    return {"success": True, "message": "Blog posted!"}

@app.delete("/api/admin/blog/{post_id}")
async def delete_blog(post_id: str, admin = Depends(get_admin_user)):
    supabase.table("blog_posts").update({"published": False}).eq("id", post_id).execute()
    return {"success": True}