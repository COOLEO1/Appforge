from fastapi import APIRouter, Depends
from app.auth import get_current_user, CurrentUser
from app.database import get_user_client

router = APIRouter(prefix="/credits", tags=["credits"])


@router.get("")
def get_credits(user: CurrentUser = Depends(get_current_user)):
    db = get_user_client(user.token)
    result = db.table("credits").select("remaining").eq("user_id", user.id).single().execute()
    return {"remaining": result.data["remaining"] if result.data else 0}
