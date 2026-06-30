import express from "express";
import { otpService } from "../services/otpService";

const router = express.Router();

// OTP Request endpoint
router.post("/otp/request", async (req, res) => {
  try {
    const { phoneNumber, fullName, isRegistration } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];

    if (!phoneNumber) {
      return res.status(400).json({ error: "Phone number is required" });
    }

    // Basic phone number validation
    const phoneRegex = /^\+?[0-9]{9,15}$/;
    if (!phoneRegex.test(phoneNumber)) {
      return res.status(400).json({ error: "Invalid phone number format" });
    }

    const result = await otpService.requestOtp({
      phoneNumber,
      ipAddress,
      userAgent,
      fullName,
      isRegistration
    });

    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        telegramChatId: result.telegramChatId
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.message
      });
    }
  } catch (error) {
    console.error("Error requesting OTP:", error);
    res.status(500).json({ error: "Failed to request OTP" });
  }
});

// OTP Verification endpoint
router.post("/otp/verify", async (req, res) => {
  try {
    const { phoneNumber, otpCode, fullName, isRegistration } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];

    if (!phoneNumber || !otpCode) {
      return res.status(400).json({ error: "Phone number and OTP code are required" });
    }

    const result = await otpService.verifyOtp({
      phoneNumber,
      otpCode,
      ipAddress,
      userAgent,
      fullName,
      isRegistration
    });

    if (result.success) {
      // Generate a simple token for the session
      const token = Buffer.from(`${phoneNumber}:${Date.now()}`).toString('base64');
      
      res.json({
        success: true,
        message: result.message,
        token,
        userId: result.userId ? result.userId.toString() : null,
        telegramChatId: result.telegramChatId
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.message
      });
    }
  } catch (error) {
    console.error("Error verifying OTP:", error);
    res.status(500).json({ error: "Failed to verify OTP" });
  }
});

export default router;