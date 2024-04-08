---
title: 'Subscription management'
linkTitle: 'Subscription management'
weight: 2
description: 'How to manage your subscription'
---

This article provides tips on how to effectively manage your
CVAT subscriptions, including tracking expenses and canceling
unnecessary subscriptions, to optimize your finances and save time.

Whether you're a business owner or an individual,
you'll learn how to take control of your subscriptions and manage them.

See:

- [Billing](#billing)
  - [Solo plan](#solo-plan)
  - [Team plan](#team-plan)
  - [Can a paid invoice be modified?](#can-a-paid-invoice-be-modified)
  - [How to add VAT/tax and other information to the CVAT.ai invoice before the first payment?](#how-to-add-vattax-and-other-information-to-the-cvatai-invoice-before-the-first-payment)
  - [How to add/ change VAT/tax and other information to the CVAT.ai invoice after the first payment?](#how-to-add-change-vattax-and-other-information-to-the-cvatai-invoice-after-the-first-payment)
- [How can I get a quote before I subscribe? How to add a PO number to my invoices?](#how-can-i-get-a-quote-before-i-subscribe-how-to-add-a-po-number-to-my-invoices)
- [Can you sign an agreement before I subscribe?](#can-you-sign-an-agreement-before-i-subscribe)
- [Can you handle a bank transfer with 30-day payment terms?](#can-you-handle-a-bank-transfer-with-30-day-payment-terms)
- [Where can I find my invoices?](#where-can-i-find-my-invoices)
- [I am a student, can I have a discount or free access?](#i-am-a-student-can-i-have-a-discount-or-free-access)
- [Payment methods](#payment-methods)
  - [Paying with bank transfer](#paying-with-bank-transfer)
  - [Change payment method on Solo plan](#change-payment-method-on-solo-plan)
  - [Change payment method on Team plan](#change-payment-method-on-team-plan)
- [Adding and removing team members](#adding-and-removing-team-members)
  - [Solo plan](#solo-plan-1)
  - [Team plan](#team-plan-1)
- [Change plan](#change-plan)
- [Can I subscribe to several plans?](#can-i-subscribe-to-several-plans)
- [Cancel plan](#cancel-plan)
  - [What will happen to my data?](#what-will-happen-to-my-data)
  - [Solo plan](#solo-plan-2)
  - [Team plan](#team-plan-2)
- [Plan renewal](#plan-renewal)
  - [Solo plan](#solo-plan-3)
  - [Team plan](#team-plan-3)
- [Subscription management video tutorial](#subscription-management-video-tutorial)

## Billing

This section describes the billing model and gives short a
description of limitations for each plan.

For more information,
see: [Pricing Plans](https://www.cvat.ai/post/new-pricing-plans)

### Solo plan

**Account/Month**: The **Solo** plan has a fixed price and is
designed **for personal use only**. It doesn't allow collaboration with team members,
but removes all the other limits of the **Free** plan.

> **Note**: Although it allows the creation of an organization and
> access for up to 3 members -- it is _for trial purposes_ only,
> organization and members _will have all the limitations of the **Free** plan_.

### Team plan

**Member/ month**: The **Team** plan allows you to create
an organization and add team members who can collaborate on projects.
The **monthly payment for the plan depends on the number of team members you've added**.
All limits of the **Free** plan will be removed.

> **Note**: The organization owner is also part of the team.
> So, if you have three annotators working, you'll need to pay
> for 4 seats (3 annotators + 1 organization owner).

### Can a paid invoice be modified?

Once an invoice has been paid, it is not possible to modify it. This restriction is due to the
limitations of the payment processing platform used, which in the case of CVAT.ai, is [Stripe](https://stripe.com/).

Stripe's policy dictates that revisions to an invoice can only be made before payment.
For more comprehensive information on this policy, please refer to Stripe's official documentation
on [invoice edits](https://docs.stripe.com/invoicing/invoice-edits#:~:text=Stripe%20lets%20you%20revise%20a,Edit%20the%20invoice%20description.)
at their website.

### How to add VAT/tax and other information to the CVAT.ai invoice before the first payment?

To ensure VAT (tax) information and other relevant details are included on your CVAT.ai invoices,
it's important to add this information before making the first payment.

This process involves using the Stripe subscription management panel, where you'll need to
enter your VAT and other organizational details.

Here’s how you can do it:

1. Sign up for a CVAT.ai account and log in.
2. Create an [organization](/docs/manual/advanced/organization/) and switch to an **Organization** account.
3. Navigate to the top right corner, next to the **Organization** name,
   click on the arrow >**Upgrade to Team Plan**> **Get Started**.
   This action will redirect you to the Stripe payment page.

   > **Important:** Do not proceed with the payment at this stage.

   ![Stripe Payment Page](/images/sm-payment-page.png)

4. Go to the [Stripe billing](https://billing.stripe.com/p/login/fZe2aO3J2eDA3W8eUU) page and log
   in with your CVAT.ai email address. You will receive an email containing a link:

   ![Stripe Link](/images/sm-stripe-link.png)

   > **Note:** If you did not receive this email, it may indicate that the address you used is not
   > registered with CVAT.ai, or you may have skipped **Step 3**.
   > <br>Additionally, remember to check your spam folder.

5. Click on the link in the email, you will see the following page:

   ![Stripe Billing Page](/images/sm-stipe-billing-page.png)

6. In the **Billing Information** section, click **Update information** and add all the needed information
   about your company. For details, see [How to Subscribe, Change, or Renew Your Subscription](https://www.youtube.com/watch?v=AMPtbmqZKNY).
7. Once you have added all the necessary information, return to **Step 3**,
   and pay for the [Team plan](/docs/enterprise/subscription-managment/#team-plan).
   Once the payment has been processed, you will receive a confirmation e-mai.
8. All the information you’ve added in **Step 6** will be visible in your account and in the invoice.

![Stripe Payment Info](/images/sm-profile-inf.png)

By following these steps, you can seamlessly add VAT and other crucial information to your
invoices, making your financial transactions with CVAT.ai transparent and compliant.

### How to add/ change VAT/tax and other information to the CVAT.ai invoice after the first payment?

In the top right corner, near the **Organization** name, click on the arrow >**Manage Team Plan** > **Manage**.

You will see the Stripe page. Go to the **Billing Information** > **Update Information**.

![Stripe Payment Info](/images/sm-profile-upd-inf.png)

## How can I get a quote before I subscribe? How to add a PO number to my invoices?

If you require a quote from CVAT for payment via bank transfer, certain criteria must be met:

- The **total subscription cost must be $396 and up**.
- Quotes are available exclusively **for annual subscriptions**.

Should you meet these requirements, please write to [support@cvat.ai](mailto:support@cvat.ai)

## Can you sign an agreement before I subscribe?

Sign of specific agreements and approvals are available if you meet specific criteria
(the **total subscription cost must be $10,000 and up**), for more details contact [support@cvat.ai](mailto:support@cvat.ai)

## Can you handle a bank transfer with 30-day payment terms?

Yes, it is available if you fit the quota criteria, for details contact [support@cvat.ai](mailto:support@cvat.ai).

## Where can I find my invoices?

In the top right corner, near the **Organization** name, click on the arrow > **Manage Team Plan** >**Manage**

You will see the Stripe page.
At the bottom of the page, you will see the **Invoice History** section with all invoices.

Invoices are automatically sent to the account owner address used for the registration.

To see the invoice click on the **Show Invoice Icon** ![Stripe Invoice Icon](/images/invoice-icon.png) icon.

![Show Invoice](/images/show-invoice.png)

## I am a student, can I have a discount or free access?

To consider your request for a discount, we'd need a few details from you:

- A copy of your valid student ID or any document confirming your university affiliation.
- Your university advisor's contact details.
- The name and contact information of the dean of your faculty.
- A brief outline of your project plan. This helps us understand how we might collaborate
  on a joint marketing statement highlighting your use of CVAT.ai, and how it can benefit your project.
- We'd also appreciate a positive LinkedIn post about your experience using CVAT, making sure to tag @CVAT.ai.

All these details must be sent to [support@cvat.ai](mailto:support@cvat.ai). Once we have this
information, we'll gladly offer you a 50% discount for one year.

## Payment methods

This section describes how to change or add payment methods.

### Paying with bank transfer

> **Note** at the moment this method of payment
> work only with US banks.

To pay with bank transfer:

1. Go to the **Upgrade to Solo**/**Team plan**> **Get started**.
2. Click **US Bank Transfer**.
3. Upon successful completion of the payment, the you will receive a receipt via email.

> **Note** that the completion of the payment process may take up to three banking days.

![Bank Transfer Payment](/images/bank_transfer_payment.jpg)

### Change payment method on Solo plan

Access Manage **Solo plan** > **Manage** and click **+Add Payment Method**

![Payment pro](/images/update_payment_solo.png)

### Change payment method on Team plan

Access **Manage Team Plan** > **Manage** and click **+Add Payment Method**.

![Payment team](/images/update_payment_team.png)

## Adding and removing team members

This section describes how to add team members
to collaborate within one team.

### Solo plan

Not available.

### Team plan

Go to the **Manage Team plan** > **Manage** > **Update quantity**.

![Add members](/images/change_members_number_team.gif)

If you've added a user **before the current billing period ends**,
the payment will be prorated for the remaining time until the
next billing cycle begins. From the following month onward,
the full payment will be charged.

In case you **removed the user before the current billing period ends**,
funds will not be returned to your account,
but next month you will pay less by the amount of unused funds.

## Change plan

The procedure is the same for both **Solo** and **Team** plans.

If for some reason you want to change your plan, you need to:

1. Unsubscribe from the previous plan.
2. If you need a refund, contact us at [support@cvat.ai](mailto:support@cvat.ai).
3. Subscribe to a new plan.

## Can I subscribe to several plans?

Paid plans are not mutually exclusive.
You can have several active subscriptions,
for example, the **Solo** plan and several **Team**
plans for different organizations.

## Cancel plan

This section describes how to cancel your CVAT subscription
and what will happen to your data.

### What will happen to my data?

Once you have terminated your subscription, your data will remain
accessible within the system for a month. During this period,
you will be unable to add new tasks and free plan limits will be applied.

In case you possess a substantial amount of data,
it will be switched to read-only mode. It means
you will not be able to save annotations, add any resources,
and so on.

Following the one month, you will receive a
notification requesting you to either remove the
excess data or it will be deleted automatically.

### Solo plan

To cancel **Solo** plan, do the following:

1. In the top right corner click on your nickname, then **Organization** > **Personal workspace**.
2. Click again on the nickname, then follow to **Manage Solo plan** > **Manage** > **Cancel plan**

Please, fill out the feedback form, to help us improve our platform.

![Cancel pro](/images/cancel_solo.gif)

### Team plan

To cancel **Team** plan, do the following:

1. In the top right corner click on your nickname, then **Organization** > Organization name.
2. Click again on the nickname, then follow to **Manage Team plan** > **Manage** > **Cancel plan**

Please, fill out the feedback form, to help us improve our platform.

![Cancel team](/images/cancel_team.gif)

## Plan renewal

This section describes how to renew your
CVAT subscription

### Solo plan

Access **Manage Solo plan** > **Manage** > **Renew plan**

### Team plan

Access **Manage Team Plan** > **Manage** > **Renew plan**

## Subscription management video tutorial

<!--lint disable maximum-line-length-->

<iframe width="560" height="315" src="https://www.youtube.com/embed/AMPtbmqZKNY?si=2TLhdytDIlSJ3Fwd" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>

<!--lint enable maximum-line-length-->
