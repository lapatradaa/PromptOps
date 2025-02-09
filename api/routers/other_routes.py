from fastapi import APIRouter, HTTPException

router = APIRouter()


@router.post("/stop-test/")
async def stop_test():
    try:
        # Some logic to stop your test
        print("⏸️ Stopping the test process...")
        return {"message": "Test stopped successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
