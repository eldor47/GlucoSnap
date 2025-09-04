# Android Network Troubleshooting Guide

## 🚨 **Common "Network Request Failed" Fixes**

### **1. Clear Text Traffic (Most Common Fix)**
Android 9+ blocks HTTP traffic by default. Add this to your Android manifest:

```xml
<!-- In apps/glucosnap/android/app/src/main/AndroidManifest.xml -->
<application 
  android:usesCleartextTraffic="true"
  android:networkSecurityConfig="@xml/network_security_config"
  ... other attributes>
  
  <!-- Your existing content -->
</application>
```

### **2. Create Network Security Config**
Create `apps/glucosnap/android/app/src/main/res/xml/network_security_config.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <domain-config cleartextTrafficPermitted="true">
        <domain includeSubdomains="true">localhost</domain>
        <domain includeSubdomains="true">10.0.2.2</domain>
        <domain includeSubdomains="true">10.0.3.2</domain>
        <domain includeSubdomains="true">metro.googleapis.com</domain>
    </domain-config>
    <base-config cleartextTrafficPermitted="true">
        <trust-anchors>
            <certificates src="system"/>
        </trust-anchors>
    </base-config>
</network-security-config>
```

### **3. Metro Configuration**
Update `apps/glucosnap/metro.config.js`:

```javascript
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add this for Android network debugging
config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => {
    return (req, res, next) => {
      // Add CORS headers for Android
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      
      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }
      
      return middleware(req, res, next);
    };
  },
};

module.exports = config;
```

### **4. Android Emulator Networking**
For Android Emulator, use these IPs instead of localhost:
- `10.0.2.2` - Host machine from Android Emulator
- `10.0.3.2` - Host machine from Genymotion

### **5. Production API Configuration**
Make sure you're using HTTPS for production API calls. Update your config:

```typescript
// In apps/glucosnap/app.config.js
export default {
  expo: {
    extra: {
      apiBaseUrl: __DEV__ 
        ? 'http://10.0.2.2:3000/' // Local development 
        : 'https://08o8wsyz88.execute-api.us-east-1.amazonaws.com/prod/', // Production
    }
  }
};
```

## 🔧 **Debugging Steps**

### **Step 1: Add Debug Component**
Add the NetworkDebug component to your app temporarily:

```typescript
// In your main app file or a test screen
import { NetworkDebug } from './src/components/NetworkDebug';

// Add this component to test connectivity
<NetworkDebug />
```

### **Step 2: Check Android Logs**
Run with logs to see detailed error information:

```bash
npx expo run:android --clear
```

Look for network-related errors in the logs.

### **Step 3: Test with Physical Device**
Sometimes emulator has network issues that don't occur on real devices:

```bash
# Run on physical Android device
npx expo run:android --device
```

### **Step 4: Verify API Endpoint**
Test your API endpoint directly:

```bash
curl -X POST https://08o8wsyz88.execute-api.us-east-1.amazonaws.com/prod/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!","username":"testuser"}'
```

## 🚨 **Emergency Fallback**
If nothing works, temporarily use an HTTP proxy or ngrok tunnel:

```bash
# Install ngrok
npm install -g ngrok

# Create tunnel to your API
ngrok http https://08o8wsyz88.execute-api.us-east-1.amazonaws.com/prod
```

Then use the ngrok URL in your app configuration.

---

**Try these solutions in order and run the NetworkDebug component to identify which step fixes your issue!**











