# Troubleshooting Guide

## Common Issues and Solutions

### CORS Errors (500 Internal Server Error)

**Symptoms:**
```
Access to fetch at 'http://localhost:8000/...' from origin 'http://localhost:5173' 
has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present.
GET http://localhost:8000/... net::ERR_FAILED 500 (Internal Server Error)
```

**Causes:**
1. Backend server is not running
2. Database is not initialized
3. Backend is crashing before sending response

**Solutions:**

#### 1. Check if Backend is Running

```bash
# Check if backend is running on port 8000
curl http://localhost:8000/health
# Should return: {"status":"ok"}
```

If not running, start it:
```bash
cd backend
# Activate virtual environment first
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

uvicorn app.main:app --reload --port 8000
```

#### 2. Initialize Database

```bash
cd backend
python seed.py
```

This will:
- Create the database file (`offsetx.db`)
- Create all tables
- Seed initial accounts

#### 3. Check Backend Logs

Look at the terminal where `uvicorn` is running. You should see:
- Startup messages
- Request logs
- Error tracebacks

Common errors:
- `sqlite3.OperationalError: no such table` → Run `python seed.py`
- `ModuleNotFoundError` → Install dependencies: `pip install -r requirements.txt`
- `Connection refused` → Backend not running

### Vite HMR Errors (Failed to reload)

**Symptoms:**
```
[vite] Failed to reload /src/pages/Developer.tsx. 
This could be due to syntax errors or importing non-existent modules.
```

**Solutions:**

1. **Check for syntax errors:**
   ```bash
   cd frontend
   npm run build
   # This will show TypeScript/compilation errors
   ```

2. **Restart Vite dev server:**
   - Stop the server (Ctrl+C)
   - Clear cache: `npm cache clean --force`
   - Restart: `npm run dev`

3. **Check file imports:**
   - Ensure all imported files exist
   - Check for circular dependencies
   - Verify import paths are correct

### Database Connection Issues

**Symptoms:**
- 500 errors on all endpoints
- "no such table" errors in backend logs

**Solutions:**

1. **Recreate database:**
   ```bash
   cd backend
   # Delete old database (optional)
   rm offsetx.db  # or del offsetx.db on Windows
   
   # Recreate
   python seed.py
   ```

2. **Check database file location:**
   - Database should be at: `backend/offsetx.db`
   - SQLite connection string in `backend/app/db.py` should point to correct path

### React Router Warnings

**Symptoms:**
```
⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates...
```

**Solution:**
These are just deprecation warnings, not errors. They can be ignored for now, or you can add future flags to `main.tsx`:

```typescript
<BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
```

### Quick Health Check

Run these commands to verify everything is set up:

```bash
# 1. Check backend health
curl http://localhost:8000/health

# 2. Check database exists
ls backend/offsetx.db  # or dir backend\offsetx.db on Windows

# 3. Check frontend is running
curl http://localhost:5173

# 4. Check Hardhat node (if using blockchain features)
curl http://localhost:8545
```

### Still Having Issues?

1. **Check backend terminal** for error messages
2. **Check browser Network tab** for actual error responses
3. **Check browser Console** for frontend errors
4. **Verify all services are running:**
   - Backend (port 8000)
   - Frontend (port 5173)
   - Hardhat node (port 8545) - if using blockchain features
   - IPFS daemon (port 5001) - if using IPFS features

### Getting More Detailed Error Information

**Backend:**
- Check the terminal where `uvicorn` is running
- Look for Python tracebacks
- Check `backend/offsetx.db` exists and has data

**Frontend:**
- Open browser DevTools (F12)
- Check Console tab for JavaScript errors
- Check Network tab for failed API requests
- Click on failed requests to see response details











