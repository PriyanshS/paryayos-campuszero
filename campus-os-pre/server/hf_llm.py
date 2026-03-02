"""
Hugging Face LLM integration for ParyayOS.
Uses small quantized models (e.g. TinyLlama, Phi-2) via Inference API for low latency.
Set HUGGINGFACE_API_KEY in env for API; for fully local, use a local inference server URL.
"""
import os
import json
import requests

# Small models suitable for local/low-latency: TinyLlama, Phi-2, or similar
HF_MODEL = os.environ.get("HF_MODEL", "TinyLlama/TinyLlama-1.1B-Chat-v1.0")
HF_API_URL = os.environ.get("HF_INFERENCE_URL") or f"https://api-inference.huggingface.co/models/{HF_MODEL}"
API_KEY = os.environ.get("HUGGINGFACE_API_KEY", "")


def _headers():
    return {"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"}


def get_strategic_advice(topic: str, context: str = "") -> str:
    """Get human-readable strategic energy/water/waste advice from a small LLM."""
    if not API_KEY:
        return (
            "Strategic advice is powered by a local Hugging Face model. "
            "Set HUGGINGFACE_API_KEY in your environment to enable live recommendations. "
            "Meanwhile: focus on measurement first, then baseline and gap analysis, then simulation and implementation."
        )
    prompt = f"""You are a sustainability advisor for a campus. Topic: {topic}. {context}
Give one short paragraph of practical strategic advice (2-4 sentences). Be specific and actionable. No bullet lists."""
    try:
        payload = {"inputs": prompt, "parameters": {"max_new_tokens": 150, "temperature": 0.4}}
        r = requests.post(HF_API_URL, headers=_headers(), json=payload, timeout=30)
        if r.status_code != 200:
            return f"Advice unavailable (API {r.status_code}). Check HUGGINGFACE_API_KEY and model availability."
        data = r.json()
        if isinstance(data, list) and len(data) > 0 and "generated_text" in data[0]:
            return data[0]["generated_text"].strip()
        if isinstance(data, dict) and "generated_text" in data:
            return data["generated_text"].strip()
        return str(data)[:500]
    except Exception as e:
        return f"Advice temporarily unavailable: {str(e)}"


def get_kpi_suggestion(metric_name: str, current_value: float, unit: str) -> dict:
    """Get a suggested KPI value and rationale from the model (for map/graph predictions)."""
    if not API_KEY:
        return {"suggested_value": current_value, "rationale": "Using sensor value (HF not configured)."}
    prompt = f"""Campus metric: {metric_name}. Current value: {current_value} {unit}.
Output only a JSON object with keys "suggested_value" (number) and "rationale" (one short sentence). No other text."""
    try:
        payload = {"inputs": prompt, "parameters": {"max_new_tokens": 80, "temperature": 0.2}}
        r = requests.post(HF_API_URL, headers=_headers(), json=payload, timeout=20)
        if r.status_code != 200:
            return {"suggested_value": current_value, "rationale": "Model unavailable."}
        data = r.json()
        text = ""
        if isinstance(data, list) and len(data) > 0 and "generated_text" in data[0]:
            text = data[0]["generated_text"].strip()
        elif isinstance(data, dict) and "generated_text" in data:
            text = data["generated_text"].strip()
        # Try to parse JSON from the response
        try:
            # Find first { ... } in text
            start = text.find("{")
            if start >= 0:
                end = text.rfind("}") + 1
                if end > start:
                    return json.loads(text[start:end])
        except json.JSONDecodeError:
            pass
        return {"suggested_value": current_value, "rationale": text[:200] or "No rationale."}
    except Exception as e:
        return {"suggested_value": current_value, "rationale": str(e)[:100]}


# Vision model for building image analysis (shape/height)
HF_VISION_URL = os.environ.get("HF_VISION_URL") or "https://api-inference.huggingface.co/models/Salesforce/blip2-opt-2.7b"


def analyze_building_image(image_base64: str) -> dict:
    """Use HF vision model to infer building shape and height from an image. Returns width, depth, height in meters."""
    import re
    if not API_KEY:
        return {"width": 20, "depth": 15, "height": 10, "shape": "rectangular"}
    try:
        # Strip data URL prefix if present (e.g. data:image/jpeg;base64,)
        if "," in image_base64:
            image_base64 = image_base64.split(",", 1)[1]
        # HF image-to-text: image as base64, inputs as prompt
        payload = {
            "inputs": "Describe this building. What is its approximate height in meters? What shape is it: rectangular, square, or L-shaped?",
            "parameters": {"max_new_tokens": 80},
        }
        # Some HF endpoints expect image in "image" key
        headers = {"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"}
        r = requests.post(HF_VISION_URL, headers=headers, json={**payload, "image": image_base64}, timeout=60)
        if r.status_code != 200:
            r2 = requests.post(HF_VISION_URL, headers=headers, json={"inputs": image_base64}, timeout=60)
            if r2.status_code != 200:
                return {"width": 20, "depth": 15, "height": 10, "shape": "rectangular"}
            r = r2
        if r.status_code != 200:
            return {"width": 20, "depth": 15, "height": 10, "shape": "rectangular"}
        data = r.json()
        text = ""
        if isinstance(data, list) and len(data) > 0:
            if isinstance(data[0], dict) and "generated_text" in data[0]:
                text = data[0]["generated_text"]
            else:
                text = str(data[0])
        elif isinstance(data, dict) and "generated_text" in data:
            text = data["generated_text"]
        else:
            text = str(data)
        text = (text or "").lower()
        # Parse height: look for number followed by m, meters, or "height"
        height = 10
        for m in re.finditer(r"height\s*[=:]?\s*(\d+(?:\.\d+)?)\s*(?:m|meters?)?|(\d+(?:\.\d+)?)\s*m(?:eters?)?\s*(?:tall|high|height)?", text):
            g = m.group(1) or m.group(2)
            if g:
                h = float(g)
                if 1 <= h <= 200:
                    height = h
                    break
        if height == 10 and re.search(r"\d+", text):
            for m in re.finditer(r"\b(\d{1,2}(?:\.\d+)?)\b", text):
                h = float(m.group(1))
                if 3 <= h <= 100:
                    height = h
                    break
        shape = "rectangular"
        if "l-shaped" in text or "l shaped" in text:
            shape = "l-shaped"
        elif "square" in text:
            shape = "square"
        width = 25 if shape == "rectangular" else 20
        depth = 18 if shape == "rectangular" else 20
        if shape == "square":
            width = depth = 20
        return {"width": width, "depth": depth, "height": height, "shape": shape}
    except Exception:
        return {"width": 20, "depth": 15, "height": 10, "shape": "rectangular"}
