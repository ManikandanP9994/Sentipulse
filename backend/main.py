# main.py
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from transformers import pipeline
import pypdf
import csv
import zipfile
import xml.etree.ElementTree as ET
import io
import json
import os
import re
import sys
import datetime

try:
    from openai import OpenAI
except ImportError:
    OpenAI = None

app = FastAPI(title="Ecommerce Sentiment Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Ecommerce Sentiment Engine API", "docs": "/docs"}

@app.get("/health")
async def health():
    return {"status": "ok"}

# Load lightweight sentiment model
classifier = pipeline("sentiment-analysis", model="distilbert-base-uncased-finetuned-sst-2-english")
ANALYSIS_BATCH_SIZE = 128
MAX_CLASSIFICATION_CHARS = 512
FAST_ANALYSIS_THRESHOLD = 1000

POSITIVE_WORDS = {
    "amazing", "awesome", "best", "excellent", "good", "great", "love", "loved",
    "perfect", "smooth", "strong", "useful", "value", "worth", "works", "happy",
}
NEGATIVE_WORDS = {
    "awful", "bad", "broken", "cheap", "complaint", "crushed", "damaged", "delay",
    "disappointed", "hate", "late", "poor", "terrible", "waste",
}

def fast_prediction(text: str) -> dict:
    words = set(re.findall(r"[a-z]+", text.lower()))
    positive_hits = len(words & POSITIVE_WORDS)
    negative_hits = len(words & NEGATIVE_WORDS)
    if positive_hits > negative_hits:
        label, hits = "positive", positive_hits
    elif negative_hits > positive_hits:
        label, hits = "negative", negative_hits
    else:
        label, hits = "neutral", 0
    confidence = min(0.99, 0.55 + (hits * 0.08)) if hits else 0.5
    return {"label": label.upper(), "score": confidence}

ASPECTS = [
    "Product Quality & Durability",
    "Packaging & Delivery",
    "Pricing & Value",
    "Sizing & Fit",
    "Customer Support",
    "General",
]

ABSA_SYSTEM_PROMPT = """You are an expert e-commerce sentiment and consumer intelligence engine.
Analyze Amazon, Flipkart, and D2C product reviews. Return strict JSON only with a top-level results array.
For every review return overall_sentiment (positive, negative, or neutral), confidence (0 to 1), summary,
aspects using only Product Quality & Durability, Packaging & Delivery, Pricing & Value, Sizing & Fit,
Customer Support, or General, slang_detected with term and meaning, and actionable_issue or null.
Detect sarcasm: a clear defect or inconvenience is negative. Each aspect must include sentiment and an exact snippet."""

def extract_text(file_bytes: bytes, filename: str) -> str:
    lower_name = filename.lower()
    if lower_name.endswith(".pdf"):
        reader = pypdf.PdfReader(io.BytesIO(file_bytes))
        pages_text = [page.extract_text() or "" for page in reader.pages]
        return "\n".join(pages_text)
    elif lower_name.endswith(".docx"):
        with zipfile.ZipFile(io.BytesIO(file_bytes)) as archive:
            document_xml = archive.read("word/document.xml")
        root = ET.fromstring(document_xml)
        namespace = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
        paragraphs = []
        for paragraph in root.iter(f"{namespace}p"):
            text = "".join(node.text or "" for node in paragraph.iter(f"{namespace}t"))
            if text:
                paragraphs.append(text)
        return "\n".join(paragraphs)
    elif lower_name.endswith(".csv"):
        csv_text = file_bytes.decode("utf-8-sig")
        try:
            csv.field_size_limit(sys.maxsize)
        except OverflowError:
            csv.field_size_limit(2**31 - 1)
        sample = csv_text[:4096]
        try:
            dialect = csv.Sniffer().sniff(sample)
        except csv.Error:
            dialect = csv.excel

        try:
            rows = list(csv.reader(io.StringIO(csv_text), dialect))
        except csv.Error as error:
            raise HTTPException(status_code=400, detail=f"Invalid CSV data: {error}") from error
        if not rows:
            return ""

        try:
            has_header = csv.Sniffer().has_header(sample)
        except csv.Error:
            has_header = False

        if has_header:
            header = [cell.strip().lower() for cell in rows[0]]
            text_columns = [
                index for index, name in enumerate(header)
                if any(keyword in name for keyword in ["review", "text", "feedback", "comment", "content"])
            ]
            rows = rows[1:]
        else:
            text_columns = []

        lines = []
        for row in rows:
            columns = text_columns or range(len(row))
            line = " ".join(row[index].strip() for index in columns if index < len(row) and row[index].strip())
            if line:
                lines.append(line)
        return "\n".join(lines)
    raise HTTPException(status_code=400, detail="Only PDF, DOCX, and CSV formats are supported.")

def categorize_topic(text: str) -> str:
    t = text.lower()
    if any(k in t for k in ["ship", "delivery", "arrived", "package", "delay"]):
        return "Shipping & Delivery"
    if any(k in t for k in ["price", "cost", "expensive", "cheap", "refund", "worth"]):
        return "Pricing & Value"
    if any(k in t for k in ["quality", "material", "broken", "built", "durable", "defect"]):
        return "Product Quality"
    if any(k in t for k in ["support", "agent", "service", "help", "chat"]):
        return "Customer Service"
    return "General Feedback"

