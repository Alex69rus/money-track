import json

from agents import RunContextWrapper, function_tool
from agents.tool import ToolOutputText

from app.models import TransactionsWithCategory
from app.services.ai_chat.chat_agent_context import ChatAgentContext
from app.services.ai_chat.common import PaginationSkip, PaginationTake


@function_tool()
async def get_user_tags(
    ctx: RunContextWrapper[ChatAgentContext],
    tag_name_filter: str | None = None,
    skip: PaginationSkip = 0,
    take: PaginationTake = 10,
) -> ToolOutputText:
    """
    Returns a paginated list of unique tags associated with the user's transactions.
    Suports optional filtering of tags by a provided substring (case-insensitive).

    Args:
        tag_name_filter (str | None): Optional substring to filter tags (case-insensitive).
        skip (int): Number of tags to skip for pagination (default: 0).
        take (int): Number of tags to return for pagination (default: 10, maximum: 100).
    """
    parameters: list[object] = [ctx.context.user_id]

    tags_sql = """\
    SELECT DISTINCT transaction_tag.tag AS tag
    FROM "transaction"
    CROSS JOIN LATERAL UNNEST("tags") AS transaction_tag(tag)
    WHERE "user_id" = {}
    """

    if tag_name_filter:
        tags_sql += " AND transaction_tag.tag ILIKE {}"
        # tags_sql += " AND tags && {}::text[]"
        parameters.append(f"%{tag_name_filter}%")

    tags_sql += " ORDER BY tag ASC OFFSET {} LIMIT {}"
    parameters.extend([skip, take])

    rows = await TransactionsWithCategory.raw(tags_sql, *parameters).run()
    tags = [row["tag"] for row in rows if row["tag"] is not None]
    return ToolOutputText(text=json.dumps(tags))
