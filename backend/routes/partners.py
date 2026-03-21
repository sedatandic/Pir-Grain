from datetime import datetime
from typing import Optional

from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId

from database import partners_col, serialize_doc, create_notification
from auth import get_current_user
from models import PartnerCreate

router = APIRouter(prefix="/api/partners", tags=["partners"])


@router.get("")
def list_partners(type: Optional[str] = None, search: Optional[str] = None, user=Depends(get_current_user)):
    query = {}
    if type and type != "all":
        query["type"] = type
    if search:
        query["$or"] = [
            {"companyName": {"$regex": search, "$options": "i"}},
            {"contactPerson": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
            {"companyCode": {"$regex": search, "$options": "i"}},
        ]
    return [serialize_doc(p) for p in partners_col.find(query).sort("companyName", 1)]


@router.post("")
def create_partner(partner: PartnerCreate, user=Depends(get_current_user)):
    data = partner.dict()
    data["createdAt"] = datetime.utcnow()
    data["updatedAt"] = datetime.utcnow()
    result = partners_col.insert_one(data)
    data["_id"] = result.inserted_id
    create_notification("partner", f"New counterparty added: {data.get('companyName', '')}", str(result.inserted_id), user.get("username"))
    return serialize_doc(data)


@router.get("/{partner_id}")
def get_partner(partner_id: str, user=Depends(get_current_user)):
    partner = partners_col.find_one({"_id": ObjectId(partner_id)})
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")
    return serialize_doc(partner)


@router.put("/{partner_id}")
def update_partner(partner_id: str, partner: PartnerCreate, user=Depends(get_current_user)):
    data = partner.dict()
    data["updatedAt"] = datetime.utcnow()
    partners_col.update_one({"_id": ObjectId(partner_id)}, {"$set": data})
    updated = partners_col.find_one({"_id": ObjectId(partner_id)})
    create_notification("partner", f"Counterparty updated: {updated.get('companyName', '')}", partner_id, user.get("username"))
    return serialize_doc(updated)


@router.delete("/{partner_id}")
def delete_partner(partner_id: str, user=Depends(get_current_user)):
    p = partners_col.find_one({"_id": ObjectId(partner_id)})
    partners_col.delete_one({"_id": ObjectId(partner_id)})
    create_notification("partner", f"Counterparty deleted: {p.get('companyName', '') if p else partner_id}", partner_id, user.get("username"))
    return {"message": "Partner deleted"}