def local_absa(text: str, prediction: dict) -> dict:
    lower_text = text.lower()
    sentiment = prediction["label"].lower()
    if any(word in lower_text for word in ["but", "however", "although"]) and any(word in lower_text for word in ["bad", "delay", "broken", "crushed", "poor"]):
        sentiment = "neutral"

    rules = [
        ("Packaging & Delivery", ["ship", "delivery", "arrived", "package", "delay", "box", "courier"]),
        ("Pricing & Value", ["price", "cost", "expensive", "cheap", "refund", "worth", "paisa vasool"]),
        ("Product Quality & Durability", ["quality", "sound", "material", "broken", "built", "durable", "defect", "battery"]),
        ("Sizing & Fit", ["size", "sizing", "fit", "tight", "loose", "small", "large"]),
        ("Customer Support", ["support", "agent", "service", "help", "chat", "response"]),
    ]
    aspects = [
        {"aspect": aspect, "sentiment": sentiment, "snippet": text}
        for aspect, keywords in rules
        if any(keyword in lower_text for keyword in keywords)
    ] or [{"aspect": "General", "sentiment": sentiment, "snippet": text}]

    meanings = {
        "paisa vasool": "Worth the money / great value",
        "bekaar": "Bad or useless",
        "mast": "Excellent or fun",
        "ghatiya": "Poor quality or terrible",
    }
    slang_detected = [{"term": term, "meaning": meaning} for term, meaning in meanings.items() if term in lower_text]
    actionable_issue = None
    if any(word in lower_text for word in ["delay", "late", "crushed", "damaged", "broken"]):
        actionable_issue = "Investigate the delivery or packaging issue described by the buyer."
    elif sentiment == "negative":
        actionable_issue = "Review the negative feedback for a product or service improvement."

    return {
        "overall_sentiment": sentiment,
        "confidence": round(float(prediction["score"]), 3),
        "summary": text[:180],
        "aspects": aspects,
        "slang_detected": slang_detected,
        "actionable_issue": actionable_issue,
    }

def llm_absa(reviews: list[str]) -> list[dict] | None:
    if not os.getenv("OPENAI_API_KEY") or OpenAI is None:
        return None
    client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])
    results = []
    for start in range(0, len(reviews), 10):
        batch = reviews[start:start + 10]
        response = client.chat.completions.create(
            model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": ABSA_SYSTEM_PROMPT},
                {"role": "user", "content": "Analyze these reviews in order:\n" + json.dumps(batch, ensure_ascii=False)},
            ],
        )
        payload = json.loads(response.choices[0].message.content)
        batch_results = payload.get("results")
        if not isinstance(batch_results, list) or len(batch_results) != len(batch):
            return None
        results.extend(batch_results)
    return results

@app.post("/api/analyze")
async def analyze_file(file: UploadFile = File(...)):
    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Empty file uploaded.")

    raw_text = extract_text(contents, file.filename)

    # Split text by line breaks or period punctuation
    raw_snippets = re.split(r'[\r\n]+|(?<=[.!?])\s+', raw_text)
    reviews = [r.strip() for r in raw_snippets if len(r.strip()) > 15]

    if not reviews:
        raise HTTPException(status_code=422, detail="No readable text snippets found in document.")

    # Process every extracted review in larger batches so large files are not truncated.
    # The classifier only needs the beginning of a review and local ABSA still uses the full text.
    if len(reviews) >= FAST_ANALYSIS_THRESHOLD:
        predictions = [fast_prediction(review) for review in reviews]
    else:
        classification_texts = [review[:MAX_CLASSIFICATION_CHARS] for review in reviews]
        predictions = []
        for start in range(0, len(classification_texts), ANALYSIS_BATCH_SIZE):
            predictions.extend(
                classifier(
                    classification_texts[start:start + ANALYSIS_BATCH_SIZE],
                    batch_size=ANALYSIS_BATCH_SIZE,
                    truncation=True,
                    max_length=128,
                )
            )
    llm_results = llm_absa(reviews) if os.getenv("ENABLE_LLM_ANALYSIS", "false").lower() == "true" else None

    positive_count, negative_count, neutral_count = 0, 0, 0
    records = []
    category_counts = {
        "Product Quality": 0,
        "Shipping & Delivery": 0,
        "Pricing & Value": 0,
        "Customer Service": 0,
        "General Feedback": 0
    }
    aspect_counts = {aspect: 0 for aspect in ASPECTS}

    for idx, (text, pred) in enumerate(zip(reviews, predictions), start=1):
        enriched = llm_results[idx - 1] if llm_results else local_absa(text, pred)
        label = enriched["overall_sentiment"]
        confidence = round(float(enriched["confidence"]) * 100, 1)
        category = categorize_topic(text)
        category_counts[category] += 1
        for aspect in enriched.get("aspects", []):
            if aspect.get("aspect") in aspect_counts:
                aspect_counts[aspect["aspect"]] += 1

        if label == "positive":
            positive_count += 1
        elif label == "negative":
            negative_count += 1
        else:
            neutral_count += 1

        records.append({
            "id": f"#RV-{idx:04d}",
            "text": text,
            "sentiment": label,
            "confidence": confidence,
            "category": category,
            "date": datetime.date.today().strftime("%m/%d/%y"),
            "summary": enriched.get("summary", text),
            "aspects": enriched.get("aspects", []),
            "slang_detected": enriched.get("slang_detected", []),
            "actionable_issue": enriched.get("actionable_issue")
        })

    total = len(records)

    return {
        "filename": file.filename,
        "summary": {
            "total_reviews": total,
            "positive_count": positive_count,
            "negative_count": negative_count,
            "positive_rate": round((positive_count / total) * 100, 1) if total else 0,
            "negative_rate": round((negative_count / total) * 100, 1) if total else 0,
            "neutral_count": neutral_count,
            "neutral_rate": round((neutral_count / total) * 100, 1) if total else 0,
        },
        "categories": [
            {"name": k, "count": v} for k, v in category_counts.items()
        ],
        "aspects": [
            {"name": k, "count": v} for k, v in aspect_counts.items()
        ],
        "records": records
    }