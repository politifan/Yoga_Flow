from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from app.config import settings
from uvicorn import run

# Routers
from app.routes import pages, auth, pricing, consult, subscriptions, profile

app = FastAPI(title="Yoga Telegram Courses")

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Include routers
app.include_router(pages.router)
app.include_router(pricing.router)
app.include_router(auth.router)
app.include_router(consult.router)
app.include_router(subscriptions.router)
app.include_router(profile.router)


@app.get("/healthz")
def healthz():
    return {"ok": True, "env": settings.ENV}

if __name__ == '__main__':
    run(app)