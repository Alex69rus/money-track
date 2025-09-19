-- PostgreSQL script to insert or update transaction based on user_id + message_id
-- Parameters as variables
-- Note: Requires unique constraint on (user_id, message_id) for ON CONFLICT to work

-- Define input parameters
\set p_user_id 123456789
\set p_message_id 'MSG_12345'
\set p_transaction_date '2024-01-15 14:30:00'
\set p_amount 150.75
\set p_note 'Coffee shop payment'
\set p_currency 'AED'
\set p_sms_text 'Payment of AED 150.75 at Coffee Shop on 15/01/2024'
\set p_category_id NULL
\set p_tags '{shopping,food}'

-- Upsert transaction using ON CONFLICT
-- Note: UserId is now a BIGINT (Telegram user ID) instead of FK to Users table
INSERT INTO transactions (
    user_id,
    message_id, 
    transaction_date,
    amount,
    note,
    currency,
    sms_text,
    category_id,
    tags,
    created_at
)
VALUES (
    :p_user_id,
    :'p_message_id',
    :'p_transaction_date'::timestamp,
    :p_amount,
    :'p_note',
    :'p_currency',
    :'p_sms_text',
    :p_category_id,
    :'p_tags'::text[],
    NOW()
)
ON CONFLICT (user_id, message_id) 
DO UPDATE SET
    transaction_date = EXCLUDED.transaction_date,
    amount = EXCLUDED.amount,
    note = EXCLUDED.note,
    currency = EXCLUDED.currency,
    sms_text = EXCLUDED.sms_text,
    category_id = EXCLUDED.category_id,
    tags = EXCLUDED.tags
-- Note: created_at is not updated on conflict to preserve original creation time

RETURNING id, user_id, message_id, created_at;