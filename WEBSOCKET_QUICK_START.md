# WebSocket Quick Start Guide

## 🚀 Start All Services

### 1. Start Backend (Port 5000)
```bash
cd backend
npm run dev
```

**Look for**:
```
🔌 WebSocket service initialized
🚀 Server started successfully!
🔌 WebSocket service: Initialized
```

---

### 2. Start Python Processor
```bash
cd backend/python
python bulk_upload_processor.py
```

**Look for**:
```
✅ Configuration loaded:
   WebSocket: http://localhost:5000
📄 Processing file X: filename.xlsx
✅ Connected to WebSocket server
```

---

### 3. Start Frontend (Port 3000)
```bash
cd frontend
npm run dev
```

**Open browser console, look for**:
```
🔌 Connected to bulk upload WebSocket
```

---

## ✅ Verify WebSocket is Working

### Test Upload
1. Navigate to: **Self Data Management → Bulk File Upload**
2. Upload an Excel file
3. Watch for:
   - ✅ Real-time progress bar updates
   - ✅ Status changes (pending → processing → completed)
   - ✅ Row count updates
   - ✅ Rate limit warnings (if applicable)

---

## 🔍 Check Connection Status

### Backend
```bash
# Check if WebSocket service is running
curl http://localhost:5000/api/v1/health
```

### Frontend
Open browser console:
```javascript
// Should see WebSocket connection
// Look for: 🔌 Connected to bulk upload WebSocket
```

### Python
Check terminal output:
```
✅ Connected to WebSocket server
```

---

## 🐛 Troubleshooting

### Issue: Frontend Not Connecting

**Solution**:
```bash
# 1. Check frontend .env
cat frontend/.env | grep VITE_WS_URL
# Should show: VITE_WS_URL=http://localhost:5000

# 2. Restart frontend
cd frontend
npm run dev
```

---

### Issue: Python Not Connecting

**Solution**:
```bash
# 1. Check backend .env
cat backend/.env | grep WEBSOCKET_URL
# Should show: WEBSOCKET_URL=http://localhost:5000

# 2. Install dependencies
pip install python-socketio

# 3. Restart Python processor
cd backend/python
python bulk_upload_processor.py
```

---

### Issue: No Real-Time Updates

**Solution**:
1. ✅ Verify all 3 services are running
2. ✅ Check browser console for WebSocket connection
3. ✅ Check Python logs for connection success
4. ✅ Upload a test file and watch logs

---

## 📊 Monitor WebSocket Activity

### Backend Logs
```bash
# Watch backend logs
tail -f backend/logs/app.log
```

### Python Logs
```bash
# Python processor shows WebSocket events
# Look for: [WebSocket] Progress: ...
```

### Frontend Console
```javascript
// Open browser DevTools → Console
// Filter by: WebSocket
```

---

## 🎯 Expected Behavior

### When Upload Starts
- **Frontend**: Shows "Processing..." status
- **Python**: Logs "Processing file X"
- **Backend**: Receives WebSocket events

### During Processing
- **Frontend**: Progress bar updates every few seconds
- **Python**: Sends progress events
- **Backend**: Broadcasts to frontend

### When Complete
- **Frontend**: Shows "Completed" status, download button appears
- **Python**: Logs "✅ Processing complete"
- **Backend**: Updates database status

---

## 🔧 Configuration Files

### Frontend: `frontend/.env`
```bash
VITE_WS_URL=http://localhost:5000
```

### Backend: `backend/.env`
```bash
WEBSOCKET_ENABLED=true
WEBSOCKET_PATH=/socket.io
WEBSOCKET_URL=http://localhost:5000
```

### Python: Reads from `backend/.env`
```python
WEBSOCKET_URL = os.getenv('WEBSOCKET_URL', 'http://localhost:5000')
```

---

## ✅ Success Checklist

- [ ] Backend running on port 5000
- [ ] Backend logs show "WebSocket service: Initialized"
- [ ] Python processor running
- [ ] Python logs show "Connected to WebSocket server"
- [ ] Frontend running on port 3000
- [ ] Browser console shows "Connected to bulk upload WebSocket"
- [ ] Test upload shows real-time progress
- [ ] Upload status updates automatically
- [ ] Rate limit notifications appear (if triggered)

---

## 🎉 All Set!

If all checkboxes are ticked, WebSocket is working correctly!

**Next Steps**:
1. Test bulk upload with real data
2. Monitor rate limit handling
3. Verify Excel report generation
4. Test multi-user concurrent uploads

---

## 📚 More Information

- Full documentation: `WEBSOCKET_ENABLED.md`
- Rate limit testing: `test/rate-limit/README.md`
- IEC API integration: `IEC_RATE_LIMIT_IMPLEMENTATION.md`

