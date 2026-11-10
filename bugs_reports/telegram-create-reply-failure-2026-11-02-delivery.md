# BR-028 — Локальное исправление, 2026-11-02

Статус: **Fixed — verification pending**. Локальные проверки изменённой функциональности пройдены; production и реальный Telegram-клиент не обновлялись и не проверялись. Полный backend-набор также имеет три подтверждённых сбоя исходного baseline, описанных ниже.

## Изменённое поведение

- Новый `telegram_update_receipt` хранит точный update_id и UTC-время приёма. Атомарный INSERT ON CONFLICT DO NOTHING до любой бизнес-обработки допускает только одну обработку ID, включая callbacks. Запись сохраняется между перезапусками, пропуск не зависит от порядка ID. Изменённое сообщение с новым update_id продолжает обновлять транзакцию по старому message_id.
- `send_telegram_reply` повторяет тот же текст, reply target и keyboard после сетевых NetworkError/TimedOut: максимум три попытки, пауза ровно одна секунда между попытками. Парсинг, upsert и категоризация не повторяются.
- BadRequest (наследник NetworkError), Forbidden и RetryAfter не повторяются с фиксированной секундной задержкой. Они логируются как окончательная ошибка отправки.
- Ошибка доставки больше не попадает в parse-failure fallback. Неожиданные ошибки обработки используют отдельный processing-error текст. Настоящее отсутствие результата парсинга сохраняет `Cannot parse the transaction`.
- Логи отмечают вид ответа, номер попытки и результат без полного текста SMS/ответа; trace связывает их с обработкой update.

Изменённые области: `app/services/telegram_ingestion.py`, новые `telegram_delivery.py` и `telegram_updates.py`, модель/экспорт/регистрация `TelegramUpdateReceipt`, миграция `db_2026_11_02t12_00_00_000001.py`, unit/integration tests, README/GUARDRAILS. Все продуктовые изменения находятся внутри `backend_new`.

## Проверки

Cwd — `backend_new`. Из-за известной sandbox-паники `uv` использован существующий Python/инструменты из `/Users/akukharev/src/python/money-track/backend_new/.venv/bin/`; импорты приложения и тесты выполнялись из этого worktree. Установлены openai-agents 0.24.0, openai 3.37.0, Piccolo 1.32.0. Внешние LLM/Telegram вызовы не выполнялись.

- До реализации новые регрессии: 9 failed, 1 passed — подтверждены отсутствие retry, duplicate suppression и неверный fallback.
- `python -m ruff format .`, `python -m ruff check .` — passed.
- `python -m mypy .` — passed, 74 source files.
- `python -m pytest tests/test_telegram_ingestion.py -q --tb=short` — 19 passed после реализации.
- `DATABASE_URL=postgresql://postgres:password@127.0.0.1:5432/moneytrack TELEGRAM_BOT_TOKEN=test-token piccolo migrations forwards all` — новая миграция успешно применена только к локальной БД.
- Интеграция PostgreSQL: восемь одновременных claim одного ID дают ровно одного победителя; дубликат отклоняется в новом event loop; новый меньший ID принимается; отрицательные тестовые IDs удаляются в finally.
- Первый общий запуск: 150 passed, 2 skipped, 4 failed. Наш новый DB-тест выявил timezone mismatch: Piccolo Timestamp ожидает naive datetime; исправлено явным naive UTC. Три остальных сбоя относятся к AI Chat и воспроизведены на чистом исходном `07c203ea55309761ebc48d0a9bf27531ba2fcea6` в отдельной временной копии (3 failed).
- Повторный общий запуск с исключением этих трёх baseline-тестов: **151 passed, 2 skipped, 3 deselected**. Два skips требуют PRODUCTION_BASE_URL. После последней корректировки test fixture отдельно повторены Telegram-регрессии.

Точная команда общего контрольного набора (через `python -m pytest`, BASE_URL установлен readiness-runner в `http://127.0.0.1:65028`):

```sh
python -m pytest tests -ra \
  --ignore=tests/integration/test_sms_parser_llm_e2e.py \
  --ignore=tests/integration/test_category_suggestion_llm_e2e.py \
  --ignore=tests/integration/test_telegram_category_suggestion_e2e.py \
  -k 'not test_aggregate_tool_rejects_invalid_top_level_pagination and not test_list_transactions_rejects_invalid_top_level_pagination and not test_tags_tool_rejects_invalid_top_level_pagination'
```

Environment: `DATABASE_URL=TEST_DATABASE_URL=postgresql://postgres:password@127.0.0.1:5432/moneytrack` (две отдельные переменные), `TELEGRAM_BOT_TOKEN=test-token`, пустые TELEGRAM_WEBHOOK_URL / TELEGRAM_WEBHOOK_SECRET / OPENAI_API_KEY, `RUN_LLM_E2E=0`. Runner запустил uvicorn из этого worktree, дождался GET /health=200 OK и остановил свой процесс после pytest. Порт 8000 уже был занят; существующий процесс не затрагивался.

Baseline-сбои:

- `test_ai_chat_aggregate_tool.py::test_aggregate_tool_rejects_invalid_top_level_pagination`
- `test_ai_chat_select_tool.py::test_list_transactions_rejects_invalid_top_level_pagination`
- `test_ai_chat_tags_tool.py::test_tags_tool_rejects_invalid_top_level_pagination`

SDK возвращает generic tool error, тогда как assertions ждут `take`/`skip`. Это существующий contract/test mismatch, не вызванный Telegram-изменениями. Соответствующий продуктовый код не менялся. Полный набор без исключений пока нельзя считать зелёным.

Историческое воспроизведение из `telegram-create-reply-failure-2026-11-02-repro.py` сохранено и повторно проверено; оно специально загружает старый handler через git show и показывает исходный дефект без вызовов сети/БД. Современное желаемое поведение проверяет `tests/test_telegram_ingestion.py`.

## Границы и эксплуатация

- До запуска новой версии необходимо применить Piccolo migration; существующий Docker entrypoint уже выполняет migrations forwards all. Никаких production-миграций в этой работе не выполнялось.
- Receipt означает допуск к обработке, а не доказательство успешного завершения. Он сохраняется и при ошибках, чтобы redelivery не запускал побочные эффекты и новый бюджет отправок. Новых статусов, автоматического replay и удаления receipts нет.
- Ранняя квитанция webhook и очередь в памяти сохранены. Авария после ACK может потерять очередь; авария после claim может оставить ID без завершённой обработки. Это at-most-once admission, а не durable job/recovery система.
- При потере ответа после принятия сообщения Telegram retry может создать второе подтверждение. Входная дедупликация не даёт exactly-once отправку.
- Таблица рассчитана на единственного настроенного бота в этой БД.

Дальнейшая проверка перед production: разрешить отдельные baseline-сбои CI и проверить сценарий в реальном Telegram после согласованного выкатывания.
