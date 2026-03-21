from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends
from bson import ObjectId

from database import vessels_col, serialize_doc, create_notification
from auth import require_roles
from models import VesselCreate

non_accountant = require_roles("admin", "user")

router = APIRouter(prefix="/api/vessels", tags=["vessels"])


@router.get("")
def list_vessels(search: Optional[str] = None, user=Depends(non_accountant)):
    query = {}
    if search:
        query["$or"] = [{"name": {"$regex": search, "$options": "i"}}, {"imoNumber": {"$regex": search, "$options": "i"}}]
    return [serialize_doc(v) for v in vessels_col.find(query).sort("name", 1)]


@router.post("")
def create_vessel(vessel: VesselCreate, user=Depends(non_accountant)):
    data = vessel.dict()
    data["createdAt"] = datetime.utcnow()
    result = vessels_col.insert_one(data)
    data["_id"] = result.inserted_id
    create_notification("vessel", f"New vessel added: {data.get('name', '')}", str(result.inserted_id), user.get("username"))
    return serialize_doc(data)


@router.put("/{vessel_id}")
def update_vessel(vessel_id: str, vessel: VesselCreate, user=Depends(non_accountant)):
    data = vessel.dict()
    vessels_col.update_one({"_id": ObjectId(vessel_id)}, {"$set": data})
    updated = vessels_col.find_one({"_id": ObjectId(vessel_id)})
    create_notification("vessel", f"Vessel updated: {updated.get('name', '')}", vessel_id, user.get("username"))
    return serialize_doc(updated)


@router.delete("/{vessel_id}")
def delete_vessel(vessel_id: str, user=Depends(non_accountant)):
    v = vessels_col.find_one({"_id": ObjectId(vessel_id)})
    vessels_col.delete_one({"_id": ObjectId(vessel_id)})
    create_notification("vessel", f"Vessel deleted: {v.get('name', '') if v else vessel_id}", vessel_id, user.get("username"))
    return {"message": "Vessel deleted"}
