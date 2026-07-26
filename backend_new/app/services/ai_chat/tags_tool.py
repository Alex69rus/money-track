from agents import RunContextWrapper, function_tool

from app.models import TransactionsWithCategory
from app.services.ai_chat.chat_agent_context import ChatAgentContext


@function_tool()
async def get_user_tags(
    ctx: RunContextWrapper[ChatAgentContext],
    tag_name_filter: str | None = None,
    skip: int = 0,
    take: int = 10,
) -> list[str]:
    """
    Returns a paginated list of unique tags associated with the user's transactions.
    Suports optional filtering of tags by a provided substring (case-insensitive).

    Args:
        tag_name_filter (str | None): Optional substring to filter tags (case-insensitive).
        skip (int): Number of tags to skip for pagination (default: 0).
        take (int): Number of tags to return for pagination (default: 10).
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
    return [row["tag"] for row in rows if row["tag"] is not None]
