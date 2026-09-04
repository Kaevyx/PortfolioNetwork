-- Add custom fields to support ticket categories
-- This allows different ticket types to have different questions/fields

-- Example: Bug Report category with custom fields
UPDATE support_ticket_categories
SET custom_fields = '[
  {
    "name": "steps_to_reproduce",
    "label": "Steps to Reproduce",
    "type": "textarea",
    "required": true,
    "placeholder": "1. Go to...\n2. Click on...\n3. See error...",
    "help_text": "Please provide detailed steps to reproduce the bug",
    "rows": 5
  },
  {
    "name": "expected_behavior",
    "label": "Expected Behavior",
    "type": "textarea",
    "required": true,
    "placeholder": "What should happen?",
    "help_text": "Describe what you expected to happen",
    "rows": 3
  },
  {
    "name": "actual_behavior",
    "label": "Actual Behavior",
    "type": "textarea",
    "required": true,
    "placeholder": "What actually happened?",
    "help_text": "Describe what actually happened",
    "rows": 3
  },
  {
    "name": "browser_device",
    "label": "Browser/Device",
    "type": "text",
    "required": false,
    "placeholder": "e.g., Chrome 120 on Windows 11",
    "help_text": "Optional: Help us identify if this is device/browser specific"
  }
]'::jsonb
WHERE name = 'bug_report';

-- Example: Feature Request category with custom fields
UPDATE support_ticket_categories
SET custom_fields = '[
  {
    "name": "use_case",
    "label": "Use Case",
    "type": "textarea",
    "required": true,
    "placeholder": "Describe how you would use this feature...",
    "help_text": "Explain the problem this feature would solve or how you would use it",
    "rows": 4
  },
  {
    "name": "priority_to_you",
    "label": "Priority to You",
    "type": "text",
    "required": false,
    "placeholder": "High, Medium, Low",
    "help_text": "How important is this feature to you?"
  }
]'::jsonb
WHERE name = 'feature_request';

-- Example: Account Issue category with custom fields
UPDATE support_ticket_categories
SET custom_fields = '[
  {
    "name": "issue_type",
    "label": "Issue Type",
    "type": "text",
    "required": true,
    "placeholder": "e.g., Cannot login, Account locked, Email not verified",
    "help_text": "Briefly describe the type of account issue"
  },
  {
    "name": "affected_account",
    "label": "Affected Account Email",
    "type": "text",
    "required": false,
    "placeholder": "your-email@example.com",
    "help_text": "If different from your current account"
  }
]'::jsonb
WHERE name = 'account_issue';

-- Example: Billing category with custom fields
UPDATE support_ticket_categories
SET custom_fields = '[
  {
    "name": "transaction_id",
    "label": "Transaction ID or Invoice Number",
    "type": "text",
    "required": false,
    "placeholder": "TXN-123456 or INV-789",
    "help_text": "If you have a transaction or invoice number, please include it"
  },
  {
    "name": "payment_method",
    "label": "Payment Method",
    "type": "text",
    "required": false,
    "placeholder": "Credit Card, PayPal, etc.",
    "help_text": "How did you make the payment?"
  },
  {
    "name": "issue_description",
    "label": "Billing Issue Description",
    "type": "textarea",
    "required": true,
    "placeholder": "Describe the billing issue...",
    "help_text": "Please provide details about the billing issue",
    "rows": 4
  }
]'::jsonb
WHERE name = 'billing';

-- Platform Support and Other categories don't need custom fields (can be null)


