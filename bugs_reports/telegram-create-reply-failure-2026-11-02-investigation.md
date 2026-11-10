# BR-028 — Результаты расследования Telegram fallback

Первоначальное расследование: **Triaged — причина подтверждена**.

Обновление: исправление реализовано локально в этом worktree; см. `telegram-create-reply-failure-2026-11-02-delivery.md`. Production не обновлялся. Ссылки на строки кода ниже относятся к исходному commit `07c203e`.
Проверено 2026-11-02 через read-only SSH к production, без отправки сообщений в Telegram или запросов к OpenAI.

## Вывод

SMS успешно обработано и сохранено. Сбой TLS при отправке подтверждения попал в общий обработчик исключений, который отправил `Cannot parse the transaction`. Этот текст ошибочно сообщает об отказе парсинга после успешного сохранения.

## Проверенные источники

- Скриншот: `telegram-create-reply-failure-2026-11-02.jpg`.
- Сырой отчёт: `telegram-create-reply-failure-2026-11-02.md`.
- Production-логи окна 11:20:13–11:20:27 UTC и SHA-256 файлов: `telegram-create-reply-failure-2026-11-02-runtime.txt`.
- Работающий контейнер: `money-track-backend-1`, image ID `sha256:c6e49a298e53c799d3026008f1ff15459abb8d4de55879dc872c87065ef13416`, StartedAt `2026-10-28T05:38:47.192833615Z`.
- HEAD server checkout: `07c203ea55309761ebc48d0a9bf27531ba2fcea6`. Сам по себе checkout HEAD не подтверждает содержимое образа `backend:latest`.
- Прямо прочитаны handler/runtime работающего контейнера; SHA-256 deployed `telegram_ingestion.py`, `telegram_runtime.py`, `telegram_router.py`, `queries.py` совпали с локальными файлами `backend_new/app/`.

## 1. Парсинг и transaction_id=3400

`telegram_ingestion.py:173–204`: parser должен вернуть ненулевой результат с amount и currency. Иначе `_send_unparsed` вызывается до upsert, затем функция возвращается. При успехе `upsert_transaction_by_message_id` возвращает DTO с DB ID, который передаётся в category suggestion.

`queries.py:491–589`: upsert использует `(user_id, message_id)`, возвращая ID существующей или созданной строки. Вызов category suggestion сам по себе не доказывает создание новой строки.

В данном инциденте дополнительная read-only проверка production PostgreSQL подтвердила **все шесть булевых утверждений**:

| Проверка записи id=3400 | Результат |
| --- | --- |
| Найдена ровно одна строка | true |
| sms_text точно совпадает с SMS из обращения | true |
| amount=-49.31 и currency=AED | true |
| category_id=50 | true |
| created_at в [2026-11-02 11:20:13Z, 11:20:24Z) | true |
| message_id заполнен | true |

Содержимое финансовой записи, user_id и message_id из БД не выгружались. Проверка полной записи была отклонена automatic approval review; безопасная проверка совпадений разрешена и выполнена. На production подтверждён уникальный индекс `ix_transaction_user_id_message_id` по `(user_id, message_id)`.

## 2. Почему после сохранения появляется parse failure

`_send_create_reply`, строки 135–149, формирует `Transaction was saved.`, данные транзакции и кнопки категорий. На строке 143 выполняется `bot.send_message`.

`handle_telegram_update`, строки 293–312: `_handle_message_update` целиком обёрнут в `except Exception`. Исключение из sendMessage логируется как `Failed to process Telegram update`, после чего вызывается `_send_unparsed` для исходного chat/message. `_send_unparsed`, строки 76–81, всегда передаёт `UNPARSED_REPLY_TEXT = "Cannot parse the transaction"`.

Вызов Telegram идёт после завершения upsert и применения категории. Общей DB-транзакции с отправкой ответа и rollback при её отказе нет. Поэтому сохранённая транзакция и ложный ответ сосуществуют.

