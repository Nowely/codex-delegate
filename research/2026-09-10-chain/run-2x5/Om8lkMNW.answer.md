Агент A1, GPT-6 (Codex), статус: завершено — спорные инструкции сохраняются в установленной и рабочей копиях, а существующий запрет показывать внутренний отчёт проверяется только как текст.

**1. По жалобам**

**Доказано — актуальность.** Обе страницы и оба указанных eval-файла побайтово одинаковы в репозитории и установленной `0.11.1`. После `v0.11.1` (`0478447`) есть только `8d560d2`, добавляющий `clear`; рассматриваемые страницы и тесты он не меняет.

- **Жалоба 1: технический план. Доказано.** [orchestrate:38](/Users/ruliny/Git/codex-delegate/skills/orchestrate/SKILL.md:38) прямо требует: “Show the plan and stop: the tasks; every seat with its side (Claude or Codex) and its model; the run directory path; and every `SEAT: write`, `SEAT: worktree`, `NETWORK:` and `WRITABLE:` a seat needs”. [Строка 41](/Users/ruliny/Git/codex-delegate/skills/orchestrate/SKILL.md:41) добавляет: “Announce the composition here, and the pool beside it: your own model and the default caps below, one Fable, one `gpt-6-astra`, six alive.” Поэтому каталог, модель координатора, лимиты и протокольные поля попали в человеческий план по инструкции. Требование объявлять лимиты введено `cacc12a`; оно **актуально**. Дословные привязки: **C2** ([eval:138](/Users/ruliny/Git/codex-delegate/evals/orchestrate.test.mjs:138)) и **C6** ([eval:167](/Users/ruliny/Git/codex-delegate/evals/orchestrate.test.mjs:167)). C2 фиксирует остановку и поля прав, но не весь перечень плана. **Гипотеза:** перечисление *отсутствующих* прав и объяснение через строку таблицы «nothing» — самостоятельное разглашение внутренних рассуждений: такой обязанности страницы не устанавливают.

- **Жалоба 2: «сиденье»/«место». Доказано.** Термин задан уже в [codex-delegate:18](/Users/ruliny/Git/codex-delegate/skills/codex-delegate/SKILL.md:18): “one Codex **seat** performs one deliverable”. Затем его специально выводят пользователю: “Codex seat `<id>`, `<model>`: `<task in a few words>`” в [codex-delegate:28](/Users/ruliny/Git/codex-delegate/skills/codex-delegate/SKILL.md:28) и [orchestrate:104](/Users/ruliny/Git/codex-delegate/skills/orchestrate/SKILL.md:104); пример ответа — “Seat W5, Sonnet: done, four flaky width checks replaced by threshold checks” в [orchestrate:138](/Users/ruliny/Git/codex-delegate/skills/orchestrate/SKILL.md:138). Эти пользовательские шаблоны добавлены `05d6121` и **актуальны**. Их дословно закрепляют **F5** ([eval:330](/Users/ruliny/Git/codex-delegate/evals/orchestrate.test.mjs:330)) и **G4** ([eval:372](/Users/ruliny/Git/codex-delegate/evals/orchestrate.test.mjs:372)). В `agent-contract` привязки к этим двум шаблонам нет. **Гипотеза:** «Пятое место вернулось» — буквальный перевод сообщения о завершении агента №5; этой русской фразы в страницах нет, точный смысл без стенограммы не установить.

- **Жалоба 3: внутренний отчёт в чате. Доказано.** Форму создаёт [orchestrate:137](/Users/ruliny/Git/codex-delegate/skills/orchestrate/SKILL.md:137): “Ask every prompt seat, Claude and Codex alike, for exactly these five fields”; ниже стоят именно `status`, `result`, `evidence`, `artifacts`, `open`, причём `result` допускает 30 строк. **G1** фиксирует поля, отступы и схему дословно ([eval:343](/Users/ruliny/Git/codex-delegate/evals/orchestrate.test.mjs:343)). Но публикацию запрещает [orchestrate:54](/Users/ruliny/Git/codex-delegate/skills/orchestrate/SKILL.md:54): “tell the user in one short paragraph what that seat found …; never paste a five-field block into user-facing text.” Это **C7** ([eval:174](/Users/ruliny/Git/codex-delegate/evals/orchestrate.test.mjs:174)). Запрет уже внесён `05d6121` после аналогичного случая на `0.10.0` и присутствует в установленной `0.11.1`. Следовательно, **попытка исправления уже выпущена; нового исправления в рабочем дереве нет**. Правила, предписывающего вставить весь отчёт в чат, я не нашёл.

**2. Дополнительные причины и ограничения**

**Доказано.** Страницы смешивают адресатов. [orchestrate:109](/Users/ruliny/Git/codex-delegate/skills/orchestrate/SKILL.md:109) говорит: “A subagent's final text is its return value, not a message to a human: say so in the brief.” Одновременно [codex-delegate:166](/Users/ruliny/Git/codex-delegate/skills/codex-delegate/SKILL.md:166) требует человеческую первую строку любого `RETURN`, “because that line is what the user is told”; orchestrate требует её внутри `result`, после чего “the rest of the fields follow unchanged”.

