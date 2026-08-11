# 🍔 Foodelo Admin Panel: The Complete Master Operations Manual

Welcome to the official **Foodelo Admin Operations Manual**. This document is designed to be the "source of truth" for managing your food delivery ecosystem. Whether you are onboarding your first restaurant or managing a fleet of 5,000 riders, this guide covers every button, setting, and workflow in the platform.

---

## 📖 1. Introduction & Core Concept

### 1.1 What is Foodelo?
Foodelo is a hyper-local food delivery marketplace that connects three distinct parties:
1.  **Customers:** Who browse and order food.
2.  **Restaurants:** Who prepare the meals.
3.  **Delivery Partners:** Who bridge the gap between the kitchen and the doorstep.

### 1.2 The Power of the Admin Panel
The Admin Panel is the "Brain" of the operation. It is a real-time command center where you can monitor logistics, settle finances, and manage marketing campaigns.

### 1.3 Main Capabilities
*   **Logistics Control:** Real-time GPS tracking of every active delivery.
*   **Financial Settlement:** Automated calculation of commissions, taxes, and payouts.
*   **Content Management:** Full control over menus, banners, and categories.
*   **Crisis Management:** Tools to intervene when an order goes wrong.

---

## 🔐 2. Login & Security Protocols

Your admin account is the most sensitive part of the system. Unauthorized access could lead to financial loss or data breaches.

### 2.1 The Login Process
1.  Navigate to your custom admin URL.
2.  Enter your **Administrator Email**.
3.  Enter your **Password**.
4.  Click **"Sign In"**.

