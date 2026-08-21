import io
import zipfile
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.auth import get_current_user, CurrentUser
from app.models import GeneratedFile

router = APIRouter(prefix="/export", tags=["export"])


class ExportRequest(BaseModel):
    project_name: str
    files: list[GeneratedFile]


@router.post("/zip")
def export_zip(body: ExportRequest, user: CurrentUser = Depends(get_current_user)):
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        for f in body.files:
            zf.writestr(f.path, f.content)
    buffer.seek(0)

    filename = f"{body.project_name.replace(' ', '_')}.zip"
    return StreamingResponse(
        buffer,
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
