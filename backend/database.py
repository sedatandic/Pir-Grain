from datetime import datetime
from bson import ObjectId
from pymongo import MongoClient
from config import MONGO_URL, DB_NAME

client = MongoClient(MONGO_URL)
db = client[DB_NAME]

users_col = db["users"]
trades_col = db["trades"]
partners_col = db["partners"]
vessels_col = db["vessels"]
documents_col = db["documents"]
commodities_col = db["commodities"]
origins_col = db["origins"]
ports_col = db["ports"]
surveyors_col = db["surveyors"]
events_col = db["events"]
invoices_col = db["invoices"]
bank_statements_col = db["bank_statements"]
notifications_col = db["notifications"]
disport_agents_col = db["disport_agents"]


def serialize_doc(doc):
    if doc is None:
        return None
    doc["id"] = str(doc.pop("_id"))
    for key, value in doc.items():
        if isinstance(value, datetime):
            doc[key] = value.isoformat()
        elif isinstance(value, ObjectId):
            doc[key] = str(value)
    return doc


def create_notification(ntype, message, entity_ref=None, username=None):
    notifications_col.insert_one({
        "type": ntype,
        "message": message,
        "entityRef": entity_ref,
        "username": username or "system",
        "readBy": [],
        "createdAt": datetime.utcnow()
    })
