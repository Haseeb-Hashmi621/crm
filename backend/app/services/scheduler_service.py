"""
backend/app/services/scheduler_service.py  — NEW FILE

Priority 5 — Campaign / Message Scheduling.

Design: no existing job-queue infrastructure exists in this codebase (no Celery,
no Redis), so this uses APScheduler's BackgroundScheduler with a simple polling
job that runs every 60 seconds inside the same FastAPI process. It looks across
all three campaign tables (email, SMS, WhatsApp) for rows with
status == 'scheduled' and scheduled_at <= now, and fires the existing send_*
functions for each — the exact same send path a user triggers manually from
the UI, so there is only one code path per channel to maintain.

Failures are caught per-campaign so one bad campaign can't block others in the
same tick, and the failure reason is persisted on the row (schedule_failed_reason)
so the UI can surface it instead of a campaign silently vanishing into "sent"
with zero recipients.

Started from app.main on FastAPI startup, shut down cleanly on FastAPI shutdown.
"""
from datetime import datetime, timezone
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
import logging

from app.core.database import SessionLocal
from app.models.campaign import Campaign
from app.models.sms_campaign import SmsCampaign
from app.models.whatsapp_campaign import WhatsappCampaign

logger = logging.getLogger("scheduler")

_scheduler: BackgroundScheduler | None = None

# How often the poller checks for due campaigns. 60s keeps scheduling accuracy
# to within a minute, which is more than sufficient for marketing sends.
POLL_INTERVAL_SECONDS = 60


def _process_due_email_campaigns(db) -> None:
    from app.services.campaign_service import send_campaign

    now = datetime.now(timezone.utc)
    due = db.query(Campaign).filter(
        Campaign.status == "scheduled",
        Campaign.scheduled_at.isnot(None),
        Campaign.scheduled_at <= now,
    ).all()

    for campaign in due:
        try:
            result = send_campaign(db, str(campaign.id), campaign.user_id, None)
            if "error" in result:
                campaign.status = "failed"
                campaign.schedule_failed_reason = result["error"]
                db.commit()
                logger.warning(f"Scheduled email campaign {campaign.id} failed: {result['error']}")
            else:
                logger.info(f"Scheduled email campaign {campaign.id} sent: {result}")
        except Exception as e:
            db.rollback()
            try:
                campaign.status = "failed"
                campaign.schedule_failed_reason = str(e)[:500]
                db.commit()
            except Exception:
                db.rollback()
            logger.error(f"Scheduled email campaign {campaign.id} raised: {e}")


def _process_due_sms_campaigns(db) -> None:
    from app.services.sms_campaign_service import send_sms_campaign

    now = datetime.now(timezone.utc)
    due = db.query(SmsCampaign).filter(
        SmsCampaign.status == "scheduled",
        SmsCampaign.scheduled_at.isnot(None),
        SmsCampaign.scheduled_at <= now,
    ).all()

    for campaign in due:
        try:
            result = send_sms_campaign(db, str(campaign.id), campaign.user_id, None)
            if "error" in result:
                campaign.status = "failed"
                campaign.schedule_failed_reason = result["error"]
                db.commit()
                logger.warning(f"Scheduled SMS campaign {campaign.id} failed: {result['error']}")
            else:
                logger.info(f"Scheduled SMS campaign {campaign.id} sent: {result}")
        except Exception as e:
            db.rollback()
            try:
                campaign.status = "failed"
                campaign.schedule_failed_reason = str(e)[:500]
                db.commit()
            except Exception:
                db.rollback()
            logger.error(f"Scheduled SMS campaign {campaign.id} raised: {e}")


def _process_due_whatsapp_campaigns(db) -> None:
    from app.services.whatsapp_campaign_service import send_whatsapp_campaign

    now = datetime.now(timezone.utc)
    due = db.query(WhatsappCampaign).filter(
        WhatsappCampaign.status == "scheduled",
        WhatsappCampaign.scheduled_at.isnot(None),
        WhatsappCampaign.scheduled_at <= now,
    ).all()

    for campaign in due:
        try:
            result = send_whatsapp_campaign(db, str(campaign.id), campaign.user_id, None)
            if "error" in result:
                campaign.status = "failed"
                campaign.schedule_failed_reason = result["error"]
                db.commit()
                logger.warning(f"Scheduled WhatsApp campaign {campaign.id} failed: {result['error']}")
            else:
                logger.info(f"Scheduled WhatsApp campaign {campaign.id} sent: {result}")
        except Exception as e:
            db.rollback()
            try:
                campaign.status = "failed"
                campaign.schedule_failed_reason = str(e)[:500]
                db.commit()
            except Exception:
                db.rollback()
            logger.error(f"Scheduled WhatsApp campaign {campaign.id} raised: {e}")


def _poll_tick() -> None:
    """One scheduler tick — checks all three channels for due campaigns."""
    db = SessionLocal()
    try:
        _process_due_email_campaigns(db)
        _process_due_sms_campaigns(db)
        _process_due_whatsapp_campaigns(db)
    except Exception as e:
        logger.error(f"Scheduler tick failed: {e}")
    finally:
        db.close()


def start_scheduler() -> None:
    """Call once on FastAPI startup."""
    global _scheduler
    if _scheduler is not None:
        return  # already running (e.g. reload)

    _scheduler = BackgroundScheduler(timezone="UTC")
    _scheduler.add_job(
        _poll_tick,
        trigger=IntervalTrigger(seconds=POLL_INTERVAL_SECONDS),
        id="campaign_scheduler_poll",
        max_instances=1,
        coalesce=True,
        replace_existing=True,
    )
    _scheduler.start()
    logger.info(f"Campaign scheduler started — polling every {POLL_INTERVAL_SECONDS}s")


def stop_scheduler() -> None:
    """Call once on FastAPI shutdown."""
    global _scheduler
    if _scheduler is not None:
        _scheduler.shutdown(wait=False)
        _scheduler = None
        logger.info("Campaign scheduler stopped")
