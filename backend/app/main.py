from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.auth import router as auth_router
from app.api.v1.contacts import router as contacts_router
from app.api.v1.deals import router as deals_router
from app.api.v1.activities import router as activities_router
from app.api.v1.campaigns import router as campaigns_router
from app.api.v1.tags import router as tags_router

app = FastAPI(
    title="CRM API",
    description="Customer Relationship Management API",
    version="0.1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/auth", tags=["Authentication"])
app.include_router(contacts_router, prefix="/contacts", tags=["Contacts"])
app.include_router(deals_router, prefix="/deals", tags=["Deals"])
app.include_router(activities_router, prefix="/activities", tags=["Activities"])
app.include_router(campaigns_router, prefix="/campaigns", tags=["Campaigns"])
app.include_router(tags_router, prefix="/tags", tags=["Tags"])

@app.get("/")
def root():
    return {"message": "CRM API is running!"}

@app.get("/health")
def health():
    return {"status": "healthy"}