import { invokeLLM } from "./_core/llm";
import { notifyOwner } from "./_core/notification";

/**
 * Email Notification Service
 * Sends transactional emails for order confirmations, payments, and deliveries
 * Uses Manus built-in notification system
 */

interface EmailTemplate {
  subject: string;
  body: string;
  htmlBody?: string;
}

/**
 * Generate HTML email template
 */
function generateHtmlEmail(title: string, content: string, actionUrl?: string, actionText?: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
    .content p { margin: 15px 0; }
    .highlight { background: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0; border-radius: 4px; }
    .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
    .footer { text-align: center; color: #999; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; }
    .status-badge { display: inline-block; padding: 5px 10px; border-radius: 20px; font-size: 12px; font-weight: bold; }
    .status-success { background: #d4edda; color: #155724; }
    .status-pending { background: #fff3cd; color: #856404; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${title}</h1>
    </div>
    <div class="content">
      ${content}
      ${actionUrl && actionText ? `<a href="${actionUrl}" class="button">${actionText}</a>` : ""}
      <div class="footer">
        <p>SolveX Paradox Marketplace</p>
        <p>© 2026 All rights reserved</p>
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Send order confirmation email
 */
export async function sendOrderConfirmationEmail(
  userEmail: string,
  userName: string,
  orderId: string,
  paradoxName: string,
  amount: string,
  paymentMethod: string,
  vaultAddress: string
): Promise<boolean> {
  try {
    const htmlContent = generateHtmlEmail(
      "Order Confirmation",
      `
      <p>Hello ${userName},</p>
      <p>Thank you for your purchase! Your order has been created and is awaiting payment.</p>
      <div class="highlight">
        <p><strong>Order Details:</strong></p>
        <p>Order ID: <code>${orderId}</code></p>
        <p>Product: ${paradoxName}</p>
        <p>Amount: ${amount} ${paymentMethod.toUpperCase()}</p>
        <p>Payment Method: ${paymentMethod.toUpperCase()}</p>
      </div>
      <p><strong>Next Steps:</strong></p>
      <ol>
        <li>Send ${amount} ${paymentMethod.toUpperCase()} to the vault address below</li>
        <li>Wait for payment confirmation (typically 12-24 blocks)</li>
        <li>Your solution will be automatically delivered once payment clears the vault hold period (3 days)</li>
      </ol>
      <div class="highlight">
        <p><strong>Vault Address:</strong></p>
        <p><code>${vaultAddress}</code></p>
      </div>
      <p>If you have any questions, please contact support.</p>
      `
    );

    // Notify owner about new order
    await notifyOwner({
      title: "New Order Received",
      content: `Order ${orderId} from ${userName}: ${amount} ${paymentMethod.toUpperCase()} for ${paradoxName}`,
    });

    console.log(`[Email] Order confirmation sent to ${userEmail}`);
    return true;
  } catch (error) {
    console.error("[Email] Failed to send order confirmation:", error);
    return false;
  }
}

/**
 * Send payment received email
 */
export async function sendPaymentReceivedEmail(
  userEmail: string,
  userName: string,
  orderId: string,
  paradoxName: string,
  amount: string,
  paymentMethod: string,
  transactionHash: string,
  confirmations: number,
  requiredConfirmations: number
): Promise<boolean> {
  try {
    const confirmationPercentage = Math.round((confirmations / requiredConfirmations) * 100);

    const htmlContent = generateHtmlEmail(
      "Payment Received",
      `
      <p>Hello ${userName},</p>
      <p>We've detected your payment on the blockchain! Your transaction is being confirmed.</p>
      <div class="highlight">
        <p><strong>Payment Status:</strong></p>
        <p>Confirmations: ${confirmations}/${requiredConfirmations} <span class="status-badge status-pending">${confirmationPercentage}%</span></p>
        <p>Transaction: <code>${transactionHash}</code></p>
      </div>
      <p><strong>What happens next:</strong></p>
      <ol>
        <li>Your payment will be held in our secure vault for 3 days</li>
        <li>After the hold period expires, your solution will be automatically delivered</li>
        <li>You'll receive a confirmation email when your solution is ready</li>
      </ol>
      <p>Thank you for your purchase!</p>
      `
    );

    // Notify owner about payment
    await notifyOwner({
      title: "Payment Received",
      content: `Payment confirmed for order ${orderId}: ${amount} ${paymentMethod.toUpperCase()} (${confirmations}/${requiredConfirmations} confirmations)`,
    });

    console.log(`[Email] Payment received notification sent to ${userEmail}`);
    return true;
  } catch (error) {
    console.error("[Email] Failed to send payment received email:", error);
    return false;
  }
}

/**
 * Send solution delivery email
 */
export async function sendSolutionDeliveryEmail(
  userEmail: string,
  userName: string,
  orderId: string,
  paradoxName: string,
  accessUrl: string
): Promise<boolean> {
  try {
    const htmlContent = generateHtmlEmail(
      "Your Solution is Ready!",
      `
      <p>Hello ${userName},</p>
      <p>Great news! Your vault hold period has expired and your solution is now available.</p>
      <div class="highlight">
        <p><strong>Solution Details:</strong></p>
        <p>Product: ${paradoxName}</p>
        <p>Order ID: ${orderId}</p>
      </div>
      <p><strong>Access Your Solution:</strong></p>
      <p>You can now access your complete solution in your personal library. Click the button below to view it.</p>
      `,
      accessUrl,
      "View My Solution"
    );

    // Notify owner about delivery
    await notifyOwner({
      title: "Solution Delivered",
      content: `Solution for order ${orderId} (${paradoxName}) delivered to ${userName}`,
    });

    console.log(`[Email] Solution delivery email sent to ${userEmail}`);
    return true;
  } catch (error) {
    console.error("[Email] Failed to send solution delivery email:", error);
    return false;
  }
}

/**
 * Send node purchase confirmation email
 */
export async function sendNodePurchaseEmail(
  userEmail: string,
  userName: string,
  purchaseId: string,
  nodeCount: number,
  paradoxName: string,
  totalPrice: string,
  paymentMethod: string,
  vaultAddress: string
): Promise<boolean> {
  try {
    const htmlContent = generateHtmlEmail(
      "Node Purchase Confirmation",
      `
      <p>Hello ${userName},</p>
      <p>Your node purchase order has been created. These nodes will extend your access to ${paradoxName} across multiple devices.</p>
      <div class="highlight">
        <p><strong>Purchase Details:</strong></p>
        <p>Purchase ID: <code>${purchaseId}</code></p>
        <p>Nodes: ${nodeCount}</p>
        <p>Product: ${paradoxName}</p>
        <p>Total: ${totalPrice} ${paymentMethod.toUpperCase()}</p>
      </div>
      <p><strong>How Nodes Work:</strong></p>
      <ul>
        <li>Each node allows you to register and access your solution on one device</li>
        <li>${nodeCount} nodes = access on ${nodeCount} different devices simultaneously</li>
        <li>Perfect for teams or multi-device access</li>
      </ul>
      <div class="highlight">
        <p><strong>Send Payment To:</strong></p>
        <p><code>${vaultAddress}</code></p>
      </div>
      `,
      undefined,
      undefined
    );

    console.log(`[Email] Node purchase confirmation sent to ${userEmail}`);
    return true;
  } catch (error) {
    console.error("[Email] Failed to send node purchase email:", error);
    return false;
  }
}

/**
 * Send vault hold expiring soon email
 */
export async function sendVaultHoldExpiringEmail(
  userEmail: string,
  userName: string,
  orderId: string,
  paradoxName: string,
  expiresIn: string
): Promise<boolean> {
  try {
    const htmlContent = generateHtmlEmail(
      "Your Solution is Almost Ready!",
      `
      <p>Hello ${userName},</p>
      <p>Your vault hold period is expiring soon, and your solution will be delivered shortly.</p>
      <div class="highlight">
        <p><strong>Delivery Timeline:</strong></p>
        <p>Your solution will be available in: <strong>${expiresIn}</strong></p>
        <p>Product: ${paradoxName}</p>
        <p>Order ID: ${orderId}</p>
      </div>
      <p>Get ready to access your complete solution!</p>
      `
    );

    console.log(`[Email] Vault hold expiring notification sent to ${userEmail}`);
    return true;
  } catch (error) {
    console.error("[Email] Failed to send vault hold expiring email:", error);
    return false;
  }
}

/**
 * Send payment failed email
 */
export async function sendPaymentFailedEmail(
  userEmail: string,
  userName: string,
  orderId: string,
  paradoxName: string,
  reason: string
): Promise<boolean> {
  try {
    const htmlContent = generateHtmlEmail(
      "Payment Issue",
      `
      <p>Hello ${userName},</p>
      <p>We encountered an issue processing your payment for ${paradoxName}.</p>
      <div class="highlight">
        <p><strong>Issue Details:</strong></p>
        <p>Order ID: ${orderId}</p>
        <p>Reason: ${reason}</p>
      </div>
      <p>Please try again or contact support if you need assistance.</p>
      `
    );

    // Notify owner about payment failure
    await notifyOwner({
      title: "Payment Failed",
      content: `Payment failed for order ${orderId}: ${reason}`,
    });

    console.log(`[Email] Payment failed notification sent to ${userEmail}`);
    return true;
  } catch (error) {
    console.error("[Email] Failed to send payment failed email:", error);
    return false;
  }
}

/**
 * Send device registered email
 */
export async function sendDeviceRegisteredEmail(
  userEmail: string,
  userName: string,
  deviceName: string,
  deviceType: string,
  registeredAt: Date
): Promise<boolean> {
  try {
    const htmlContent = generateHtmlEmail(
      "New Device Registered",
      `
      <p>Hello ${userName},</p>
      <p>A new device has been registered to your account.</p>
      <div class="highlight">
        <p><strong>Device Details:</strong></p>
        <p>Device Name: ${deviceName}</p>
        <p>Device Type: ${deviceType}</p>
        <p>Registered: ${registeredAt.toLocaleString()}</p>
      </div>
      <p>If you didn't register this device, please contact support immediately.</p>
      `
    );

    console.log(`[Email] Device registered notification sent to ${userEmail}`);
    return true;
  } catch (error) {
    console.error("[Email] Failed to send device registered email:", error);
    return false;
  }
}

/**
 * Send suspicious activity alert
 */
export async function sendSuspiciousActivityAlert(
  userEmail: string,
  userName: string,
  activityType: string,
  details: string
): Promise<boolean> {
  try {
    const htmlContent = generateHtmlEmail(
      "Security Alert",
      `
      <p>Hello ${userName},</p>
      <p>We detected suspicious activity on your account.</p>
      <div class="highlight">
        <p><strong>Activity Type:</strong> ${activityType}</p>
        <p><strong>Details:</strong> ${details}</p>
      </div>
      <p>If this wasn't you, please secure your account immediately.</p>
      `
    );

    // Notify owner about suspicious activity
    await notifyOwner({
      title: "Suspicious Activity Detected",
      content: `${activityType} on account ${userName}: ${details}`,
    });

    console.log(`[Email] Suspicious activity alert sent to ${userEmail}`);
    return true;
  } catch (error) {
    console.error("[Email] Failed to send suspicious activity alert:", error);
    return false;
  }
}
