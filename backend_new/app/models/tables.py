from __future__ import annotations

from piccolo.columns import (
    Array,
    BigInt,
    BigSerial,
    Integer,
    Numeric,
    Serial,
    Text,
    Timestamp,
    Varchar,
)
from piccolo.table import Table


class Category(Table, tablename="category"):
    id = Serial(primary_key=True)
    name = Varchar(length=100, required=True)
    type = Text(required=True)
    color = Varchar(length=7, null=True)
    icon = Varchar(length=50, null=True)
    parent_category_id = Integer(null=True)
    order_index = Integer(null=True)
    created_at = Timestamp(required=True)


class Transaction(Table, tablename="transaction"):
    id = BigSerial(primary_key=True)
    user_id = BigInt(required=True)
    transaction_date = Timestamp(required=True)
    amount = Numeric(digits=(18, 2), required=True)
    note = Varchar(length=500, null=True)
    category_id = Integer(null=True)
    tags = Array(base_column=Text(), required=True)
    currency = Varchar(length=100, default="AED", required=True)
    sms_text = Varchar(length=1000, null=True)
    message_id = Varchar(length=100, null=True)
    created_at = Timestamp(required=True)


class TransactionsWithCategory(Table, tablename="transactions_with_category"):
    id = BigInt(primary_key=True)
    user_id = BigInt(required=True)
    transaction_date_time = Timestamp(required=True)
    transaction_date_day = Timestamp(required=True)
    transaction_date_month = Timestamp(required=True)
    transaction_date_quarter = Timestamp(required=True)
    transaction_date_year = Timestamp(required=True)
    amount = Numeric(digits=(18, 2), required=True)
    note = Varchar(length=500, null=True)
    tags = Array(base_column=Text(), required=True)
    currency = Varchar(length=100, required=True)
    category_id = Integer(null=True)
    category_name = Varchar(length=100, null=True)
    category_type = Text(null=True)
