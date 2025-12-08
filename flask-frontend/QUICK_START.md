# Quick Start Guide - Flask Application with Session Fix

## ✅ Flask-Session Installed Successfully!

The required module has been installed. Now you need to restart your Flask application.

---

## 🚀 How to Start the Flask Application

### Option 1: Using the Terminal (Recommended)

1. **Open a new terminal/command prompt**

2. **Navigate to the flask-frontend directory:**
   ```bash
   cd C:\Development\NewProj\Membership-new\flask-frontend
   ```

3. **Run the Flask application:**
   ```bash
   python app.py
   ```

4. **You should see output like:**
   ```
   * Serving Flask app 'app'
   * Debug mode: on
   * Running on http://127.0.0.1:3001
   * Running on http://10.0.0.173:3001
   Press CTRL+C to quit
   ```

### Option 2: Using the Batch File (Windows)

1. **Navigate to the flask-frontend directory in File Explorer**

2. **Double-click `run.bat`**

---

## ✅ Verify the Fix

### 1. Check for Session Directory

After starting the app, verify that the `flask_session/` directory was created:

```bash
dir flask-frontend\flask_session
```

You should see the directory exists (it may be empty initially).

### 2. Test the Application

1. **Open your browser** and go to: http://localhost:3001

2. **Start a new application:**
   - Click "Start Application"
   - Fill in all 5 steps:
     * Step 1: Personal Information
     * Step 2: Contact Information  
     * Step 3: Party Declaration
     * Step 4: Payment Information
     * Step 5: Review & Submit

3. **Submit the application:**
   - Click "Submit Application" on the review page
   - ✅ Should redirect to success page
   - ✅ No 400 error!

### 3. Check the Console Output

In the Flask terminal, you should **NOT** see:
- ❌ "The 'session' cookie is too large" warning
- ❌ "POST /application/review HTTP/1.1" 400

You **SHOULD** see:
- ✅ "POST /application/review HTTP/1.1" 302 (redirect)
- ✅ Application submitted successfully

---

## 🔧 Troubleshooting

### Issue: "ModuleNotFoundError: No module named 'flask_session'"

**Solution:** The module should already be installed, but if you see this error:
```bash
pip install Flask-Session==0.5.0
```

### Issue: "Address already in use" or "Port 3001 is already in use"

**Solution:** Another Flask instance is running. Find and stop it:

**Windows:**
```bash
# Find the process using port 3001
netstat -ano | findstr :3001

# Kill the process (replace PID with the actual process ID)
taskkill /PID <PID> /F
```

**Linux/Mac:**
```bash
# Find and kill the process
lsof -ti:3001 | xargs kill -9
```

### Issue: Flask app starts but shows errors

**Solution:** Check the console output for specific error messages and ensure:
- Backend API is running on http://localhost:5000
- All dependencies are installed: `pip install -r requirements.txt`

---

## 📝 What Was Fixed

### Before (Problem)
```
Session cookie: 8944 bytes (TOO LARGE!)
Browser limit: 4093 bytes
Result: Session data lost → 400 error
```

### After (Solution)
```
Session cookie: ~100 bytes (session ID only)
Session data: Stored on server in flask_session/
Result: No size limit → submission works!
```

---

## 🎯 Summary

1. ✅ **Flask-Session installed** - Module is ready
2. ✅ **Code updated** - Server-side session storage configured
3. ✅ **Session directory** - Will be created automatically
4. 🚀 **Ready to start** - Just run `python app.py`

---

## 📚 Additional Documentation

For more details, see:
- `SESSION_FIX_README.md` - Complete technical documentation
- `requirements.txt` - All required dependencies

---

## ⚡ Quick Commands

```bash
# Navigate to flask-frontend
cd C:\Development\NewProj\Membership-new\flask-frontend

# Install dependencies (if needed)
pip install -r requirements.txt

# Start the Flask app
python app.py

# In another terminal, test the API
curl http://localhost:3001
```

---

**You're all set! Start the Flask application and test the membership form.** 🎉

