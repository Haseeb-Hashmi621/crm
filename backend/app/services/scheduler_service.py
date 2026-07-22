"""
backend/app/services/scheduler_service.py

Priority 5 — Campaign / Message Scheduling.

Started from app.main on FastAPI startup, shut down cleanly on FastAPI shutdown.
"""
from datetime import datetime, timezone
import uuid
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
import logging

from app.core.database import SessionLocal
from app.models.campaign import Campaign
from app.models.sms_campaign import SmsCampaign
from app.models.whatsapp_campaign import WhatsappCampaign

logger = logging.getLogger("scheduler")

_scheduler: BackgroundScheduler | None = None

# How often the poller checks for due campaigns. Lower = tighter scheduling
# accuracy at the cost of more frequent DB polling. 20s keeps worst-case
# lateness under ~20s in the common case (was 60s, causing up to ~90s delays
# when combined with the old "one channel blocks all" bug).
POLL_INTERVAL_SECONDS = 20


def _resolve_contact_ids(raw) -> list | None:
    """scheduled_contact_ids is stored as a JSON list of strings, or None
    (meaning 'all contacts'). Convert back to UUID objects for the send_*
    functions, which expect Optional[List[UUID]]."""
    if not raw:
        return None
    try:
        return [uuid.UUID(str(cid)) for cid in raw]
    except (ValueError, TypeError):
        # Corrupt/unexpected data — fail safe to "all contacts" rather than
        # crash the tick, but log it so it's visible.
        logger.warning(f"Could not parse scheduled_contact_ids={raw!r}, defaulting to all contacts")
        return None


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
            contact_ids = _resolve_contact_ids(campaign.scheduled_contact_ids)
            result = send_campaign(db, str(campaign.id), campaign.user_id, contact_ids)
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
            contact_ids = _resolve_contact_ids(campaign.scheduled_contact_ids)
            result = send_sms_campaign(db, str(campaign.id), campaign.user_id, contact_ids)
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
            contact_ids = _resolve_contact_ids(campaign.scheduled_contact_ids)
            result = send_whatsapp_campaign(db, str(campaign.id), campaign.user_id, contact_ids)
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


def _process_due_email_sequences(db) -> None:
    from app.services.email_sequence_service import process_due_enrollments

    result = process_due_enrollments(db)
    if result["processed"] > 0:
        logger.info(f"Email sequences tick: {result}")


def _poll_tick() -> None:
    """One scheduler tick — checks all three channels for due campaigns.

    Each channel is isolated in its own try/except so a DNS blip or DB error
    on one channel (e.g. email) can never prevent the other two (SMS,
    WhatsApp) from being checked in the same tick. Previously all three ran
    inside a single try block, so one failure silently skipped the rest of
    the tick until the next interval.
    """
    db = SessionLocal()
    try:
        try:
            _process_due_email_campaigns(db)
        except Exception as e:
            db.rollback()
            logger.error(f"Email channel tick failed (isolated, others unaffected): {e}")

        try:
            _process_due_sms_campaigns(db)
        except Exception as e:
            db.rollback()
            logger.error(f"SMS channel tick failed (isolated, others unaffected): {e}")

        try:
            _process_due_whatsapp_campaigns(db)
        except Exception as e:
            db.rollback()
            logger.error(f"WhatsApp channel tick failed (isolated, others unaffected): {e}")

        try:
            _process_due_email_sequences(db)
        except Exception as e:
            db.rollback()
            logger.error(f"Email sequence channel tick failed (isolated, others unaffected): {e}")
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