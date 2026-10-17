from fastapi import FastAPI

from app.api.routes import router as api_router

app = FastAPI(
    title="Serendipity Lab API",
    version="0.1.0",
    description="Backend service for the Serendipity Lab research-collision workflow.",
)

app.include_router(api_router)


@app.get("/")
async def root() -> dict[str, str]:
    return {"message": "Serendipity Lab backend is running."}
