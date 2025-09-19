from fastapi import APIRouter

router = APIRouter(prefix="/batch", tags=["batch-debug"])

@router.get("/test")
async def test_endpoint():
    """Endpoint simples para teste"""
    return {"message": "Batch router funcionando"}
