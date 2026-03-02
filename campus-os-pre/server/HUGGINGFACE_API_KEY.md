# Hugging Face API Key – Where to Get It and Where to Put It

## Where to get the API key

1. Go to **https://huggingface.co** and sign in (or create a free account).
2. Open **Settings → Access Tokens**:  
   **https://huggingface.co/settings/tokens**
3. Click **“Create new token”**.
4. Choose a name (e.g. `paryayos`) and type:
   - **Read** – enough for inference (strategic advice, image analysis).
   - **Write** – only if you need to push models.
5. Click **Create** and **copy the token**. It looks like:  
   `hf_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

## Where to put it

Put the token in the backend environment so the server can call the Hugging Face API.

### Option 1: `server/.env` (recommended)

1. Open or create the file **`server/.env`** (in the same folder as `main.py`).
2. Add a line:

   ```env
   HUGGINGFACE_API_KEY=hf_YourTokenHere
   ```

3. Replace `hf_YourTokenHere` with your actual token (no quotes needed).
4. Restart the backend (uvicorn). The app loads `.env` on startup.

### Option 2: System environment variable

- **Windows (PowerShell):**  
  `$env:HUGGINGFACE_API_KEY="hf_YourTokenHere"`
- **Linux / macOS:**  
  `export HUGGINGFACE_API_KEY=hf_YourTokenHere`

Then start the server from that same terminal.

## What uses it

- **Strategic advice** (NetZero Advisor): `/api/ai/advice`
- **Building image analysis** (Upload Picture in Digital Twin): `/api/ai/analyze-building-image`
- **KPI suggestions**: `/api/ai/kpi-suggestion`

If the key is missing or invalid, those features fall back to default or placeholder responses.

## Security

- **Do not** commit `server/.env` or paste the key into code.  
  (`.env` is usually in `.gitignore`.)
- If the key was ever shared or leaked, create a new token at  
  https://huggingface.co/settings/tokens and revoke the old one.