**Гипотеза.** Это могло ослабить запрет: внутренний отчёт одновременно оформляют как готовое сообщение человеку, а правило об адресате спрятано в абзаце про Workflow. Кроме того, C7 обязывает сообщать о *каждом* завершении — источник лишних сообщений даже при правильном пересказе. Это объяснение вероятно, но не доказывает механизм конкретной утечки.

**Доказано.** Ни одна из двух страниц не задаёт язык пользовательской прозы, перевод терминов или передачу языка в задания агентам. Русские примеры активации навыка этого не заменяют.

**Доказано — масштаб терминологии.** Подсчёт по двум страницам, включая `seat/seats/Seat` и притяжательные формы:

| Употребление | orchestrate | codex-delegate | Всего |
|---|---:|---:|---:|
| Обычное слово в прозе | 74 | 40 | **114** |
| Буквальное `SEAT:` | 3 | 7 | **10** |

Из подсчёта прозы исключены `<seat>`, `--seat-file`, `codex-seat`, `--allow-seat-verify`; с ними получается 118 совпадений. Есть ещё одно протокольное `SEAT` без двоеточия. Проза занимает **89 строк** двух страниц.

**Доказано.** `SEAT:` — реальный интерфейс: [driver:183](/Users/ruliny/Git/codex-delegate/skills/codex-delegate/scripts/driver.mjs:183) объявляет поле, [driver:612](/Users/ruliny/Git/codex-delegate/skills/codex-delegate/scripts/driver.mjs:612) разбирает права, строки 639–645 проверяют порядок и значение по умолчанию. Его переименование затрагивает совместимость и тесты, включая `agent-contract` «SEAT is first…» ([строка 220](/Users/ruliny/Git/codex-delegate/evals/agent-contract.test.mjs:220)); замена обычного слова этого не требует.

**Доказано — baseline.** Запущены `node evals/orchestrate.test.mjs`: **45 passed**, и `node evals/agent-contract.test.mjs`: **11 passed**. Они не доказывают качество чата: `says()` проверяет наличие строки ([eval:27](/Users/ruliny/Git/codex-delegate/evals/orchestrate.test.mjs:27)). Orchestrate уже занимает **150 из разрешённых 150 строк**; также допускаются только заголовки `##`, запрещены fenced-блоки ([eval:55](/Users/ruliny/Git/codex-delegate/evals/orchestrate.test.mjs:55)). Проверка чтения дополнительно требует больше 100 строк.

**Доказано — скрытая стоимость.** [orchestrate-live:418](/Users/ruliny/Git/codex-delegate/evals/orchestrate-live.test.mjs:418) тоже требует каталог запуска в пользовательском плане; это общий код случаев **1, 2, 5**. Его языковые эвристики распознают английские числительные, названия этапов и последовательность ([строка 433](/Users/ruliny/Git/codex-delegate/evals/orchestrate-live.test.mjs:433)). Проверки утечки пяти полей там нет.

**3. Варианты исправления**

**Гипотеза — оценки объёма, не готовый diff.** В обоих вариантах сохранить согласование записи/сети, атрибуцию выводов, внутреннюю схему отчёта и протокол `SEAT:`.

| Вариант | Конкретное изменение | Цена |
|---|---|---|
| **А. Исправить пользовательскую подачу** | План: результат, этапы, исполнители и необходимые разрешения обычными словами. Каталог и стандартные лимиты оставить внутренними. Явно задать язык пользователя и слово «агент»/название модели. Разделить внутренний отчёт и пересказ; сообщать существенный результат, блокировку или необходимость решения. | **5 файлов:** две страницы и три eval-серии. Около **25–40 строк инструкций**, **80–140 строк тестов**. Пересмотреть **C2, C6, C7, F1, F5, G4**, добавить проверки языка/адресата в `agent-contract`; изменить live **1, 2, 5**, добавить русский сценарий публикации результатов. |
| **Б. То же плюс убрать `seat` из всей прозы** | Вдобавок заменить все 114 обычных употреблений на `agent`, сохранив идентификаторы. | Те же **5 файлов**, примерно **100–120 строк страниц**, **130–200 строк тестов**. Около **30 случаев orchestrate**, **5 существующих agent-contract**, плюс проверки и live-случаи варианта А. |

**Гипотеза — рекомендация:** вариант **А** имеет лучшее соотношение результата и объёма: он меняет все три наблюдаемые формы общения и добавляет проверку поведения. Простое глобальное переименование не устраняет технический план и утечку отчётов. Протокольное переименование `SEAT:` для этих жалоб не требуется.

**4. Что не проверено**

**Не установлено:** отчёт вставил координатор или его автоматически показал интерфейс Claude Code; стенограмму проблемного запуска я не читал. Поэтому конкретную причину обхода запрета называю гипотезой. Live-сессии не запускал; эффективность предложенных изменений не проверена. Точный идентификатор моей модели сверх указанного в системных инструкциях GPT-6 недоступен.

**Доказано:** файлы репозитория не изменены; заключительный `git status --short` пуст.