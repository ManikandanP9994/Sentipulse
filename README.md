---
title: Ecommerce Sentiment API
emoji: 🚀
colorFrom: blue
colorTo: indigo
sdk: docker
app_port: 7860
pinned: false
---

# Ecommerce Sentiment Analysis Engine

Sentipulse is a full-stack ecommerce sentiment analysis application. It accepts customer feedback documents, extracts review text, classifies sentiment, and presents the results in a dashboard with summary metrics and review-level confidence scores.

## Features

- Upload PDF and DOCX customer feedback files
- Extract review text through the FastAPI backend
- Classify reviews as positive or negative with transformer-based sentiment analysis
- View total reviews, sentiment counts, sentiment rates, and confidence scores
- Browse extracted review samples in the React dashboard
- Run the frontend locally with Vite

## Project Structure

```text
backend/     FastAPI API and sentiment analysis service
frontend/    React, TypeScript, Tailwind CSS, and Vite dashboard
```

## Backend Setup

From the project root, create and activate a Python virtual environment, then install the dependencies:

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

The API is available at `http://localhost:8000`.

## Frontend Setup

In a second terminal, run:

```powershell
cd frontend
npm install
npm run dev
```

The dashboard is available at `http://localhost:5173`.

You can also start the frontend from the project root:

```powershell
npm --prefix .\frontend run dev -- --host 0.0.0.0
```

## API

### `POST /api/analyze`

Upload a PDF or DOCX file using the `file` form field. The response contains a summary and the extracted review records:

```json
{
	"summary": {
		"total_reviews": 10,
		"positive_count": 7,
		"negative_count": 3,
		"positive_rate": 70,
		"negative_rate": 30
	},
	"records": []
}
```

## Production Build

Create a production frontend build with:

```powershell
cd frontend
npm run build
```