### 2.2 Security Best Practices
> [!IMPORTANT]
> **Password Policy:** We enforce a minimum 12-character password including at least one symbol (!@#$), one number, and one uppercase letter.

*   **Two-Factor Authentication (2FA):** If enabled in settings, you will be prompted for an OTP (One-Time Password) sent to your registered mobile/email.
*   **Session Management:** The system automatically terminates sessions after 60 minutes of inactivity to prevent unauthorized access from abandoned computers.
*   **IP Whitelisting:** For high-security environments, you can restrict admin access to specific Office IP addresses.

### 2.3 Forgot Password
If you forget your password:
1. Click **"Forgot Password?"** on the login screen.
2. Enter your email.
3. Check your inbox for a secure reset link.
4. The link expires in **15 minutes** for security reasons.

---

## 📊 3. Dashboard Analytics: Reading Your Data

The dashboard is the first thing you see. It tells you exactly how your business is performing *right now*.

![Dashboard Overview](./screenshots/dashboard_1.png)

![Dashboard Metrics & Graphs](./screenshots/dashboard_2.png)

### 3.1 Real-Time Analytics Cards
*   **Total Orders:** Every order placed since the platform launched.
*   **Net Revenue:** The total value of food sold minus cancelled orders.
*   **Admin Commission:** Your actual earnings (your "cut" from every order).
*   **Active Riders:** How many riders are currently "Online."
*   **Live Orders:** The count of orders currently in the "New," "Preparing," or "Out for Delivery" status.

### 3.2 Graphical Trends
*   **Hourly Sales Graph:** Shows when your platform is busiest (e.g., Dinner peak).
*   **Top 5 Best Selling Restaurants:** Displays who is driving the most volume.
*   **Customer Growth:** A line chart showing new user registrations over time.

### 3.3 Filters & Date Ranges
You can toggle the entire dashboard to show data for:
*   Today
*   Yesterday
*   Last 7 Days
*   Custom Date Range (Useful for monthly accounting)

---

## 👥 4. User Management: Moderating the Community

### 4.1 The User List
Every customer registered on Foodelo is listed here. You can search by Name, Phone, or Email.

### 4.2 User Deep-Dive
Clicking on a user's name reveals their **Profile Page**:
*   **Order History:** A complete list of every order, including items bought and total spent.
*   **Wallet Balance:** The amount of "Foodelo Credits" they have (often from refunds).
*   **Saved Addresses:** Every location they have saved (Home, Work, Gym).
*   **Refund Logs:** Track how many times this user has complained or asked for money back.

### 4.3 Blocking & Moderation
> [!WARNING]
> **Suspicious Activity:** If a user places 3+ COD orders and cancels them at the door, the system will flag them. You should manually **Block** such users to prevent further loss.

*   **Block Status:** Prevents the user from logging in or placing orders.
*   **Internal Notes:** Admin can leave notes like "Suspicious user - reported by 2 riders."

---

## 🍴 5. Restaurant Management: Vendor Operations

### 5.1 Onboarding a New Restaurant
This is a multi-step process. Accuracy is critical for tax and legal reasons.

#### Step 1: Basic Information
*   **Store Name:** How it appears to customers.
*   **Primary Contact:** The owner's phone number.
*   **Address:** Physical location for GPS targeting.

#### Step 2: Legal & Financials
*   **GST/Tax ID:** Required for invoicing.
*   **FSSAI License:** Mandatory for food safety compliance.
*   **Commission Percentage:** Your platform fee (e.g., 20%).

#### Step 3: Operational Settings
*   **Preparation Time:** How long it takes them to cook on average (15m, 30m).
*   **Timings:** Set opening/closing hours. You can even set "Break Times" (e.g., closed between 4 PM and 6 PM).

### 5.2 Approving/Rejecting
When a restaurant applies via the app, they appear in the "Pending" list. You must verify their documents before clicking **"Approve."**

---

## 🛵 6. Delivery Partner (Rider) Management

Our platform uses a unique **"Rider-First" Dispatch Flow** to ensure the fastest delivery.

### 6.1 The Workflow Logic
1. **Customer Places Order:** The system immediately identifies the order details.
2. **System Finds Nearest Rider:** The request is broadcasted to riders within a 3-5km radius.
3. **Rider Receives Notification:** Riders see the estimated earning and distance.
4. **Rider Accepts:** The first rider to accept is assigned.
5. **Restaurant Receives Request:** ONLY after a rider is secured, the restaurant is asked to "Accept & Prepare."
6. **Food Preparation:** The rider heads to the restaurant while the food is being cooked.

### 6.2 Rider Verification (KYC)
Before a rider can work, you must verify:
*   **Government ID:** Aadhaar, SSN, or National ID.
*   **Driving License:** Check the expiry date!
*   **Vehicle RC:** Ensure they have a valid vehicle.

### 6.3 Performance Metrics
*   **Acceptance Rate:** How many requests did they ignore? (High rejection = potential suspension).
*   **Rating:** Average stars given by customers.
*   **Total Earnings:** A summary of their daily and weekly payouts.

### 6.4 Delivery Zones & Payouts
You can divide your city into **Zones**. Riders assigned to "Zone A" will get priority for orders originating in that area.

---

## 📦 7. Order Management: The Lifecycle

### 7.1 Order Statuses Explained
| Status | Meaning | Admin Action Needed? |
| :--- | :--- | :--- |
| **Pending** | User placed order; searching for Rider. | Only if no rider accepts for 5 mins. |
| **Accepted** | Rider is moving to the restaurant. | No. |
| **Preparing** | Restaurant has started cooking. | No. |
| **Picked Up** | Rider has the food and is en route. | No. |
| **Delivered** | Order complete. | No. |
| **Cancelled** | Order failed. | **Yes.** Investigate the reason. |

### 7.2 Manual Interventions
*   **Reassign Rider:** Use this if a rider’s vehicle breaks down or they go offline unexpectedly.
*   **Force Cancel:** If the restaurant is closed but left their app on, cancel and refund the user instantly.

---

## 🍕 8. Menu & Category Management

### 8.1 Structuring the Menu
*   **Categories:** Veg, Non-Veg, Chinese, Italian.
*   **Sub-Categories:** Appetizers, Main Course, Drinks.

### 8.2 Add-ons & Variants (Customization)
*   **Variants:** Size (Small vs Large), Base (Thin Crust vs Thick).
*   **Add-ons:** Extra Cheese, Coke, Dip.
*   **Multi-Select:** Allow users to pick "Any 3 Toppings."

### 8.3 Professional Image Standards
> [!TIP]
> **The 80% Rule:** Dishes with high-quality photos have an 80% higher conversion rate. Encourage restaurants to use professional photography.

---

## 🎡 9. Banner & Advertisement Management

### 9.1 Banner Types
1.  **Main Slider:** Large banners at the top for major brand promotions.
2.  **Square Banners:** Placed between restaurant listings for "Deal of the Day."
3.  **Popup Banners:** Appears once when the user opens the app (Use sparingly!).

### 9.2 Ad Scheduling
You can schedule a banner to start at **12:00 AM on Saturday** and end at **11:59 PM on Sunday**. This is perfect for weekend-only deals.

---

## 🎟️ 10. Coupon & Offer Management

### 10.1 Creating "First Order" Offers
Set the "Usage Limit" to **1** and toggle the "First Order Only" switch. This is the best way to gain new customers.

### 10.2 Flat vs Percentage Discounts
*   **Percentage:** "Get 20% OFF up to $5." (Best for small orders).
*   **Flat:** "Get $10 OFF on orders above $50." (Best for large orders).

---

## 💰 11. Wallet & Payment Management

### 11.1 Payment Gateways
The admin panel integrates with Stripe, Razorpay, or PayPal.
*   **Live Mode:** For real transactions.
*   **Sandbox Mode:** For testing.

### 11.2 Refund Management
When an order is cancelled, you can refund money to:
1.  **Original Source:** Back to their Credit Card (Takes 5-7 days).
2.  **Foodelo Wallet:** Instant credit (Encourages the user to order again!).

---

## 📈 12. Commission & Delivery Charge Logic

### 12.1 Revenue Structure
Your profit is calculated as:
`Profit = (Order Value * Commission %) + Delivery Fee - (Rider Payout)`

### 12.2 Distance-Based Payouts (Example)
| Distance | User Charge | Rider Payout | Admin Share |
| :--- | :--- | :--- | :--- |
| 0 - 3 KM | $2.00 | $1.50 | $0.50 |
| 3 - 6 KM | $4.00 | $3.20 | $0.80 |
| 6+ KM | $6.00 | $5.00 | $1.00 |

---

## ⚙️ 13. Settings Panel: The Core Config

### 13.1 App Configuration
*   **Currency Symbol:** $, ₹, £, etc.
*   **Support Email/Phone:** Where customer "Contact Us" messages are sent.
*   **Timezone:** Crucial for accurate order timestamps.

### 13.2 Delivery Radius
Set the maximum distance a restaurant can deliver. (Standard is **7 KM** to ensure food stays hot).

---

## 🎧 14. Customer Support & Dispute Resolution

### 14.1 The Ticket System
When a user clicks "Help" in the app, a ticket is created here.
*   **Priority:** High (Cold food), Medium (Missing item), Low (Feedback).
*   **Resolution:** Marking a ticket "Resolved" notifies the user.

### 14.2 Common Dispute Scenarios
*   **Missing Item:** Refund the value of that specific item only.
*   **Spilled Food:** Full refund or "Re-order" at platform cost.

---

## 📍 15. Live Tracking System

The **Live Map** uses Google Maps / Mapbox API to show:
*   🟢 **Green Dots:** Online & Idle Riders.
*   🟡 **Yellow Dots:** Riders at a Restaurant.
*   🔴 **Red Dots:** Riders on a Delivery.

> [!IMPORTANT]
> If a rider's dot hasn't moved for **10 minutes** while "Out for Delivery," the system will flag it as a "Possible Delay." You should call the rider to check for issues.

---

## 🛡️ 16. Emergency & Issue Handling

### 16.1 Handling a "Stuck" Order
If a rider is assigned but doesn't move:
1.  Call the rider.
2.  If no answer, click **"Unassign Rider."**
3.  The system will automatically broadcast to other riders.

### 16.2 Fraud Detection
The system monitors **Device IDs**. If one phone creates 10 different accounts to use "First Order" coupons, the admin panel will automatically block that device.

---

## 💾 17. Backup & Data Management
Data is the lifeblood of your business. Ensure you never lose a single transaction record.

### 17.1 Automated Backups
The system performs a full database backup every 24 hours at 3:00 AM (Server Time).

### 17.2 Manual Export
You can manually export the following at any time:
*   **User---

## 🧭 22. Sidebar Navigation Guide: Total Control Center

The sidebar is your primary tool for navigating the Foodelo platform. Each section is designed to handle a specific part of your business operations. Below is a detailed breakdown of every single menu item.

### 📊 22.1 Main Controls
*   **Dashboard:** 
    *   **Purpose:** Real-time data visualization.
    *   **How to use:** Check this hourly to monitor sales spikes or high cancellation rates.
    *   **Helpful for Admin:** Identify peak hours and top-performing restaurants instantly.
*   **Point of Sale (POS):** 
    *   **Purpose:** Manually place orders for customers who call or walk in.
    *   **How to use:** Select a customer, pick food items, and process the payment manually.
    *   **Helpful for Admin:** Bridges the gap between offline and online sales.

---

### 🥗 22.2 Food Management
*   **Food Approval:**
    *   **Purpose:** Verify new dishes added by restaurants.
    *   **How to use:** Check images, descriptions, and prices before making them "Live."
    *   **Helpful for Admin:** Ensures menu quality and prevents inappropriate content.

![Food Approval Interface](./screenshots/food_approval.png)

*   **Restaurant Foods List:**
    *   **Purpose:** View and edit every single dish on the platform.
    *   **How to use:** Toggle availability or adjust prices if a restaurant requests it.
*   **Restaurant Addons List:**
    *   **Purpose:** Manage extras like "Extra Cheese" or "Coke."
    *   **How to use:** Standardize addon names and prices across categories.
*   **Categories:**
    *   **Purpose:** Organize food (e.g., Chinese, Italian).
    *   **How to use:** Create high-level categories to help users find food faster.

![Category Management](./screenshots/categories.png)

---

### 🏪 22.3 Restaurant Management
*   **Zone Setup:**
    *   **Purpose:** Define geographic boundaries for delivery.
    *   **How to use:** Draw shapes on the map to define where you operate.
    *   **Helpful for Admin:** Prevents orders from being placed in areas with no riders.

![Zone Setup Configuration](./screenshots/zone_setup.png)

*   **Restaurants List:** 
    *   **Purpose:** Full database of partner eateries.
    *   **How to use:** Update bank details, contact info, or commission rates.
*   **New Joining Request:**
    *   **Purpose:** Lead pipeline for new partners.
    *   **How to use:** Review business licenses and click "Approve" to onboard them.
*   **Restaurant Commission:**
    *   **Purpose:** Revenue configuration.
    *   **How to use:** Set custom % for premium partners vs. standard partners.
*   **Restaurant Reviews & Complaints:**
    *   **Purpose:** Quality control.
    *   **How to use:** Read feedback and issue warnings to restaurants with low ratings.

---

### 📑 22.4 Order Management
*   **All Orders / Scheduled / Pending:**
    *   **Purpose:** Monitor every stage of the order lifecycle.
    *   **How to use:** Use the "Scheduled" tab to see upcoming breakfast or event orders.
*   **Restaurant Cancelled / Payment Failed:**
    *   **Purpose:** Failure analysis.
    *   **How to use:** Investigate why restaurants are cancelling (e.g., out of stock) and fix the root cause.
*   **Order Detect Delivery:**
    *   **Purpose:** Real-time logistics monitor.
    *   **How to use:** See which orders are currently being delivered and where.

---

### 🎁 22.5 Promotions & Referrals
*   **Restaurant Coupons & Offers:**
    *   **Purpose:** Marketing tools.
    *   **How to use:** Create codes like "FESTIVAL50" for platform-wide sales.
*   **Referral Settings:**
    *   **Purpose:** Viral growth.
    *   **How to use:** Set how much "Wallet Credit" a user gets for inviting a friend.
    *   **Helpful for Admin:** Reduces marketing costs by using word-of-mouth.

---

### 👥 22.6 Customer Management
*   **Customers:** 
    *   **Purpose:** CRM (Customer Relationship Management).
    *   **How to use:** View a customer's total lifetime value (LTV) and order habits.
*   **Support Tickets:**
    *   **Purpose:** Problem resolution.
    *   **How to use:** Reply to user queries or restaurant issues from one place.

---

### 🛵 22.7 Deliveryman Management
*   **Delivery Cash Limit:**
    *   **Purpose:** Risk management.
    *   **How to use:** Set the max amount of cash a rider can hold before they must remit it.
*   **Delivery & Platform Fee:**
    *   **Purpose:** Pricing engine.
    *   **How to use:** Set base delivery charges and your service fee.
*   **Delivery Withdrawal:**
    *   **Purpose:** Payout management.
    *   **How to use:** Approve rider requests to withdraw their earnings to their bank.
*   **Delivery Emergency Help:**
    *   **Purpose:** Safety.
    *   **How to use:** Monitor SOS alerts from riders in case of accidents or trouble.
*   **Deliveryman Reviews:**
    *   **Purpose:** Rating system for riders.

---

### 📈 22.8 Report Management
*   **Transaction Report:** View every cent flowing through the platform.
*   **Tax Report:** Essential for government compliance and audits.
*   **Customer Report (Feedback Experience):** Detailed analysis of user satisfaction scores.

---

### 🛋️ 22.9 Dining Management (New Feature)
*   **Dining Banners:** Promote "Dine-in" experiences.
*   **Dining List:** Manage restaurants that offer table booking.
*   **Dining Category Request:** Approve restaurants wanting to enter the Dining segment.

---

### 🛠️ 22.10 System Settings
*   **Broadcast Notification:**
    *   **Purpose:** Direct communication.
    *   **How to use:** Send a message to EVERY user (e.g., "Heavy rain, expect delays").
*   **Business Setup:**
    *   **Purpose:** Master configuration.
    *   **How to use:** Change currency, app name, or technical API keys.

### 💳 22.11 Transaction Management
*   **Restaurant Withdraws:**
    *   **Purpose:** Financial settlement.
    *   **How to use:** Review and approve requests from restaurants to transfer their earnings to their bank accounts.

### 🖼️ 22.12 Banner Settings
*   **Landing Page Management:**
    *   **Purpose:** Branding.
    *   **How to use:** Update the main hero banners and text on the customer-facing landing page.

### 📄 22.13 Pages & Social Media
*   **Policy Pages (About, Terms, Privacy, etc.):**
    *   **Purpose:** Legal and informational transparency.
    *   **How to use:** Edit the text for Terms and Conditions, Privacy Policy, and Refund rules to stay legally compliant.

---

## 🛠️ 23. Troubleshooting Guide

| Issue | Reason | Solution |
| :--- | :--- | :--- |
| **Admin Login Failed** | Credentials error | Reset via "Forgot Password." |
| **Rider can't see orders** | Location permission off | Enable GPS in Phone Settings. |
| **Restaurant app says "Offline"** | Poor Internet | Check Wi-Fi or Tablet data. |
| **Payment Gateway Error** | Incorrect API Keys | Update keys in Settings > Payments. |
| **Emails not sending** | SMTP server down | Check SendGrid/Mailgun status. |
| **Order stuck in "Pending"** | No riders available | Check for Surge Pricing or manual broadcast. |

---

## ❓ 24. FAQ (The Big 25)

1.  **How do I change the minimum order value?** Go to Settings > Ordering > Min Order.
2.  **Can I set different commissions for different restaurants?** Yes, each restaurant has its own "Commission" field in its profile.
3.  **How do I pay my riders?** Use the "Settlements" tab to generate a CSV for bank transfer.
4.  **What if a restaurant is out of stock?** They should toggle the item "Off" in their app, or you can do it from Admin Panel > Menu.
5.  **How do I block a city?** Go to Zones and "Deactivate" that specific city zone.
6.  **Can I add a 'Service Fee'?** Yes, in Settings > Pricing, you can add a fixed fee per order.
7.  **How do I handle a 'Wrong Item' delivered?** Refund the customer and deduct the cost from the Restaurant's next payout.
8.  **Can I send a custom notification to just one person?** Yes, go to User Details > Send Notification.
9.  **What is the 'Surge Factor'?** A multiplier (e.g., 1.5x) applied to delivery fees during busy times.
10. **How do I verify a Rider's License?** Open the Rider's profile and click on the "Documents" tab.
11. **Can I delete an order?** No, you can only "Cancel" it for audit trail purposes.
12. **How do I export my tax reports?** Reports > Tax Report > Select Date > Export PDF.
13. **What is 'Maintenance Mode'?** It stops all orders while you perform technical updates.
14. **How do I add a new Admin user?** Settings > Staff Management > Add New.
15. **Can I restrict a staff member's access?** Yes, use the "Roles & Permissions" tab.
16. **How do I change the App Logo?** Settings > Branding > Upload Logo.
17. **What happens if a user doesn't pay for COD?** The rider marks it as "Unpaid" and the user is automatically blocked.
18. **Can I set 'Holiday Timings' for restaurants?** Yes, in the Restaurant Timings section.
19. **How do I track 'Lost Revenue'?** Use the "Cancelled Orders Report" in Analytics.
20. **Can I offer 'Free Delivery' for a specific restaurant?** Yes, link a coupon code only to that restaurant ID.
21. **How do I update the 'Terms and Conditions'?** Settings > Pages > Terms & Conditions.
22. **What if a rider steals food?** Block the rider and deduct the cost from their remaining wallet balance.
23. **How do I see 'Live' order count?** It is prominently displayed at the top of the Dashboard.
24. **Can I run a 'Buy 1 Get 1' offer?** Yes, set this up in Menu Management for the specific item.
25. **How do I contact technical support?** Click the "Support" icon at the bottom right.

---

## 🏆 25. Best Practices for Growth

*   **Weekly Monitoring:** Look at your "Top 10 Cancelled Orders" list every Monday to find bottlenecks.
*   **Rider Incentives:** Offer a "Quest Bonus" (e.g., $10 extra for completing 20 orders on a Sunday).
*   **Fast Approvals:** Try to approve new restaurants within **24 hours** to keep them excited.

---

## 🏁 26. Conclusion

This Admin Panel is the engine of your business. Treat it with care, monitor the data daily, and always prioritize the user experience.

**Support Contact:**
📧 Email: admin-support@foodelo.com
📞 Phone: 8882236180

---
**Document Version:** 2.1.0
**Last Updated:** May 12, 2026
**Confidentiality:** Internal Use Only
