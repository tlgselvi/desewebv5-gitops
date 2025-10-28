from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import health, actions, training, metrics

app = FastAPI(title="CPT Ajanı API", version="1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"], 
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/api/v1")
app.include_router(actions.router, prefix="/api/v1")
app.include_router(training.router, prefix="/api/v1")
app.include_router(metrics.router, prefix="/api/v1")

@app.get("/")
def root():
    return {"service": "cpt-ajan", "status": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)
