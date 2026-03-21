from datetime import datetime

from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId

from database import users_col, serialize_doc
from auth import get_current_user, pwd_context
from models import UserCreate
from config import TRADE_STATUSES

router = APIRouter(prefix="/api", tags=["users"])


@router.get("/users")
def list_users(user=Depends(get_current_user)):
    users = list(users_col.find())
    for u in users:
        u.pop("password", None)
    return [serialize_doc(u) for u in users]


@router.post("/users")
def create_user(u: UserCreate, user=Depends(get_current_user)):
    if users_col.find_one({"username": u.username}):
        raise HTTPException(status_code=400, detail="Username already exists")
    data = u.dict()
    data["password"] = pwd_context.hash(data.pop("password"))
    data["status"] = "active"
    data["createdAt"] = datetime.utcnow()
    result = users_col.insert_one(data)
    data["_id"] = result.inserted_id
    data.pop("password", None)
    return serialize_doc(data)


@router.delete("/users/{user_id}")
def delete_user(user_id: str, user=Depends(get_current_user)):
    users_col.delete_one({"_id": ObjectId(user_id)})
    return {"message": "Deleted"}


@router.put("/users/{user_id}")
def update_user(user_id: str, body: dict, user=Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Only admins can update users")
    update_fields = {}
    for field in ["name", "email", "whatsapp", "role", "username"]:
        if field in body and body[field] is not None:
            update_fields[field] = body[field]
    if "password" in body and body["password"]:
        update_fields["password"] = pwd_context.hash(body["password"])
    if update_fields:
        users_col.update_one({"_id": ObjectId(user_id)}, {"$set": update_fields})
    doc = users_col.find_one({"_id": ObjectId(user_id)})
    if doc:
        doc.pop("password", None)
    return serialize_doc(doc)


@router.get("/trade-statuses")
def get_trade_statuses(user=Depends(get_current_user)):
    return TRADE_STATUSES
