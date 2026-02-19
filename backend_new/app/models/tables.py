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
    type = Varchar(length=50, required=True)
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
    tags = Array(base_column=Text(), default=list)
    currency = Varchar(length=100, default="AED", required=True)
    sms_text = Text(null=True)
    message_id = Varchar(length=100, null=True)
    created_at = Timestamp(required=True)
