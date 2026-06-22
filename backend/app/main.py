from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.auth import router as auth_router
from app.api.v1.contacts import router as contacts_router
from app.api.v1.deals import router as deals_router
from app.api.v1.activities import router as activities_router
from app.api.v1.campaigns import router as campaigns_router
from app.api.v1.tags import router as tags_router
from app.api.v1.search import router as search_router
from app.api.v1.sms_campaigns import router as sms_campaigns_router
from app.api.v1.whatsapp_campaigns import router as whatsapp_campaigns_router
from app.api.v1.notifications import router as notifications_router
from app.api.v1.segments import router as segments_router
from app.api.v1.email_templates import router as email_templates_router
from app.api.v1.inbox import router as inbox_router
from app.api.v1.conversations import router as conversations_router
from app.api.v1.webhooks import router as webhooks_router
from app.api.v1.ai import router as ai_router
from app.api.v1.tasks import router as tasks_router
from app.api.v1.mails import router as mail_router
from app.api.v1.admin import router as admin_router
from app.api.v1.products import router as products_router

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
app.include_router(sms_campaigns_router, prefix="/sms-campaigns", tags=["SMS Campaigns"])
app.include_router(whatsapp_campaigns_router, prefix="/whatsapp-campaigns", tags=["WhatsApp Campaigns"])
app.include_router(tags_router, prefix="/tags", tags=["Tags"])
app.include_router(search_router, prefix="/search", tags=["Search"])
app.include_router(notifications_router, prefix="/notifications", tags=["Notifications"])
app.include_router(segments_router, prefix="/segments", tags=["Segments"])
app.include_router(email_templates_router, prefix="/email-templates", tags=["Email Templates"])
app.include_router(inbox_router, prefix="/inbox", tags=["Inbox"])
app.include_router(conversations_router, prefix="/conversations", tags=["Conversations"])
app.include_router(webhooks_router, prefix="/webhooks", tags=["Webhooks"])
app.include_router(ai_router, prefix="/ai", tags=["AI"])
app.include_router(tasks_router, prefix="/tasks", tags=["Tasks"])
app.include_router(mail_router, prefix="/mail", tags=["Mails"])
app.include_router(admin_router, prefix="/admin", tags=["Admin"])
app.include_router(products_router, prefix="/products", tags=["Products"])

@app.get("/")
def root():
    return {"message": "CRM API is running!"}

@app.get("/health")
def health():
    return {"status": "healthy"}