## 3. Связь отправок в 11:20:24 и 11:20:25

Production-логи 2026-11-02:

| UTC | Событие |
| --- | --- |
| 11:20:13.664 | Обработка update_id=490336313 началась |
| 11:20:20.782 | Category suggestion для transaction_id=3400 |
| 11:20:23.461 | Категория 50 применена |
| 11:20:24.615 | `NetworkError: httpx.ConnectError` из `_send_create_reply:143`, transport падает в `stream.start_tls` |
| 11:20:25.581 | Следующий Telegram sendMessage получает HTTP 200 |

Категоризация, исключение и успешная отправка имеют trace_id `5325112bbf8206c8054262884365ae83`; исключение и успешная отправка также имеют один span_id `bc24e7bac9a19d4a`.

Это fallback из обработчика исключения. Код не повторяет подтверждение сохранения, не вызывает заново parser/upsert и не ставит update обратно в очередь. Если отправка fallback тоже падает, исключение только логируется как `Failed to send fallback Telegram reply`.

Тело успешного Telegram запроса/ответа исторически не записано. Текст второй отправки установлен по исполняемому коду, traceback, общему trace/span и подтверждён скриншотом; это не прямое чтение payload из HTTP-логов. Причина самого TLS-сбоя (сеть/удалённая сторона/другой transport фактор) по пустому ConnectError не установлена.

## 4. Идемпотентность и webhook ACK

- `telegram_router.py:71–72`: webhook кладёт update в in-memory `application.update_queue` и сразу возвращает HTTP 200. Это ACK постановки в очередь, без гарантии завершения бизнес-обработки или отправки ответа.
- `update_id` используется для логирования; прикладного журнала обработанных update_id и проверки дубликатов в webhook/handler нет.
- DB upsert по `(user_id, message_id)` предотвращает вторую строку для того же ключа, но не предотвращает повторный parser, category suggestion, изменение полей или второй ответ. Для обычного повторного message update `_resolve_suggestion` повторяет categorization; ветка сохранения уже назначенной категории применяется к edited messages.
- В доступных логах найден один старт обработки update_id=490336313 и одно принятие этого update webhook. Повторная обработка для объяснения этого случая не требуется.
- HTTP 200 webhook в 11:20:13 согласуется с фоновой обработкой до 11:20:25. 11:20 UTC соответствует 15:20 UTC+4.

## 5. Локальное воспроизведение

Исторический probe теперь явно загружает handler из исходного commit `07c203e`, независимо от текущей исправленной версии. Команда из корня (нужен Python с backend-зависимостями):

```sh
backend_new/.venv/bin/python bugs_reports/telegram-create-reply-failure-2026-11-02-repro.py
```

Результат: **reproduced**, assertions прошли. Parser, upsert, category и Telegram заменены mocks; callback signer получает синтетический secret. Внешние API и БД не вызывались.

Артефакт: `telegram-create-reply-failure-2026-11-02-repro-result.json`.

- parser/upsert/category вызываются ровно по одному разу;
- первая отправка содержит `Transaction was saved.` и падает с синтетическим NetworkError;
- вторая отправка содержит ровно `Cannot parse the transaction`;
- обе отправки отвечают на один message_id.

Это диагностический probe текущего дефекта, не регрессионный тест желаемого исправленного поведения. Первый запуск probe не дошёл до transport из-за отсутствующего Settings для callback signing; после локального mock настроек воспроизведение успешно.

## Граница первоначального расследования и рекомендуемое исправление

Продуктовый код и production не изменялись. Для исправления следует отделить ошибки parser/storage/category от ошибок доставки подтверждения: после успешного сохранения нельзя отправлять parse-failure. Логировать тип ответа, update_id, transaction_id и результат доставки без полного SMS; добавить регрессию, в которой отказ подтверждения не порождает `Cannot parse the transaction`. Возможность безопасного повтора подтверждений и durable update deduplication — отдельные решения, не реализованные этим расследованием.
