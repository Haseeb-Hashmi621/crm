"""
backend/app/services/pdf_branding.py  — NEW FILE

Shared company branding + drawing helpers for the letterhead-styled
Quotation / Invoice PDFs (exact replica of the official
BUSINESS HUB OF SPHERE CO W.L.L documents).

Required assets (place in backend/app/assets/):
    letterhead.png   — full-page A4 letterhead (new logo version)
    signature.png    — authorized signature (transparent PNG)
    stamp.png        — round company stamp   (transparent PNG)
"""
from pathlib import Path
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.pdfbase.pdfmetrics import stringWidth

# ── Assets ───────────────────────────────────────────────────────────────────
ASSETS_DIR = Path(__file__).resolve().parent.parent / "assets"
LETTERHEAD_PATH = ASSETS_DIR / "letterhead.png"
SIGNATURE_PATH = ASSETS_DIR / "signature.png"
STAMP_PATH = ASSETS_DIR / "stamp.png"

PAGE_W, PAGE_H = A4  # 595.27 x 841.89 pt

# ── Company constants ────────────────────────────────────────────────────────
VAT_NUMBER = "220024819300002"

BANK_ACCOUNTS = [
    {
        "currency": "BHD",
        "name": "BUSINESS HUB OF SPHERE CO W.L.L",
        "ac_no": "306660100100",
        "iban": "BH23ALSA00306660100100",
        "swift": "ALSABHBM",
        "bank": "AL SALAM BANK",
        "branch": "HQ BRANCH- SANABIS",
    },
    {
        "currency": "EUR",
        "name": "BUSINESS HUB OF SPHERE CO W.L.L",
        "ac_no": "306660100101",
        "iban": "BH93ALSA00306660100101",
        "swift": "ALSABHBM",
        "bank": "AL SALAM BANK",
        "branch": "HQ BRANCH- SANABIS",
    },
    {
        "currency": "USD",
        "name": "BUSINESS HUB OF SPHERE CO W.L.L",
        "ac_no": "306660100102",
        "iban": "BH66ALSA00306660100102",
        "swift": "ALSABHBM",
        "bank": "AL SALAM BANK",
        "branch": "HQ BRANCH- SANABIS",
    },
]

DEFAULT_PAYMENT_TERMS = (
    "Payment terms are 50% Advance, 40% Before Signing the MOA & 10% "
    "on printing CR."
)

QUOTE_TERMS_AND_CONDITIONS = [
    "1-The customer will pay all government fees and out-of-pocket charges in advance.",
    "__DURATION__",  # placeholder — rendered specially (clause 2)
    "3-Customer is required to submit required documents on time to complete the job within the above duration.",
    "4-In case of Cancellation of Job by any party, the company will calculate the refund amount based on the Percent Completion of the Job.",
    "5-Customer is immediately required to pay the balance payment once the job is at Final Payment Stage.",
]
DEFAULT_JOB_DURATION = "20-25"  # business days shown in clause 2

CURRENCY_LONG_NAMES = {
    "BHD": "Bahraini Dinars",
    "USD": "US Dollars",
    "EUR": "Euros",
    "GBP": "Pounds Sterling",
    "SAR": "Saudi Riyals",
    "AED": "UAE Dirhams",
    "PKR": "Pakistani Rupees",
    "INR": "Indian Rupees",
}

GRID = colors.HexColor("#808080")      # box / grid line grey
ROW_GREY = colors.HexColor("#E6E6E6")  # alternating row fill

FONT = "Times-Bold"          # the official documents use bold Times throughout
FONT_LIGHT = "Times-Roman"


# ── Low-level helpers (coordinates given as "top" measured from page top) ───
def y_base(top: float, size: float) -> float:
    """Convert a 'distance from page top' into a ReportLab text baseline."""
    return PAGE_H - top - 0.784 * size


def text(c, x: float, top: float, s: str, size: float = 9, font: str = FONT):
    c.setFont(font, size)
    c.setFillColor(colors.black)
    c.drawString(x, y_base(top, size), s)


def text_center(c, cx: float, top: float, s: str, size: float = 9, font: str = FONT):
    c.setFont(font, size)
    c.setFillColor(colors.black)
    c.drawCentredString(cx, y_base(top, size), s)


def text_right(c, rx: float, top: float, s: str, size: float = 9, font: str = FONT):
    c.setFont(font, size)
    c.setFillColor(colors.black)
    c.drawRightString(rx, y_base(top, size), s)


def box(c, x0: float, top0: float, x1: float, top1: float,
        fill=None, stroke=GRID, line_w: float = 0.75):
    """Rectangle given in top-down coordinates."""
    c.saveState()
    if fill is not None:
        c.setFillColor(fill)
    if stroke is not None:
        c.setStrokeColor(stroke)
        c.setLineWidth(line_w)
    c.rect(x0, PAGE_H - top1, x1 - x0, top1 - top0,
           fill=1 if fill is not None else 0,
           stroke=1 if stroke is not None else 0)
    c.restoreState()


def hline(c, x0: float, x1: float, top: float,
          color=colors.black, line_w: float = 0.9):
    c.saveState()
    c.setStrokeColor(color)
    c.setLineWidth(line_w)
    c.line(x0, PAGE_H - top, x1, PAGE_H - top)
    c.restoreState()


def vline(c, x: float, top0: float, top1: float,
          color=GRID, line_w: float = 0.75):
    c.saveState()
    c.setStrokeColor(color)
    c.setLineWidth(line_w)
    c.line(x, PAGE_H - top0, x, PAGE_H - top1)
    c.restoreState()


def wrap_text(s: str, font: str, size: float, max_w: float):
    """Simple word wrap returning a list of lines."""
    words = (s or "").split()
    lines, cur = [], ""
    for w in words:
        trial = (cur + " " + w).strip()
        if stringWidth(trial, font, size) <= max_w or not cur:
            cur = trial
        else:
            lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def draw_letterhead(c):
    """Full-bleed company letterhead as the page background."""
    if LETTERHEAD_PATH.exists():
        c.drawImage(str(LETTERHEAD_PATH), 0, 0,
                    width=PAGE_W, height=PAGE_H,
                    preserveAspectRatio=False, mask=None)


def draw_signature_and_stamp(c, sig_x, sig_top, sig_w, sig_h,
                             stamp_x, stamp_top, stamp_size):
    """Signature first, round stamp overlapping on top (as on the originals)."""
    if SIGNATURE_PATH.exists():
        c.drawImage(str(SIGNATURE_PATH),
                    sig_x, PAGE_H - sig_top - sig_h,
                    width=sig_w, height=sig_h, mask="auto")
    if STAMP_PATH.exists():
        c.drawImage(str(STAMP_PATH),
                    stamp_x, PAGE_H - stamp_top - stamp_size,
                    width=stamp_size, height=stamp_size, mask="auto")


def fmt_amount(v: float) -> str:
    """Plain number formatting used on the official documents (no symbol)."""
    return f"{(v or 0):,.2f}"


def fmt_qty(v: float) -> str:
    return f"{(v or 0):g}"


def fmt_date(d) -> str:
    """M/D/YYYY as printed on the official documents."""
    if not d:
        return ""
    return f"{d.month}/{d.day}/{d.year}"


def currency_long(code: str) -> str:
    return CURRENCY_LONG_NAMES.get((code or "").upper(), code or "")
