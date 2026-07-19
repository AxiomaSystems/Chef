# Kamayuq extraction dossier

> Monografía técnica sobre el sistema de recuperación de Preppie y su posible
> extracción futura. Estado de referencia: implementación mergeada en `main` el
> 19 de julio de 2026. Este documento describe primero el comportamiento real;
> las secciones 13 y 14 introducen una arquitectura pública propuesta que aún no
> existe.

## Convenciones de lectura

- **Actual** significa que el comportamiento existe en el código mergeado.
- **Verificado** significa que existe evidencia ejecutada, no solo código o una
  prueba con mocks.
- **Limitación** señala una garantía ausente o más débil de lo que podría sugerir
  el término “backup”.
- **Propuesta** significa diseño para Kamayuq/Khipu Engine; no describe la API
  actual ni autoriza su implementación.
- Se omiten secretos, URLs alojadas, IDs de proveedores, nombres concretos de
  bases alojadas y conteos de datos de usuarios.

## 1. Executive summary

### Problema operacional original

Preppie tenía una base PostgreSQL primaria alojada en Supabase, despliegues de
API en Railway y migraciones Prisma aplicadas durante el proceso de release.
Revertir un contenedor no revierte una migración, y el plan activo no ofrecía
una garantía suficiente de backups administrados o point-in-time recovery. El
riesgo real no era “perder un archivo de dump”; era avanzar producción a un
estado del que el equipo no supiera volver dentro de un RPO/RTO explícito.

El objetivo se convirtió en demostrar una cadena completa:

1. leer producción sin modificarla;
2. obtener una vista consistente;
3. producir un archive PostgreSQL;
4. restaurarlo en un servidor independiente;
5. probar que la copia representa el historial activo y los invariantes
   críticos de la aplicación;
6. conservar copias verificadas sin borrar la última buena;
7. dejar evidencia y estados auditables incluso cuando algo falla;
8. ensayar la cadena contra infraestructura alojada.

### Por qué un backup ordinario no bastaba

Un `pg_dump` con exit code `0` solo demuestra que el cliente terminó de generar
un archivo. No demuestra que:

- el archive pueda ser leído por `pg_restore`;
- el restore se haya dirigido a una base real en vez de generar SQL a stdout;
- el destino acepte extensiones, ownership, ACLs y objetos del origen;
- la historia de migraciones restaurada sea completa y no divergente;
- las tablas que usa Preppie sean las tablas que se verificaron;
- los datos críticos tengan paridad mínima;
- exista una copia previa utilizable si la nueva falla;
- el operador pueda hacer cutover y volver atrás dentro del RTO.

Los unit tests verdes tampoco bastaban. Los primeros tests mockeaban el proceso
PostgreSQL y verificaban argumentos incompletos; por eso podían aprobar mientras
`pg_restore` no escribía en ninguna base. Solo el rehearsal Docker y luego el
rehearsal cross-provider revelaron incompatibilidades de versión, errores de
invocación, conflictos con `public`, modelos equivocados y falsos negativos en
el ledger Prisma.

### Garantía que sí ofrece el worker actual

En una ejecución exitosa y bajo sus supuestos de configuración, el worker:

- impide dos ejecuciones cooperativas simultáneas mediante un advisory lock;
- crea un destino nuevo con nombre restringido;
- exporta un snapshot `REPEATABLE READ READ ONLY` y usa ese mismo snapshot para
  el dump y para las mediciones de origen;
- genera un archive custom del schema `public` y la extensión `pg_trgm`;
- restaura el archive en PostgreSQL independiente con error inmediato;
- compara el historial Prisma activo por nombre y checksum;
- exige tablas físicas concretas y paridad exacta de tres conteos críticos;
- marca la copia `verified` solo mediante transición confirmada desde `pending`;
- conserva, por metadata, al menos las dos copias normales verificadas más
  recientes;
- deja intentos creados pero inválidos en cuarentena;
- limita el run a dos intentos y un presupuesto total de treinta minutos;
- emite únicamente campos de metadata permitidos y redacciona URLs en stderr.

La cadena anterior fue verificada en Docker local y en un restore alojado desde
el proveedor primario hacia un PostgreSQL independiente. El rehearsal alojado
verificó la paridad completa del historial activo, completó dentro de unos 144
segundos y eliminó el destino temporal mediante el guard exacto después de
persistir la evidencia.

### Lo que no garantiza

El sistema actual no garantiza:

- point-in-time recovery ni snapshots nativos del proveedor;
- almacenamiento inmutable, off-account u off-region del archive;
- conservación del archivo: el dump temporal se elimina al terminar;
- restore de roles, grants, schemas administrados, Supabase Auth, Storage,
  Realtime u otros recursos externos;
- validación exhaustiva de constraints, índices, triggers, funciones o
  semántica de cada fila;
- una consulta de dominio mediante Prisma dentro del worker, aunque el runbook
  original la menciona;
- que cada copia previamente marcada `verified` siga físicamente disponible;
- un cutover completo de producción ensayado, rollback de aplicación ensayado o
  medición real de RTO extremo a extremo;
- alertas automáticas sobre antigüedad de la última copia;
- una máquina de estados reforzada por `CHECK`/enum en PostgreSQL;
- compatibilidad genérica con migradores distintos de Prisma;
- que el backup sobreviva a pérdida total de la cuenta o proyecto Railway.

## 2. Current system topology

### Flujo desplegado

```mermaid
flowchart LR
    Cron["Railway cron<br/>02:00 y 14:00 UTC"] --> Worker["Railway database-backup<br/>Node 22 + pg client + PostgreSQL 18 tools"]
    ApiRef["Referencia de servicio API<br/>SUPABASE_DIRECT_URL + sslmode=require"] --> Worker
    PgRef["Referencia de servicio Postgres<br/>DATABASE_URL + sslmode=require"] --> Worker

    Source["Supabase PostgreSQL 17<br/>fuente primaria, solo lectura"] -->|"BEGIN REPEATABLE READ READ ONLY<br/>pg_export_snapshot"| Worker
    Worker -->|"pg_dump custom<br/>public + pg_trgm"| Temp["Filesystem efímero<br/>archive .dump"]
    Temp -->|"pg_restore --dbname<br/>--clean --if-exists"| Recovery["Railway PostgreSQL 18<br/>destino de recuperación aislado"]

    Recovery --> Ledger["preppie_backup_recovery_metadata<br/>ledger operacional"]
    Worker -->|"migraciones, tablas, conteos, tamaño"| Ledger
    Worker -->|"JSON allowlisted"| Logs["Logs/metadata de Railway"]
    Ledger --> Retention["Retención<br/>mantener dos verified normales"]
    Retention -->|"verified -> deleting -> DROP -> deleted"| Recovery

    Rehearsal["PowerShell rehearsal runner"] -->|"Docker, inspect, evidence, cleanup"| Worker
    Rehearsal --> Evidence["JSON de evidencia allowlisted"]
    Rehearsal -->|"solo nombres rehearsal exactos"| Recovery
```

### Componentes y responsabilidades actuales

| Componente | Comportamiento actual |
| --- | --- |
| Fuente PostgreSQL | Supabase PostgreSQL observado en major 17. El worker usa la conexión directa, inicia una transacción read-only repetible y no ejecuta DDL/DML sobre el origen. |
| Worker | Servicio Railway separado construido con `Dockerfile.database-backup`. No expone HTTP ni healthcheck; termina después de una ejecución. |
| Destino | PostgreSQL Railway observado en major 18, independiente de la base usada por la aplicación. Aloja las bases `preppie_recovery_*` y el ledger. |
| Cron | `railway.backup.json` programa `0 2,14 * * *`, con `restartPolicyType: NEVER`. El advisory lock sigue siendo necesario porque el scheduler no es la única forma posible de iniciar el proceso. |
| Ledger | `preppie_backup_recovery_metadata`, creada idempotentemente en la base admin de recovery. Registra run, intento, estado, tiempos, migraciones, conteos, tamaño y categoría de error. No contiene un `CHECK` de estados ni foreign keys. |
| Configuración | Railway resuelve referencias entre servicios; el repo no copia el valor de las credenciales. Se añade `sslmode=require` a ambas referencias. |
| Dump | `pg_dump --format=custom --schema=public --extension=pg_trgm --no-owner --no-acl --snapshot=... --file ...`. |
| Restore | Base nueva, luego `pg_restore --clean --if-exists --exit-on-error --no-owner --no-acl --dbname=<target> <archive>`. |
| Verificación | Historial Prisma activo por nombre/checksum, presencia de tablas, paridad exacta de conteos y tamaño de base. |
| Retención | Selecciona solo copias normales `verified`, excluye rehearsals, conserva dos por `verified_at` y borra las más antiguas mediante transición previa a `deleting`. |
| Cuarentena | Una base creada cuyo intento no llegó a `verified` permanece físicamente y se marca `quarantined`; no participa en retención automática. |
| Cleanup de rehearsal | Solo acepta el par exacto attempt-one/attempt-two derivado de un `runId` de rehearsal. Persiste evidencia antes del primer drop. |

No existe un archivo de dump duradero. El archive vive en un directorio temporal
del contenedor y se elimina en `finally`, incluso tras error. La copia durable es
la base restaurada, no el archive.

## 3. Lifecycle and state machine

### Estados persistentes

El ledger usa texto libre; los estados válidos emergen del código, no de una
restricción SQL:

- `pending`: fila creada antes de `CREATE DATABASE`;
- `verified`: restore y validaciones aprobadas, con metadata completa;
- `failed_not_created`: se insertó ledger pero `CREATE DATABASE` falló;
- `quarantined`: la base fue creada pero el intento no pudo verificarse;
- `deleting`: propiedad de borrado adquirida mediante actualización
  condicional antes del `DROP DATABASE`;
- `deleted`: terminal lógico después del drop.

`failed` no es un estado persistente del ledger actual. Es un estado transitorio
de proceso/log/evidencia. `passed` pertenece a la evidencia de rehearsal y
`skipped` al resultado idempotente de cleanup.

```mermaid
stateDiagram-v2
    [*] --> Pending: INSERT ledger
    Pending --> Verified: restore + parity + UPDATE WHERE pending confirmado
    Pending --> FailedNotCreated: CREATE DATABASE falla + transición confirmada
    Pending --> Quarantined: target creado + intento falla + transición confirmada

    Verified --> Deleting: retención selecciona copia expirada y confirma ownership
    Verified --> Deleting: cleanup de rehearsal exacto y confirmado
    Quarantined --> Deleting: cleanup de rehearsal exacto y confirmado
    Deleting --> Deleted: DROP DATABASE + actualización de ledger

    FailedNotCreated --> [*]
    Deleted --> [*]

    note right of Pending
      Si attempt 1 falla, el retry crea
      otra fila y otro nombre para attempt 2.
    end note

    note right of Quarantined
      No hay borrado automático.
      Conserva evidencia diagnóstica.
    end note

    note right of Deleting
      Si DROP o el update final falla,
      puede quedar auditable en deleting.
    end note
```

### Matriz de transiciones

| Transición | Precondiciones | Mutación | Confirmación requerida | Fallos y cleanup | Retry |
| --- | --- | --- | --- | --- | --- |
| ausencia → `pending` | Config válida, lock adquirido, deadline positivo, nombre seguro | `INSERT` con run/attempt/start | El `INSERT` debe resolver; no se inspecciona `rowCount` porque una colisión produce error por PK | Si falla, no hay base ni estado nuevo; el intento falla | Sí, si queda presupuesto; usa nombre de attempt siguiente |
| `pending` → `failed_not_created` | Fila insertada; `CREATE DATABASE` no confirmó éxito | `UPDATE ... WHERE status='pending' RETURNING` | Exactamente una fila por `rowCount` o `rows.length` | Si la transición falla, se emite warning veraz; no se afirma el estado | Sí |
| `pending` → `quarantined` | Base creada; cualquier paso posterior falla antes de verificar | `UPDATE` con tiempos y `error_category` | Exactamente una fila | La base no se borra; si falla la transición, warning `quarantine_failed` | Sí; nuevo target |
| `pending` → `verified` | Dump/restore completados, clientes cerrados, migraciones/tablas/conteos/tamaño válidos | `UPDATE ... WHERE status='pending' RETURNING` | Exactamente una fila antes de loguear éxito | Si no confirma, el target se cuarentena y se intenta otra copia | Sí |
| `verified` → `deleting` por retención | Más de dos copias normales verificadas; nombre seguro; no rehearsal | `UPDATE ... WHERE status='verified' RETURNING` | Exactamente una fila antes del drop | Si falla, retención se difiere, el backup nuevo sigue verificado y no hay drop | No dentro de esa ejecución |
| `verified`/`quarantined` → `deleting` por rehearsal | Target exacto a1/a2; runId idéntico; estado permitido | `UPDATE ... WHERE database_name, run_id, status RETURNING` | Exactamente una fila | Si no confirma, no hay drop | Reintento manual idempotente |
| `deleting` → `deleted` por retención | Ownership de borrado previamente confirmado | `DROP DATABASE`; después `UPDATE status='deleted'` | **Limitación:** el update final de retención no confirma `rowCount` ni exige `status='deleting'` | Si drop/update falla, warning de retención; puede quedar `deleting` | Próximo run/operación manual, no automático específico |
| `deleting` → `deleted` por rehearsal | Target exacto y drop exitoso | `UPDATE ... WHERE status='deleting' RETURNING` | Exactamente una fila | Un fallo se propaga; el destino puede ya no existir pero el ledger quedar `deleting` | Requiere reconciliación manual |
| terminal → `skipped` | Cleanup ve ausencia, `deleted` o `failed_not_created` | Ninguna | Lectura del ledger | Idempotente | No necesario |

### Estados transitorios del proceso

- `locked=false`: otro worker cooperativo tiene el advisory lock; termina sin
  crear ledger ni destino.
- `sourceTransaction=true`: obliga a intentar `ROLLBACK` antes de cerrar source.
- `created=true`: decide entre cuarentena y `failed_not_created`.
- `verified=true`: impide degradar una copia ya verificada a cuarentena.
- `primaryError`: conserva la causa primaria cuando rollback, close, temp cleanup,
  unlock o logging también fallan.
- `status=passed|failed` en el wrapper: controla evidencia y permite cleanup solo
  después de un rehearsal aprobado.

## 4. Exact execution algorithm

### Pseudocódigo fiel al comportamiento actual

```text
function runBackupWorker(env, injectedDependencies):
    config = loadBackupConfiguration(env)
        require SOURCE_DATABASE_URL and RECOVERY_ADMIN_DATABASE_URL
        parse each as postgres/postgresql URL
        require host, database, user, password
        require sslmode in {disable, require}
        reject verify-ca, verify-full and sslrootcert
        require valid port
        if host + port + database are equal: fail closed
        validate optional BACKUP_RUN_ID against lowercase safe pattern

    runtime = merge(defaultRuntimeDependencies, injectedDependencies)
    runId = configured runId OR timestamp + random suffix
    deadlineAt = now + 30 minutes
    admin = client(recovery admin database)
    locked = false
    primaryError = none

    try:
        connect admin
        locked = SELECT pg_try_advisory_lock(fixed bigint)
        if not locked: fail "already running"

        CREATE TABLE IF NOT EXISTS recovery ledger

        for attempt in [1, 2]:
            if now >= deadlineAt: fail deadline
            try:
                return oneAttempt(...)
            catch:
                discard attempt error at loop boundary
                # detailed state/logs were handled inside oneAttempt

        fail "could not be verified after two attempts"
    catch error:
        primaryError = error
        rethrow
    finally:
        sequentially:
            if locked: advisory_unlock
            admin.end
        if cleanup fails and no primary error: surface cleanup failure
        if cleanup fails with primary error: log best-effort warning, preserve primary


function oneAttempt(config, runId, attempt, admin, runtime, deadlineAt):
    started = now
    databaseName = safe deterministic/generative name for this attempt
    attemptDeadline = min(global deadline, started + 15 minutes)

    remaining():
        budget = attemptDeadline - now
        if budget <= 0: fail before side effect
        return budget

    flags = {
        source: none,
        restored: none,
        directory: none,
        sourceTransaction: false,
        created: false,
        metadataInserted: false,
        verified: false,
        primaryError: none
    }

    try:
        remaining()
        INSERT ledger(databaseName, runId, attempt, status=pending)
        metadataInserted = true

        CREATE DATABASE quoteSafe(databaseName)
        created = true

        directory = createTempDirectory()
        source = connect(config.source)

        BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY
        sourceTransaction = true
        snapshotId = SELECT pg_export_snapshot()
        sourceValidation = sequentially query:
            active/all Prisma ledger rows
            public base-table names
            counts for User, BaseRecipe, ShoppingCart

        dumpPath = temp path derived from safe databaseName
        spawn pg_dump with:
            stdin ignored, stdout ignored, stderr captured
            credentials only in PG* environment
            custom format
            public schema + pg_trgm extension
            no owner, no ACL
            exported snapshot
            explicit output file
            timeout = remaining()

        COMMIT source transaction
        sourceTransaction = false

        restored = connect(recovery config with database=databaseName)
        spawn pg_restore with:
            clean + if-exists
            exit-on-error
            no owner, no ACL
            explicit --dbname=databaseName
            archive as positional input
            timeout = remaining()

        restoredValidation = query same migrations/tables/counts
        migrationCount = compare active Prisma histories exactly by ordered name/checksum
        tableCounts = require critical tables and exact count parity
        # no additional Prisma/domain query or configurable SQL invariant runs

        close restored, then source; surface close errors because no primary error exists
        query pg_database_size(databaseName) through admin

        UPDATE pending -> verified with verification metadata RETURNING database_name
        require exactly one transitioned row
        verified = true
        bestEffortAllowlistedLog(backup_verified)

        bestEffortRetention():
            query verified metadata
            select normal safe names, exclude rehearsals
            sort by verifiedAt descending; keep two
            for each expired:
                conditional verified -> deleting, confirm one row
                DROP DATABASE quoted exact name
                UPDATE -> deleted
            on any retention error:
                log retention_deferred
                do not invalidate newly verified backup

        return verified result

    catch error:
        primaryError = error
        duration = now - started

        if not verified and created:
            try conditional pending -> quarantined and confirm one row
            log quarantined only after confirmation
            otherwise log quarantine_failed warning
        else if not verified and metadataInserted:
            try conditional pending -> failed_not_created and confirm one row
            log failed_not_created only after confirmation
            otherwise log transition warning

        rethrow

    finally:
        sequentially attempt all applicable cleanup:
            ROLLBACK if source transaction remains open
            close restored
            close source
            recursively remove temp directory
        if cleanup fails while primary exists:
            emit best-effort warning; preserve primary
        if cleanup fails without primary:
            surface cleanup error


function subprocess timeout:
    at timeout: send SIGTERM
    after 5 seconds: send SIGKILL
    reject as timed out even if close code is null
```

### Matices importantes

- El snapshot exportado solo es importable mientras la transacción exportadora
  siga abierta. Por eso `COMMIT` ocurre después de `pg_dump`, no después de las
  consultas de validación.
- El archive no pasa por un `pg_restore --list` separado; su prueba de integridad
  práctica es que el restore completo termine.
- El cliente `restored` se conecta antes de lanzar `pg_restore`, pero la escritura
  la realiza el subproceso libpq, no ese cliente Node.
- El loop externo oculta el error específico de cada intento y finalmente emite
  un error agregado. El diagnóstico detallado depende del ledger y los eventos.
- Logging es best-effort; nunca debe reemplazar un resultado verificado ni la
  causa primaria.
- El presupuesto de treinta minutos no es un hard wall perfecto: `remaining()`
  limita los subprocesos y evita comenzar un intento sin tiempo, pero las queries
  Node no configuran aquí `statement_timeout`. Una query PostgreSQL colgada puede
  exceder el deadline nominal hasta que la plataforma termine el proceso.

## 5. Module inventory

| Ruta | Símbolos/exportaciones | Responsabilidad y side effects | Dependencias | Cobertura | Genericidad y recomendación de extracción |
| --- | --- | --- | --- | --- | --- |
| `apps/database-backup/src/backup-contract.mjs` | `BACKUP_ADVISORY_LOCK_KEY`, `timestampSegment`, `createRecoveryDatabaseName`, `quoteRecoveryIdentifier`, `loadBackupConfiguration`, `postgresChildEnvironment`, `redactUrlLikeContent`, `validateMigrationParity`, `normalizedCount`, `validateCriticalTablesAndCounts`, `selectExpiredRecoveryDatabases` | Contratos puros salvo generación UUID/fecha recibida. Valida URLs, nombres, Prisma, conteos y retención. | Node `crypto`, WHATWG `URL` | `backup.test.mjs` | Mixto. Nombres, tablas y Prisma son Preppie-specific; parsing, quoting, redacción y selección de retención son adaptables. Reescribir como contratos tipados de Khipu. |
| `apps/database-backup/src/backup-orchestrator.mjs` | `runBackupWorker` | Orquesta conexiones, ledger, lock, dump, restore, validación, estados, retención y cleanup. Ejecuta DDL/DROP en recovery. | `backup-contract`, `pg-runtime`, PostgreSQL | `backup.test.mjs`; rehearsals | Esqueleto reusable con fuerte acoplamiento SQL/Prisma/Preppie. Adaptar por puertos; no copiar como monolito. |
| `apps/database-backup/src/pg-runtime.mjs` | `createProcessRunner`, `createRuntimeDependencies` | Spawn de herramientas, temp dirs, carga dinámica de `pg`, logging. Mata procesos por timeout y borra filesystem temporal. | Node fs/os/path/child_process, `pg` | `pg-runtime.test.mjs`, `backup.test.mjs` | Mayormente genérico. Copiable solo tras resolver licencia; ideal separar process adapter y PostgreSQL adapter. |
| `apps/database-backup/src/rehearsal-contract.mjs` | `resolveRehearsalTarget`, `quoteResolvedRehearsalIdentifier`, `parseIsolatedHttpsOrigin`, `createRehearsalEvidence` | Guards exactos de rehearsal y sanitización de evidencia. Sin I/O. | `backup-contract` | `rehearsal-contract.test.mjs` | Patrón reusable; prefijos, stages y tablas son Preppie-specific. Adaptar por policy/config. |
| `apps/database-backup/src/backup.mjs` | Reexporta contratos, rehearsal, `runBackupWorker`, `createRuntimeDependencies` | Barrel público interno. Sin side effects propios. | Módulos anteriores | Indirecta | Reemplazar por exports explícitos de paquetes Khipu. |
| `apps/database-backup/src/index.mjs` | Ninguno | Entrypoint: ejecuta worker, redacciona error y fija exit `0/1`. | `backup.mjs`, `process` | Indirecta/Docker | Genérico en forma, pero debería ser CLI formal en Kamayuq. |
| `apps/database-backup/package.json` | Package `database-backup` | Declara ESM, `pg@^8.16.3`, start/test; el lockfile resuelve `pg@8.22.0`. | pnpm workspace | Install/build | Reescribir nombre, metadata, exports, engines y licencia para Kamayuq. |
| `Dockerfile.database-backup` | Imagen/entrypoint | Build multistage, instala PostgreSQL 18 client, copia enlaces pnpm, corre como `node`. | `node:22-alpine`, Alpine `postgresql18-client`, pnpm | Docker + hosted rehearsal | Buena referencia operacional. Adaptar a imagen versionada y SBOM; no heredar nombre Preppie. |
| `railway.backup.json` | `build`, `deploy` | Selecciona Dockerfile, cron dos veces al día, restart `NEVER`. | Railway Config as Code | Deployment Railway verde | Adaptador Railway, no core. Copiar como ejemplo parametrizado. |
| `Dockerfile`, `railway.json` | Config API | Construye/lanza API y define su pre-deploy/readiness. Puede ejecutar migraciones fuera del worker. | Node, pnpm, Prisma, Railway | API baseline, boundary test, production smoke | Preppie-specific. Conservar únicamente como evidencia de que el adapter backup debe aislarse del deploy de aplicación. |
| `apps/vision-lab/Dockerfile`, `railway.vision.json` | Config Vision | Construye el servicio Python/Vision sin heredar comandos Node/Prisma/TypeScript del API. | Python, Railway | Vision baseline, boundary test, production smoke | No pertenece a Kamayuq; el test negativo de aislamiento sí es un patrón reusable. |
| `scripts/recovery-rehearsal-db.mjs` | CLI interno `resolve`, `origin-env`, `evidence-env`, `inspect`, `cleanup` | Lee source/target/ledger, compara evidencia y puede hacer `DROP DATABASE` de rehearsal exacto. | Worker modules, `pg` | `rehearse-database-recovery.test.mjs`, contract tests, rehearsals | Herramienta interna acoplada. Separar comandos genéricos de policies Preppie. |
| `scripts/rehearse-database-recovery.ps1` | Script PowerShell | Lanza Docker por nombres de env, filtra evento, inspecciona, persiste evidencia antes de cleanup y restaura env previo. | Docker, PowerShell, helper Node | Seis tests de estructura/ejecución; local/hosted rehearsal | Provider/operator wrapper. Reescribir como CLI portable; conservar ordering de evidencia. |
| `apps/database-backup/test/backup.test.mjs` | 21 tests Node | Mocks del state machine, contratos, retry, cleanup y retención. Sin PostgreSQL real. | `node:test` | Unit | Casos de fallo son material principal reusable; fixtures/nombres deben generalizarse. |
| `apps/database-backup/test/pg-runtime.test.mjs` | 3 tests Node | Spawn success/error/redaction y TERM→KILL. | `node:test`, EventEmitter | Unit | Reusable casi directo tras limpieza legal/API. |
| `apps/database-backup/test/rehearsal-contract.test.mjs` | 6 tests Node | Targets exactos, origins, evidencia allowlisted y retry target. | `node:test` | Unit | Adaptar policies. |
| `scripts/rehearse-database-recovery.test.mjs` | 6 tests Node | Inspección estática del wrapper y dos pruebas PowerShell sobre evidencia fallida. | Node child_process/fs | Repo test | Reescribir como tests CLI black-box multiplataforma. |
| `apps/api/prisma/migrations/20260717170000_add_database_release_compatibility/migration.sql` | Tabla/registro singleton `DatabaseReleaseCompatibility` | Persiste piso mínimo de compatibilidad API; muta schema productivo durante deploy, no pertenece al ledger de backup. | PostgreSQL, Prisma migration | API unit/E2E/readiness | Preppie-specific. No debe entrar a Khipu; Kamayuq puede documentar el patrón. |
| `apps/api/src/database-schema-readiness.ts` | Tipos `PackagedMigration`, `AppliedMigration`, `SchemaCompatibilityStatus`; funciones `isMigrationVersionName`, `getMigrationDirectoryCandidates`, `getExpectedMigrationVersion`, `getPackagedMigrations`, `evaluateSchemaCompatibility`, `getKnownActiveProductionMigrationFingerprints` | Lee migrations empacadas y evalúa `ready/ahead_compatible/behind/divergent/failed/incompatible`. | Node fs/crypto, fingerprint ledger | Specs + API E2E | Adaptador Prisma/release, no recovery engine. Extraer ideas, no acoplar al core. |
| `apps/api/src/database-migration-fingerprint-ledger.v1.ts` | `MigrationFingerprint`, `KNOWN_ACTIVE_PRODUCTION_MIGRATION_FINGERPRINTS_V1` | Allowlist versionada de checksums históricos distintos al repo actual. | Ninguna | Readiness specs | Datos internos de Preppie. **No publicar**; diseñar una interfaz para ledger externo. |
| `apps/api/src/app.service.ts` | `AppService` | `/ready` consulta migraciones y piso compatible; expone metadata de release/schema. | NestJS, Prisma | `app.service.spec.ts`, E2E | Integración Preppie; Kamayuq solo necesita un ejemplo de readiness. |
| `scripts/check-railway-migration-boundary.test.mjs` | 3 tests repo | Impide migraciones en startup y evita que Vision herede config API. Lee Dockerfiles/configs. | Node fs/path/test | `test:repo` | Patrón de deploy safety adaptable; nombres/preDeploy son internos. |
| `docs/database-recovery.md` | Runbook | Política expand-contract, RPO/RTO, rollback, cutover, rehearsal y evidencia. | Proceso humano | Revisión/manual | Fuente conceptual; reescribir para público y retirar IDs/datos internos. |
| `docs/deployment-environments.md` | Runbook | Config paths e aislamiento Railway/Vercel. | Railway/Vercel | Smokes/manual | Adaptador/proceso interno; solo ejemplos sanitizados. |
| `docs/supabase-database.md` | Runbook | URLs, caracteres especiales, Free plan, RLS y ownership de schema. | Supabase/Prisma | Manual | Adaptador Supabase; sanitizar y actualizar antes de publicar. |
| `.github/workflows/api-baseline.yml` | Job `api-baseline` | PostgreSQL 16 CI para API/migraciones/E2E. No ejecuta tests del backup worker. | GitHub Actions, pnpm, Prisma | CI API | No es CI de Khipu. Crear workflow dedicado en el repo público. |
| `.github/workflows/web-baseline.yml`, `.github/workflows/vision-baseline.yml`, `.github/workflows/commitlint.yml` | Jobs web/Vision/commits | Validan consumidores y disciplina del repo, no la recovery chain. | GitHub Actions, pnpm/Python/git | CI del PR final | Preppie-specific; Kamayuq debe definir gates propios y conservar commit lint solo si adopta esa convención. |
| `package.json`, `CONTRIBUTING.md` | Scripts/documentación | `pnpm test` incluye `database-backup`; `typecheck` lo excluye por ser JS-only. | pnpm | Local `verify` | Integración monorepo; reemplazar por scripts propios de Kamayuq. |

## 6. Security and destructive-operation model

### Invariantes de seguridad actuales

| Invariante | Implementación | Catástrofe que previene | Límite conocido |
| --- | --- | --- | --- |
| Prefijo único de recovery | Solo `^preppie_recovery_[a-z0-9_]+$`, máximo 63 bytes/caracteres aceptados por el contrato | Inyección de identificadores o drop de `postgres`, producción, staging u otra base arbitraria | El prefijo sigue siendo global al proyecto y no incorpora tenant/owner criptográfico |
| Rehearsal exacto | Solo `^preppie_recovery_(rehearsal_[a-z0-9_]+)_a1$`; a2 se deriva, no se acepta libremente | Usar el script de ensayo como `DROP DATABASE` genérico | Depende de que el runId no sea reutilizado de manera ambigua |
| Quoting posterior a validación | `quoteRecoveryIdentifier` añade comillas únicamente después del regex | SQL injection por nombre construido | No reemplaza parámetros para DDL; la seguridad depende del guard previo |
| Separación source/recovery | Rechaza mismo host+port+database | Restaurar o limpiar sobre la base fuente exacta | Dos nombres distintos en el mismo cluster no se rechazan; el aislamiento fuerte depende de configuración/proveedor |
| Source read-only | `BEGIN ... REPEATABLE READ READ ONLY`; `pg_dump` | DML/DDL accidental del worker sobre producción | La credencial debería ser least-privilege; el código no audita grants efectivos |
| Destino siempre nuevo | Nombre con timestamp/run/sufijo e intentos a1/a2; `CREATE DATABASE` antes del restore | Sobrescribir una copia conocida o una base runtime | Colisión produce error; no existe reserva fuera de la PK/DDL |
| Ownership antes del drop | `verified -> deleting` o `verified/quarantined -> deleting` con `WHERE status=... RETURNING` confirmado | Carrera entre retención, cleanup y otro operador; borrar una copia que cambió de estado | El update final de retención a `deleted` es menos estricto que el del rehearsal |
| Keep count mínimo | `selectExpiredRecoveryDatabases(..., 2)` rechaza valores menores a dos | Borrar la última o penúltima copia normal verificada | Confía en metadata; no comprueba que las dos conservadas existan y conecten |
| Rehearsals excluidos de retención normal | Regex específico | Que un ensayo altere el conjunto durable de backups normales | Las cuarentenas pueden acumular capacidad |
| Transición verificada | `pending -> verified` exige una fila retornada | Emitir falso éxito si el ledger fue modificado concurrentemente | La tabla no tiene constraint de estados; SQL externo aún puede corromperla |
| Credenciales por environment | `PGPASSWORD`/`PG*`; nunca argumentos CLI; Docker recibe nombres `--env`, no valores | Exposición en argv, historial de shell o evidencia | El environment del proceso sigue siendo sensible y accesible a procesos con privilegios suficientes |
| Redacción de errores | URLs PostgreSQL/HTTP se reemplazan por `[REDACTED_URL]`; output final del entrypoint también pasa por redacción | Filtrar password cuando libpq imprime una URL completa | No es un secret scanner general; tokens sin forma de URL podrían escapar |
| Output allowlisted | `LOG_FIELDS` y `createRehearsalEvidence` reconstruyen objetos permitidos | Propagar objetos de error, env o filas a logs/evidencia | `databaseName`, migración y conteos siguen siendo metadata potencialmente sensible |
| TLS obligatorio por contrato desplegado | URLs deben declarar `sslmode`; producción usa `require`; `PGSSLMODE` se pasa a libpq | Conexiones silenciosamente plaintext sobre red pública | Node `pg` usa `rejectUnauthorized:false`; no se valida identidad del servidor/CA |
| Timeout de subproceso | Presupuesto restante; SIGTERM y después SIGKILL a 5 s | Worker colgado consumiendo toda la ventana o manteniendo snapshot/lock indefinidamente | Queries SQL dependen de timeouts del cliente; el proceso padre también depende del scheduler/runtime |
| Advisory lock | `pg_try_advisory_lock` con bigint fijo en recovery admin | Dos workers cooperativos compitiendo por retención/nombres/ledger | No bloquea herramientas externas que ignoren el lock ni protege otros proyectos que reutilicen llave y DB admin |
| Cleanup ordenado | ROLLBACK → close restored → close source → borrar temp; unlock → close admin | Dejar snapshot/lock/conexiones antes de limpiar filesystem o perder causa primaria | Un crash duro/SIGKILL del contenedor depende de PostgreSQL/OS para liberar sesión y temp storage efímero |
| Logging best-effort | `try/catch`; promesas de logger rechazadas se ignoran | Que observabilidad caída convierta un backup válido en fallo o tape el error primario | Puede perderse evidencia de warning; el ledger es la fuente durable principal |
| Evidencia antes de drop | Wrapper escribe JSON sanitizado antes de entrar al bloque `Cleanup` | Eliminar el único objeto verificable antes de registrar resultado | El archivo de evidencia no es inmutable ni remoto por defecto |

### Reglas destructivas concretas

1. Ningún path acepta un nombre libre y luego lo quotea: primero valida, después
   quotea.
2. La retención solo consulta filas `status='verified'`, filtra el prefijo y
   excluye rehearsals.
3. Un drop de retención requiere haber cambiado esa misma fila desde `verified`
   a `deleting` y haber recibido exactamente una confirmación.
4. El helper de rehearsal requiere simultáneamente nombre exacto, runId exacto,
   estado permitido y transición confirmada.
5. Un fallo parcial no activa borrado automático. Se sobre-retiene y se alerta,
   que es el modo seguro.
6. `failed_not_created` nunca intenta drop porque el DDL de creación no confirmó
   éxito.

### Fronteras de best-effort

- **Best-effort permitido:** logs, warnings de retención y reporte de cleanup
  secundario cuando ya existe un error primario.
- **No best-effort:** validación de configuración, lock, creación de target,
  dump/restore, paridad, transición a `verified`, cierre de clientes antes de
  verificar y cleanup administrativo después de un run exitoso.
- Si unlock o `admin.end()` falla después de un backup verificado, el resultado
  del proceso es fallo. La copia puede estar verificada en ledger, pero el
  operador debe investigar la higiene de la sesión.
- Si logging falla, el resultado y la transición durable se conservan. Nunca se
  registra un estado `quarantined`/`failed_not_created` si la actualización no
  fue confirmada; solo se registra un warning de transición fallida.

## 7. Failure taxonomy and lessons learned

Esta sección reconstruye fallos sustantivos, incluidos falsos positivos que
existieron antes de la versión mergeada.

### 7.1 Railway leyó el config file equivocado

- **Síntoma:** un servicio construía o ejecutaba instrucciones pertenecientes a
  otro servicio del monorepo.
- **Suposición falsa:** `Root Directory` haría que Railway descubriera
  automáticamente el `railway.json` correcto.
- **Causa raíz:** Config as Code se resuelve desde una ruta configurada por
  servicio; el archivo raíz podía aplicarse a servicios con otro root.
- **Corrección:** paths absolutos explícitos: `/railway.json`,
  `/railway.vision.json` y `/railway.backup.json`.
- **Regresión:** `keeps Railway API and Vision service configuration isolated` y
  verificación del manifest de deployment del backup.
- **Lección Kamayuq:** cada ejemplo provider debe verificar el config efectivo
  del deployment, no solo el archivo presente en Git.

### 7.2 API/Vision heredaron configuración cruzada

- **Síntoma:** Vision intentó comportarse como API o recibió pre-deploy commands
  de Prisma; healthchecks y Dockerfiles no correspondían.
- **Suposición falsa:** servicios apuntando al mismo repo permanecerían aislados
  por nombre/root.
- **Causa raíz:** ambos podían caer en la configuración Railway por defecto.
- **Corrección:** config Vision dedicado, sin tokens de comandos API, y tests que
  niegan `node|pnpm|prisma|typescript|tsc` en ese config.
- **Regresión:** test de aislamiento de config y smokes de orígenes.
- **Lección Kamayuq:** los adaptadores de despliegue necesitan pruebas negativas
  contra herencia accidental, especialmente en monorepos.

### 7.3 Cliente PostgreSQL más viejo que el servidor

- **Síntoma:** `pg_dump` rechazó el servidor por incompatibilidad de major
  version antes de producir un archive útil.
- **Suposición falsa:** instalar el cliente PostgreSQL por defecto de la imagen
  era suficiente.
- **Causa raíz:** el cliente inicial era más viejo que el servidor fuente. La
  documentación PostgreSQL permite un cliente nuevo contra servidores viejos,
  pero no un `pg_dump` contra un servidor de major más nueva.
- **Corrección:** fijar `postgresql18-client`. Estado observado final: source 17,
  recovery 18, cliente `pg_dump` 18.4.
- **Regresión:** build de imagen, `pg_dump --version`, rehearsal local y hosted.
- **Gap:** no hay test CI que falle si Alpine cambia el paquete efectivo.
- **Lección Kamayuq:** publicar una política explícita `client major >= source
  major` y probar la matriz real.

### 7.4 `pg_restore` recibió el dump como output

- **Síntoma:** el comando terminaba sin restaurar la base; podía tratar
  `--file <dump>` como destino del SQL generado en lugar de archive de entrada.
- **Suposición falsa:** `pg_dump --file` y `pg_restore --file` eran simétricos.
- **Causa raíz:** en `pg_restore`, `--file` significa archivo de salida. El
  archive debe ser argumento posicional.
- **Corrección:** archive posicional al final del comando.
- **Regresión:** test exacto de la lista de argumentos y rehearsal real.
- **Lección Kamayuq:** tests de wrappers CLI deben validar semántica y ejecutar
  binarios reales, no solo comprobar que una opción “parece correcta”.

### 7.5 Faltaba `--dbname`

- **Síntoma:** `pg_restore` podía generar SQL a stdout y salir correctamente sin
  conectarse al target.
- **Suposición falsa:** `PGDATABASE` implicaba automáticamente restore directo.
- **Causa raíz:** sin `-d/--dbname`, `pg_restore` opera como generador de script.
- **Corrección:** `--dbname=<nombre exacto>` más archive posicional.
- **Regresión:** unit test de argumentos y hosted rehearsal con paridad posterior.
- **Lección Kamayuq:** “process exited 0” debe acompañarse de postcondiciones
  observables en el destino.

### 7.6 Conflictos con un schema `public` preexistente

- **Síntoma:** el restore falló al recrear objetos/schema que ya existían en una
  base nueva del proveedor.
- **Suposición falsa:** `CREATE DATABASE` produce un destino totalmente vacío.
- **Causa raíz:** templates/proveedores crean `public` y otros objetos base.
- **Corrección:** `--clean --if-exists --exit-on-error`, siempre sobre una base
  recién creada y guardada.
- **Regresión:** Docker/hosted rehearsal.
- **Lección Kamayuq:** definir “vacío” por postcondiciones, no por haber ejecutado
  `CREATE DATABASE`; limpiar solo targets desechables demostrados.

### 7.7 `Recipe` no era el modelo físico real

- **Síntoma:** la validación falló aunque el restore contenía la aplicación.
- **Suposición falsa:** el nombre conceptual “Recipe” coincidía con la tabla
  física.
- **Causa raíz:** Preppie usa `BaseRecipe`.
- **Corrección:** tablas/conteos `User`, `BaseRecipe`, `ShoppingCart` y prueba de
  presencia de `_prisma_migrations`.
- **Regresión:** unit test de tablas/conteos y rehearsals.
- **Lección Kamayuq:** invariantes de dominio deben ser configuración del
  consumidor, descubiertos contra schema real y versionados.

### 7.8 Resolución de módulos en workspace Docker filtrado

- **Síntoma:** el contenedor no encontraba `pg` aunque `pnpm install --filter`
  había terminado.
- **Suposición falsa:** copiar un único `node_modules` o ejecutar el wrapper pnpm
  preservaba todos los enlaces del workspace filtrado.
- **Causa raíz:** pnpm separa virtual store, enlaces raíz y enlaces del package;
  la imagen/runtime resolvía desde una ubicación distinta.
- **Corrección:** build multistage, copiar `/app/node_modules` y
  `/app/apps/database-backup/node_modules`, y ejecutar el entrypoint Node desde
  el módulo real.
- **Regresión:** Docker build/launch y deployments Railway.
- **Lección Kamayuq:** un repo standalone reduce este riesgo; aun así debe probar
  `docker run`, no solo `docker build`.

### 7.9 Output del wrapper confundido con evento JSON

- **Síntoma:** el runner esperaba una línea JSON allowlisted pero recibía output
  adicional de pnpm/Docker y declaraba fallo o no podía identificar el único
  `backup_verified`.
- **Suposición falsa:** un package-manager wrapper sería silencioso.
- **Causa raíz:** stdout era simultáneamente protocolo machine-readable y canal
  humano del wrapper.
- **Corrección:** entrypoint Node directo; cada línea del worker debe ser JSON;
  el runner exige exactamente un evento verificado.
- **Regresión:** tests del PowerShell y rehearsal.
- **Lección Kamayuq:** stdout debe ser un protocolo formal; diagnostics van a
  stderr y cada evento necesita schema/version.

### 7.10 URLs mal formadas o insuficientemente escapadas

- **Síntoma:** parsers distintos rechazaron la conexión; un password con `@`
  podía confundirse con el separador de host. Un path diagnóstico llegó a
  imprimir la URL completa en un error de herramienta.
- **Suposición falsa:** toda URL copiada del dashboard estaba normalizada y todos
  los parsers trataban caracteres reservados igual.
- **Causa raíz:** credenciales sin percent-encoding y concatenación/manual parsing
  fuera del worker.
- **Corrección implementada:** usar referencias Railway, preferir URL oficial
  percent-encoded, validar con WHATWG `URL` y nunca interpolar valores en
  comandos/evidencia.
- **Acción operacional pendiente:** rotar la credencial expuesta por el error
  operativo; este dossier no cuenta esa rotación como evidencia completada.
- **Regresión:** tests de configuración, redacción y targets rechazados sin
  leakage.
- **Lección Kamayuq:** separar `SecretRef` de `ConnectionConfig`; nunca incluir el
  input inválido en el mensaje de validación.

### 7.11 Faltaba `sslmode`

- **Síntoma:** startup falló aun con host/user/password válidos.
- **Suposición falsa:** el default del driver sería seguro y consistente entre
  Node `pg` y libpq.
- **Causa raíz:** URLs de proveedor no declaraban política TLS y el contrato del
  worker exige una decisión explícita.
- **Corrección:** las referencias añaden `sslmode=require`; se transmite como
  `PGSSLMODE`.
- **Regresión:** tests de modos soportados y entorno hijo exacto.
- **Limitación:** `rejectUnauthorized:false` no autentica certificado; `require`
  aporta cifrado, no verificación fuerte de identidad.
- **Lección Kamayuq:** modelar TLS como policy explícita y soportar CA/verify-full
  correctamente en el producto público.

### 7.12 Migraciones históricas Prisma marcadas rolled back

- **Síntoma:** restore correcto fue clasificado como inválido por filas históricas
  fallidas/resueltas presentes tanto en source como recovery.
- **Suposición falsa:** cada fila de `_prisma_migrations` debía representar una
  migración activa terminada.
- **Causa raíz:** Prisma conserva intentos con `rolled_back_at`.
- **Corrección:** excluir filas rolled back antes de validar completitud,
  unicidad y paridad del historial activo.
- **Regresión:** test que mezcla fila rolled back y activa.
- **Lección Kamayuq:** un adapter de migraciones debe entender la semántica del
  migrador, no aplicar reglas genéricas a su tabla interna.

### 7.13 Migración completada con `applied_steps_count = 0`

- **Síntoma:** otra copia correcta quedó en cuarentena después de corregir las
  filas rolled back.
- **Suposición falsa:** una migración aplicada siempre incrementa
  `applied_steps_count`.
- **Causa raíz:** baselines/`migrate resolve --applied` pueden registrar una
  migración válida sin ejecutar pasos SQL en ese momento.
- **Corrección:** estado activo válido = `finished_at` presente y
  `rolled_back_at` ausente; `applied_steps_count` no es autoridad de éxito.
- **Regresión:** test `baselined` con cero pasos.
- **Lección Kamayuq:** adapters deben basarse en invariantes documentados y casos
  reales, no en correlaciones observadas.

### 7.14 Transiciones de retención inseguras

- **Síntoma:** una implementación inicial podía ejecutar DROP directamente sobre
  una fila seleccionada previamente o afirmar un estado sin confirmar que la
  actualización afectó una fila.
- **Suposición falsa:** un único worker hacía innecesario adquirir ownership de
  la transición.
- **Causa raíz:** carrera entre selección, cambio de estado y drop; falta de
  compare-and-set.
- **Corrección:** `verified -> deleting` condicional con `RETURNING`; si no se
  confirma, se sobre-retiene y se emite warning.
- **Regresión:** tests de ordering y transición no confirmada sin drop.
- **Lección Kamayuq:** cada operación destructiva necesita CAS durable antes del
  side effect y reconciliación después.

### 7.15 El retry no tenía una segunda ventana significativa

- **Síntoma:** el primer intento podía consumir todo el deadline de 30 minutos;
  el segundo existía en código pero no en capacidad temporal real.
- **Suposición falsa:** “máximo dos intentos” implicaba automáticamente un retry
  útil.
- **Causa raíz:** ambos subprocesos recibían el deadline total restante sin una
  reserva por intento.
- **Corrección:** deadline global de 30 minutos y cap de 15 minutos por intento.
- **Regresión:** tests de timeout por comando, dos restores y deadline agotado
  antes de side effects.
- **Lección Kamayuq:** presupuestar tiempo por intento; retries sin presupuesto
  reservado son una garantía ficticia.

### 7.16 Carreras de rollback, unlock y cierre

- **Síntoma:** `Promise.allSettled`/cleanup paralelo podía ocultar orden, perder el
  error correcto o dejar de intentar tareas posteriores cuando una fallaba de
  forma síncrona.
- **Suposición falsa:** todos los cleanups eran independientes y las promesas
  siempre se crearían.
- **Causa raíz:** rollback debe preceder al close; unlock debe preceder a cerrar
  admin; una función puede throw antes de producir una promesa.
- **Corrección:** `sequentialCleanup`, ejecución ordenada de todas las tareas,
  preservación de primary error y surfacing de cleanup error tras éxito.
- **Regresión:** tests de rollback-before-end, temp cleanup tras throw síncrono,
  unlock failure y admin close.
- **Lección Kamayuq:** cleanup es parte del state machine y merece tests de orden,
  no un `finally` informal.

### 7.17 Evidencia se borraba con el target

- **Síntoma:** cleanup podía eliminar la base antes de que existiera evidencia
  durable del rehearsal; un fallo durante cleanup dejaba un resultado ambiguo.
- **Suposición falsa:** escribir evidencia al final era suficiente.
- **Causa raíz:** orden incorrecto entre verificación, persistencia y drop.
- **Corrección:** escribir evidencia sanitizada antes de cleanup; después añadir
  timings de cleanup y reescribir evidencia final.
- **Regresión:** test que compara posiciones en el script y tests black-box de
  evidencia fallida.
- **Lección Kamayuq:** evidence-before-destruction es un invariante del protocolo.

### 7.18 Leakage por rutas de error y metadata accidental

- **Síntoma:** URLs/markers podían aparecer en stderr/stdout o un objeto no
  allowlisted podía llegar a evidencia.
- **Suposición falsa:** “no logueamos secretos intencionalmente” equivalía a no
  filtrarlos.
- **Causa raíz:** errores de subprocesos, parsers y wrappers incluyen inputs por
  defecto.
- **Corrección:** redacción URL, reconstrucción de objetos allowlisted, helper que
  devuelve solo categoría genérica y pruebas con markers secretos.
- **Regresión:** `redacts URL-like error content`, `rejected targets never appear`
  y tests de evidencia allowlisted.
- **Limitación:** no existe detector genérico de secretos ni inmutabilidad de logs.
- **Lección Kamayuq:** diseñar errores como datos públicos desde el origen; no
  intentar sanitizar un objeto arbitrario al final.

## 8. Verification model

| Capa | Qué demuestra | Estado actual | Qué no demuestra |
| --- | --- | --- | --- |
| Dump completion | `pg_dump` terminó y escribió un archive custom | Implementado y verificado | Que el archive sea restaurable o durable |
| Archive integrity | El archive puede listarse/leerse y opcionalmente tiene checksum | Solo implícita al restaurarlo; no hay `pg_restore --list` ni digest persistido | Detección anticipada de corrupción o tampering |
| PostgreSQL restore success | `pg_restore --dbname ... --exit-on-error` terminó contra target | Implementado y verificado local/hosted | Semántica completa de la app o recursos externos al dump |
| Migration parity | Historial Prisma activo ordenado coincide por nombre/checksum | Implementado; rolled back y baseline cero manejados | Compatibilidad con otros migradores; correspondencia directa con archivos del repo dentro del worker |
| Schema validity | Objetos necesarios existen y restore no reportó error | Parcial: cuatro tablas requeridas + éxito del restore | Constraints, índices, funciones, triggers, vistas, grants y RLS exhaustivos |
| Row-count parity | Tres tablas críticas tienen conteos exactos en el mismo snapshot | Implementado y verificado | Igualdad fila a fila, contenido, relaciones o semántica de negocio |
| Application/domain invariants | Queries reales y reglas de dominio funcionan | Parcial fuera del worker mediante readiness/smokes; no hay consulta Prisma dentro del backup | Autenticación, writes, flujos de usuario y providers sobre el recovery target |
| Retained-copy availability | Existen copias anteriores utilizables | Parcial: ledger conserva dos `verified` normales | Reconnect periódico, bit rot, capacidad, antigüedad alertada o existencia física |
| Disaster-recovery readiness | Personas, credenciales, aplicación y datos pueden hacer cutover dentro del RTO | Runbooks + restore aislado; no cutover productivo completo | RTO real extremo a extremo, rollback de cutover ensayado, pérdida de cuenta/región |

La palabra `verified` debe leerse como “pasó el contrato de verificación actual”,
no como sinónimo de “disaster recovery completo”. Esta distinción debe formar
parte de la API pública de Kamayuq.

## 9. Test and evidence matrix

Leyenda: **Sí** = evidencia ejecutada; **Mock** = unit test sin PostgreSQL real;
**No** = gap; **Parcial** = cubre solo una parte.

| Invariante/fallo | Unit test | Integración | Docker rehearsal | Hosted rehearsal | Production smoke | Evidencia manual | Gap restante |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Nombres/quoting exactos | Sí | No | Sí | Sí | N/A | Revisión | No fuzz/property testing |
| Source != recovery exacto | Sí | No | Sí | Sí | N/A | Config provider | No detecta mismo cluster con DB distinta |
| TLS/URL contract | Sí | No | Sí | Sí | N/A | Referencias inspeccionadas | Sin verify-full/CA |
| Advisory lock | Mock | No | Implícito | Implícito | N/A | Ledger/logs | Sin prueba de dos procesos reales concurrentes |
| Snapshot consistente | Mock de SQL/args | No | Sí | Sí | N/A | Timing/metadata | Sin prueba concurrente que muta source durante dump |
| Cliente major compatible | No | No | Sí | Sí | N/A | Versiones consultadas | Sin gate CI automático |
| Archive como input + `--dbname` | Args exactos | No | Sí | Sí | N/A | Restore observado | Sin digest/list separado |
| Conflicto `public` | No específico | No | Sí | Sí | N/A | Corrección histórica | Fixture dedicado faltante |
| Prisma rolled back/baseline cero | Sí | No | Datos migrados | Sí | Readiness | Diagnóstico de ledger | Adapter depende de internals Prisma |
| Tabla/modelo crítico correcto | Sí | No | Sí | Sí | Parcial | Schema inspeccionado | Config hardcoded |
| Paridad de conteos | Sí | No | Sí | Sí | No | Evidencia sanitizada | No row digest/semántica |
| `pending -> verified` confirmado | Mock | No | Sí | Sí | N/A | Ledger | Sin constraint SQL |
| Cuarentena/failed_not_created | Mock | No | Fallos iniciales reales | Fallos iniciales reales | N/A | Ledger de ensayo | Cleanup operativo aún manual |
| Retención conserva dos | Mock | No | No | No destructivo normal | N/A | Revisión | Sin ensayo alojado de expiración normal |
| CAS antes de DROP | Mock | No | Cleanup rehearsal | Cleanup rehearsal | N/A | Orden en ledger | Update final de retención no confirma fila |
| Retry y budgets | Mock | No | Parcial | Dos fallos iniciales + run final | N/A | Duraciones | Sin test lento real que cruza 15 min |
| TERM→KILL | Sí | No | No | No | N/A | Código | Sin proceso real obstinado |
| Cleanup ordering | Sí | No | Sí | Sí | N/A | Temp/ledger | Crash duro no ensayado |
| Logging falla sin cambiar outcome | Sí | No | No | No | N/A | Revisión | Sin sink durable alternativo |
| Redacción/leakage | Sí + black-box | Parcial | Sí | Sí | N/A | Revisión de evidence | No secret scanner general |
| Evidencia antes de cleanup | Test estructural | Black-box PowerShell | Sí | Sí | N/A | Archivo de evidence | Evidence no inmutable/remota |
| API schema/release readiness | API unit/E2E | PostgreSQL CI | N/A | No sobre recovery app | Sí | Runbook | No temporary API target hosted |
| Aislamiento web/API/Vision | Repo tests | No | N/A | N/A | Sí | Railway/Vercel | No relación directa con integridad del backup |
| Cutover/rollback completo | No | No | No | No | Read-only únicamente | Runbook | Principal gap de DR |

### Resultados finales observados, sin datos privados

Estos resultados pertenecen a la validación final de la implementación mergeada
y a sus rehearsals registrados. La creación de este dossier no volvió a ejecutar
operaciones hosted ni destructivas; volvió a ejecutar los 30 unit tests del
worker y los 6 tests black-box/estructurales del wrapper, además de comprobaciones
documentales, de referencias y de formato.

- Worker: 30/30 tests Node aprobados.
- Tests repo de contratos/smokes: 52/52 aprobados.
- API unit: 201/201; API E2E local: 31/31.
- `pnpm verify`: lint sin errores, typecheck, tests y builds aprobados.
- Vision: checks Python propios aprobados; no se trató como TypeScript.
- Docker image: build y arranque exitosos con Node 22 y `pg_dump` 18.4.
- Rehearsal local PostgreSQL 18: restore, paridad, evidencia y cleanup aprobados.
- Rehearsal alojado cross-provider: historial activo completo en paridad,
  duración aproximada de 144 s y cleanup guardado aprobado.
- Readiness de producción y aislamiento web/API/Vision: aprobados.
- CI del PR: API, web, Vision, commitlint, Vercel y deployment Railway verdes.
- **Gap CI:** ningún workflow GitHub actual ejecuta explícitamente los 30 unit
  tests del worker; se ejecutaron localmente y el servicio fue construido por
  Railway. Kamayuq necesita CI propio.

## 10. Configuration contract

### Variables del worker actual

| Nombre | Req. | Tipo/formato válido | Clasificación | Consumidor | Ejemplo seguro | Fallo de startup |
| --- | --- | --- | --- | --- | --- | --- |
| `SOURCE_DATABASE_URL` | Sí | URL `postgres:`/`postgresql:` con host, port válido, database, user, password y `sslmode=disable|require` | Secreto crítico, read-only deseado | `loadBackupConfiguration`, clientes Node, `pg_dump` vía PG* | `postgresql://backup_reader:dummy%40pass@source.example:5432/app?sslmode=require` | Falla antes de conectar/crear ledger |
| `RECOVERY_ADMIN_DATABASE_URL` | Sí | Igual contrato; debe diferir del source por host+port+database | Secreto crítico, DDL/DROP | Admin Node, target Node, `pg_restore` | `postgresql://recovery_admin:dummy@recovery.example:5432/postgres?sslmode=require` | Falla antes de side effects |
| `BACKUP_RUN_ID` | No | `^[a-z0-9_]{1,32}$`; si empieza `rehearsal_`, debe respetar ese prefijo | Metadata interna | Naming, ledger, evidence | `nightly_20260719` | Valor inválido aborta startup |

`postgresChildEnvironment` reduce el environment del subproceso a `PGHOST`,
`PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD`, `PGSSLMODE` y, si existe,
`PATH`. No pasa las URLs completas.

### Variables internas del rehearsal

| Nombre | Req. | Formato | Clasificación | Consumidor | Ejemplo | Fallo |
| --- | --- | --- | --- | --- | --- | --- |
| Variable nombrada por `SourceDatabaseUrlVariableName` | Sí para ejecutar | Nombre `^[A-Z][A-Z0-9_]*$`; su valor cumple contrato source | Secreto | PowerShell wrapper | Nombre: `KAMAYUQ_TEST_SOURCE_URL` | Evidencia `failed` allowlisted; no se inicia Docker |
| Variable nombrada por `RecoveryAdminDatabaseUrlVariableName` | Sí | Igual | Secreto destructivo | PowerShell wrapper | `KAMAYUQ_TEST_RECOVERY_URL` | Igual |
| `SOURCE_DATABASE_URL` | Temporal | Copia process-scoped restaurada en `finally` | Secreto | Docker/helper | No persistir | Wrapper restaura valor previo |
| `RECOVERY_ADMIN_DATABASE_URL` | Temporal | Igual | Secreto destructivo | Docker/helper | No persistir | Igual |
| `BACKUP_RUN_ID` | Temporal | Derivado del target a1 exacto | Metadata | Docker/helper | `rehearsal_local_case` | Mismatch aborta inspect/cleanup |
| `REHEARSAL_EVIDENCE_JSON` | Temporal interno | JSON <= 16 KiB; luego reconstruido por allowlist | Sensible, sin secretos | `evidence-env` | `{"status":"failed",...}` | Evidencia rechazada; no debe limpiarse target |
| Variable nombrada por `ApiReadinessOriginVariableName` | Opcional | Origin HTTPS limpio, sin auth/path/query/hash, hostname contiene rehearsal/recovery | Interno | Probe `/ready` | `https://api-recovery.example` | Rehearsal falla antes de cleanup |
| Variable nombrada por `WebReadinessOriginVariableName` | Opcional | Mismo contrato | Interno | Probe `/` | `https://web-recovery.example` | Igual |

### Parámetros y configuración desplegada

| Campo | Actual | Significado/fallo |
| --- | --- | --- |
| `railway.backup.json.build.builder` | `DOCKERFILE` | Cualquier otro builder puede ignorar los supuestos de herramientas/links |
| `build.dockerfilePath` | `Dockerfile.database-backup` | Debe resolverse desde root repo; path incorrecto construye otro servicio o falla |
| `deploy.cronSchedule` | `0 2,14 * * *` | Dos ejecuciones diarias; zona horaria Railway/UTC debe documentarse operacionalmente |
| `deploy.restartPolicyType` | `NEVER` | Un job fallido no entra en restart loop; retry ocurre dentro del worker |
| Railway Config File setting | `/railway.backup.json` | Debe configurarse explícitamente por servicio |
| `SourceDatabaseUrlVariableName` | Parámetro PowerShell obligatorio | Recibe el **nombre**, no el secreto |
| `RecoveryDatabaseName` | Parámetro PowerShell obligatorio | Debe ser attempt-one exacto de rehearsal |
| `ImageName` | Opcional | Default interno de imagen rehearsal; imagen ausente aborta setup |
| `EvidencePath` | Opcional | Archivo UTF-8 creado incluso en fallos válidamente resolubles |
| `Cleanup` | Switch | Solo opera después de `status=passed` y evidencia pre-cleanup persistida |

Los modos `verify-ca`/`verify-full` se reconocen como conceptos pero se rechazan
porque el worker no acepta una CA segura; `sslrootcert` también se rechaza. En
Kamayuq esto debería convertirse en soporte real, no mantenerse como rechazo.

## 11. External dependencies and compatibility

### Matriz observada

Esta tabla distingue versiones observadas durante la validación de requisitos declarados por el código. Una versión observada no equivale a una política de compatibilidad.

| Componente | Versión/estado observado | Contrato actual | Papel | Portabilidad |
| --- | --- | --- | --- | --- |
| PostgreSQL source | 17.6 | Debe ser alcanzable por el cliente 18 y permitir snapshot exportado | Base productiva de origen | Esencial; versión concreta incidental |
| PostgreSQL recovery | 18.3 | El admin debe poder crear, inspeccionar y eliminar bases | Destino de recuperación | Esencial; proveedor y versión concreta incidentales |
| `pg_dump`/`pg_restore` | 18.4 en la imagen ensayada | Custom archive; cliente no puede ser de major menor que un source más nuevo | Transporte lógico | Esencial |
| Node.js en Docker | 22.23.1 observado; imagen declara `node:22-alpine` | ESM, `AbortController`, `node:test`, child processes | Runtime del worker | Runtime esencial; patch incidental |
| `pg` | `^8.16.3` declarado; 8.22.0 resuelto en `pnpm-lock.yaml` | Conexiones admin/source/target y queries parametrizados | Driver PostgreSQL | Sustituible detrás de un adapter |
| pnpm | 11.1.2 fijado en el monorepo | Instala workspace filtrado y ejecuta tests | Build del repositorio actual | Incidental para Khipu Engine |
| Prisma migrations | Historial en `_prisma_migrations` | Nombre/checksum/estado terminal activo; rollback filtrado | Verificador de migraciones actual | Adapter, no requisito del núcleo |
| Docker | Build multistage sobre Alpine | Incluye cliente PostgreSQL 18 y ejecuta Node directamente | Empaquetado reproducible | Interfaz de distribución deseable |
| PowerShell | Wrapper de rehearsal | Docker, readiness HTTP y evidence JSON | Orquestación interna | Incidental; reescribir para producto público |

PostgreSQL documenta que un `pg_dump` reciente puede leer servidores antiguos dentro de su rango soportado, pero no puede leer un servidor de major posterior al del cliente. También indica que el output suele cargarse en majors más nuevos, sin prometer que toda restauración cross-major sea compatible. Por eso el ensayo 17→18 es evidencia concreta, no una garantía universal. El snapshot exportado solo sigue siendo válido mientras permanezca abierta la transacción que lo exportó; esa es la razón del orden dump-before-commit.

Referencias públicas relevantes para una extracción:

- PostgreSQL: [`pg_dump`](https://www.postgresql.org/docs/18/app-pgdump.html), [`pg_restore`](https://www.postgresql.org/docs/18/app-pgrestore.html) y [snapshot synchronization](https://www.postgresql.org/docs/18/functions-admin.html).
- Prisma: [`migrate resolve`](https://www.prisma.io/docs/orm/prisma-migrate/workflows/patching-and-hotfixing#reconciling-your-migration-history-with-the-patches-or-hotfixes-you-applied) puede marcar una migración como aplicada o rolled back; un baseline válido puede no tener pasos ejecutados de la forma asumida inicialmente.
- Railway: el servicio debe apuntar explícitamente a [`/railway.backup.json`](https://docs.railway.com/guides/config-as-code), y el cron/restart policy pertenecen a esa configuración de servicio.
- Supabase: los backups administrados y PITR dependen del plan; su CLI omite recursos administrados en ciertos flujos. El worker actual no usa esa CLI: restaura deliberadamente el schema `public` de la aplicación y `pg_trgm`.

### Supuestos de proveedor y TLS

- Railway aporta build, cron, variables referenciadas y networking, pero el algoritmo no usa una API Railway en runtime.
- Supabase es el origen desplegado observado, no un requisito del algoritmo. Un source mediante pooler podría cambiar capacidades de sesión; el snapshot consistente requiere una conexión que preserve la misma sesión/transacción.
- `sslmode=require` cifra el transporte en el comportamiento actual, pero el cliente Node se configura sin verificación de CA. Esto no satisface una política estricta de identidad del servidor.
- Roles, ownership, grants globales, tablespaces y recursos administrados por el proveedor no están incluidos por el dump acotado.

### Dependencias esenciales e incidentales

Son esenciales: semántica PostgreSQL, un dumper/restorer compatibles, conexión admin al recovery, store durable para lifecycle, reloj/deadline y un ejecutor de procesos cancelable. Son incidentales: pnpm, el monorepo Preppie, PowerShell, Railway como scheduler, Supabase como source, Prisma como sistema de migración y los nombres de tablas de Preppie.

### Licencias antes de publicar

El checkout actual contiene una contradicción que bloquea una extracción por simple copia: el `package.json` raíz declara `ISC`, mientras `LICENSE` reserva todos los derechos y no concede permiso general de copia. No debe inferirse una licencia pública a partir del campo npm.

Antes de publicar Kamayuq se requiere:

1. decisión explícita del titular sobre la licencia de Kamayuq y Khipu Engine;
2. inventario/SBOM de Node, imagen Alpine, cliente PostgreSQL y utilidades;
3. preservación de notices exigidos por dependencias (`pg@8.22.0` es MIT y PostgreSQL usa PostgreSQL License, sujeto a verificar las versiones distribuidas);
4. reescritura o autorización explícita para código derivado de Preppie;
5. exclusión de fingerprint ledgers, evidencia privada y configuración de infraestructura.

Hasta resolverlo, la clasificación “copy/adapt” de la sección 5 es una guía técnica, no permiso legal.

## 12. Generic core versus Preppie coupling

La división siguiente describe fronteras de extracción. No afirma que el código mergeado ya tenga estos paquetes ni cambia la topología de la sección 2.

### A. Reusable recovery engine

Material candidato para **reescritura/adaptación** como Khipu Engine:

- `runBackupWorker`, con sus puertos de clock, process runner, conexiones, filesystem temporal y logger;
- `createProcessRunner` y el contrato TERM→KILL;
- `sequentialCleanup`, deadline global, presupuesto por intento y retry;
- quoting de identificadores después de validación exacta;
- lifecycle compare-and-set, retención, cuarentena y reconciliación;
- allowlisting/redaction y contrato de salida JSON.

El estado no debe conservar strings o tablas Preppie. Khipu Engine debería recibir un `LifecycleStore`, `ArchiveAdapter`, `DatabaseProvisioner`, colección de verificadores y una política de retención. El store debe imponer estados y transiciones válidas, no depender de una columna `text` libre.

### B. Provider integration

- `railway.backup.json`, Railway variable references y cron son un **Railway adapter/example**.
- La obtención de connection strings de Supabase y sus restricciones es un **Supabase source guide/adapter**; el worker no debería importar un SDK de Supabase solo por ese uso.
- `scripts/rehearse-database-recovery.ps1` combina ambos proveedores y debe convertirse en un ejemplo reproducible, no en lógica del engine.

### C. Prisma-specific verification

`validateMigrationParity` y las queries sobre `_prisma_migrations` son el punto de partida de un `PrismaMigrationVerifier`. Debe encapsular:

- exclusión de filas rolled back;
- requerimiento de terminación válida;
- paridad ordenada de nombre/checksum;
- tratamiento correcto de baselines con `applied_steps_count = 0`.

`database-schema-readiness.ts` aporta una noción adicional de versión esperada, pero depende de migraciones empaquetadas y del ledger interno. No pertenece al Khipu Engine puro.

### D. Preppie-specific checks and table names

Estos elementos deben salir del núcleo:

- `REQUIRED_PUBLIC_TABLES` y `COUNTED_TABLES` con `User`, `BaseRecipe` y `ShoppingCart`;
- prefijos `preppie_recovery_` y `preppie_recovery_rehearsal_`;
- tabla `preppie_backup_recovery_metadata`;
- nombres/categorías de eventos y runbooks operativos de Preppie;
- `DatabaseReleaseCompatibility`, el migration floor del API y las readiness routes de Preppie;
- cualquier futuro invariant que conozca recetas, usuarios, carritos o modelo de negocio.

En Kamayuq, esos checks deben representarse como configuración o plugins SQL declarados por el operador.

### E. Internal runbooks/evidence

Permanecen internos o se publican solo como plantillas saneadas:

- `docs/database-recovery.md`;
- `docs/deployment-environments.md`;
- la evidencia histórica del rehearsal, guardada fuera de `origin/main` en el
  path elegido por el operador;
- parámetros concretos del rehearsal, tiempos/contadores históricos y procedimientos de readiness de servicios Preppie;
- referencias operativas a proyectos, servicios, dominios o personas.

El valor reutilizable es la forma: evidencia allowlisted, persistencia antes de cleanup, checklist de aislamiento y registro de gaps. Los valores concretos no son parte del producto público.

### F. Code and data that must not enter the public repository

- URLs, credenciales, nombres de variables secretas reales, IDs de proveedor, project/service/environment IDs y dominios privados;
- dumps, recovered databases, row counts reales, tamaños, nombres de run y archivos de evidencia identificables;
- `.env*`, logs crudos y excepciones históricas que contengan URLs;
- `apps/api/src/database-migration-fingerprint-ledger.v1.ts` y sus checksums internos; el concepto puede reimplementarse como interfaz/configuración;
- runbooks con contactos o paths privados y cualquier artefacto de evidencia
  generado en paths operacionales no versionados;
- fragmentos cuya licencia no haya sido autorizada expresamente.

## 13. Proposed standalone public interface

> **PROPUESTA — no es comportamiento actual.** El producto público completo se denomina **Kamayuq**. Su núcleo genérico se denomina provisionalmente **Khipu Engine**. Prisma, Railway y Supabase son adapters o ejemplos externos.

La interfaz más estrecha útil debe priorizar una ejecución determinista antes que una plataforma multiusuario.

### CLI y Docker entrypoint propuestos

```text
kamayuq run --config /config/kamayuq.yaml
kamayuq inspect --run <run-id> --config /config/kamayuq.yaml
kamayuq cleanup --target <exact-name> --config /config/kamayuq.yaml
kamayuq reconcile --config /config/kamayuq.yaml
kamayuq config validate --config /config/kamayuq.yaml
```

El entrypoint Docker sería el mismo binario: `ENTRYPOINT ["kamayuq"]` y `CMD ["run", "--config", "/config/kamayuq.yaml"]`. Ningún argumento debe aceptar un password literal; las URLs provienen del environment o de un secret resolver explícito.

### Contrato de configuración propuesto

```yaml
version: 1
engine:
  runId: nightly_example
  timeout: 30m
  attempts: 2
source:
  urlEnv: KAMAYUQ_SOURCE_DATABASE_URL
recovery:
  adminUrlEnv: KAMAYUQ_RECOVERY_ADMIN_DATABASE_URL
  databasePrefix: kamayuq_recovery_
archive:
  format: postgres-custom
  schemas: [public]
  extensions: [pg_trgm]
verification:
  migrations:
    adapter: prisma
  tableCounts:
    - public.users
    - public.orders
  sqlInvariants:
    - name: no_orphan_orders
      query: SELECT count(*) = 0 AS ok FROM public.orders o LEFT JOIN public.users u ON u.id = o.user_id WHERE u.id IS NULL
retention:
  keepVerified: 2
  quarantineTtl: 168h
output:
  format: jsonl
```

El parser debe rechazar campos desconocidos por defecto, validar prefijos y SQL antes de cualquier DDL, y presentar la configuración resuelta sin valores secretos. YAML y JSON pueden ser dos serializaciones del mismo schema versionado.

### Puertos de verificación propuestos

```ts
interface MigrationVerifier {
  snapshot(source: DatabaseSession): Promise<unknown>;
  verify(sourceEvidence: unknown, target: DatabaseSession): Promise<CheckResult>;
}

interface SqlInvariant {
  name: string;
  capture?: 'source-and-target' | 'target-only';
  query: string;
  timeoutMs?: number;
}

interface LifecycleStore {
  createPending(run: RunDescriptor): Promise<void>;
  transition(expected: State, next: State, evidence?: Evidence): Promise<boolean>;
  listRetentionCandidates(policy: RetentionPolicy): Promise<RecoveryRecord[]>;
}
```

Los table-count checks son verificadores genéricos configurables. Prisma es un plugin de migraciones. Los SQL invariants deben ser read-only, tener timeout y producir valores escalares/allowlisted; no deben permitir múltiples statements ni interpolación de identificadores sin validación.

### Retention, output y exit codes propuestos

- retention conserva por cantidad y opcionalmente por edad; quarantine tiene política separada y nunca se borra como “verified”;
- cleanup requiere nombre exacto, estado permitido y compare-and-set confirmado;
- cada línea stdout es un evento JSON versionado; stderr es humano y redactado;
- `0`: recovery verificado y lifecycle persistido;
- `10`: configuración inválida;
- `20`: lock ocupado/no-op;
- `30`: dump/restore fallido con target ausente o cuarentenado;
- `40`: verificación fallida con target cuarentenado;
- `50`: inconsistencia de lifecycle/cleanup que requiere intervención;
- `60`: timeout/cancelación;
- otros errores internos se normalizan a un código documentado sin filtrar secretos.

Una ejecución exitosa puede incluir warnings de retention, pero el evento debe marcar `retention.status` y el exit contract debe permitir elevar ese warning a error por política. “Disaster recovery ready” no debe ser un evento emitible por el engine: exige evidencia operacional externa.

## 14. Extraction plan

> **Plan propuesto; no implementado.** La secuencia crea **Kamayuq** como producto y mantiene **Khipu Engine** independiente de los adapters. Cada etapa debe poder revisarse y revertirse sin depender de la siguiente.

| Etapa | Material fuente de Preppie | Qué reescribir | Tests requeridos | Acceptance criteria | Riesgos probables |
| --- | --- | --- | --- | --- | --- |
| 1. Repository skeleton | Convenciones útiles de scripts, package metadata y Docker; no copiar configuración privada | Workspace mínimo `packages/khipu-engine`, `packages/cli`, `adapters/*`, `examples/*`; LICENSE, SECURITY, CONTRIBUTING y threat model nuevos | Install reproducible, license scan, secret scan, empty CLI smoke | Repo público no contiene identificadores/artefactos Preppie; licencias decididas; CI mínimo verde | Copiar código sin autorización, sobrecrear monorepo, publicar secretos históricos |
| 2. Pure contracts and state machine | Estados/transiciones de `backup-orchestrator.mjs`, `selectExpiredRecoveryDatabases` | ADT/enum cerrado, transition table, evidence schema versionado, store interface, clock/ID ports | Property tests de transiciones; tablas completas; invalid transition fuzzing; retention boundary tests | Ningún destructive action se expresa sin expected state; terminales explícitos; serialización estable | Reproducir columna text libre; confundir evento transitorio con estado persistente |
| 3. PostgreSQL process adapter | `pg-runtime.mjs`, `postgresChildEnvironment`, URL validation/redaction | Adapter con argv estructurado, env allowlist, cancel token, TLS policy real, capability/version probe | Unit argv/env/redaction; procesos reales timeout TERM→KILL; URL fuzzing; client/server compatibility tests | Nunca imprime credenciales; rechaza cliente incompatible antes del dump; CA verification soportada o fallo explícito | Diferencias signal en Windows/container; libpq behavior; URLs exóticas |
| 4. Restore orchestration | `runBackupWorker`, snapshot/dump/restore ordering, `sequentialCleanup` | Saga explícita con resources/compensations, deadline repartido, target provisioner, retry policy | Fake-port deterministic tests; PostgreSQL integration para snapshot; failure injection en cada await/cleanup | Dos intentos tienen presupuesto útil; rollback/close/unlock siempre ordenados; primary error preservado | State explosion, cleanup races, targets huérfanos |
| 5. Generic verification | `validateCriticalTablesAndCounts`, evidence allowlist | Registry de table counts, read-only scalar SQL invariants, archive inspection y opcional digest | SQL parser/allowlist tests; source-target mismatch; archive corrupto; schema object inventory | Config define checks sin código de dominio; archive integrity separada de restore; evidencia limitada | SQL arbitrario destructivo; checks caros; falsa confianza por conteos |
| 6. Prisma adapter | `validateMigrationParity`, queries `_prisma_migrations`, readiness ideas | Plugin sin fingerprints Preppie; model de applied/rolled-back/failed/baseline; versions Prisma soportadas | Rolled-back, failed, edited checksum, divergence, duplicate, baseline zero steps, empty history | Paridad correcta sin falsos negativos históricos; error explica categoría sin filtrar SQL/URL | Cambios de schema Prisma; semántica de repair manual |
| 7. Railway/Supabase example | `railway.backup.json`, rehearsal wrapper, runbooks saneados | Example project con placeholders, secret references y provider-neutral CLI; docs de direct/pooler | Config-file selection test; negative inheritance test; no-secret fixture scan | Cada servicio usa su config; cron/restart descritos; ninguna key/ID real; source session compatible | Drift de plataforma; plan features; copiar topology privada |
| 8. Docker image | `Dockerfile.database-backup` y fix de filtered workspace resolution | Imagen versionada/SBOM, non-root, health/version commands, client major policy | Multiarch build si se promete; runtime import; CLI smoke; container secret/redaction tests | Imagen arranca sin wrapper, reporta versiones sin secretos y trae `pg_dump`/`pg_restore` esperados | Alpine/libc/extensions, CVEs, tag mutable, tamaño |
| 9. Local PostgreSQL 18 rehearsal | `rehearse-database-recovery.ps1`, helper inspect/cleanup | Harness portable (Compose/Testcontainers), fixtures licenciadas, evidence schema | Dump→restore real, corrupt archive, lock concurrency, both attempts, retention/delete, quarantine, restart/reconcile | Rehearsal repetible desde checkout limpio; cleanup confirmado; cero DB huérfanas salvo cuarentena intencional | Tests lentos/flaky; permisos CREATE DATABASE; signal differences |
| 10. Hosted cross-provider rehearsal | Forma del rehearsal Railway→recovery, no valores | Infra example o checklist provider-neutral con secret injection y disposable targets | Hosted smoke etiquetado/manual; TLS identity; network interruption; retained-copy reconnect | Evidencia saneada demuestra restore cross-provider y cleanup; no publica IDs/counts | Costos, rate limits, egress, credenciales, cleanup remoto |
| 11. Documentation and release | Lecciones/taxonomía de este dossier | Public threat model, guarantees/non-guarantees, runbook, compatibility policy, changelog, release signing | Link check, examples validate, image scan, license/SBOM gate, release rehearsal | v0.x explica límites, exit contract y rollback; artefactos firmados; known gaps públicos | Marketing excede garantías; soporte prematuro; disclosure accidental |

### Decisiones de implementación por etapa

1. **Skeleton:** no importar git history de Preppie. Empezar con propiedad/licencia clara y fixtures sintéticas.
2. **State machine:** hacer que destructive intent sea un valor persistible y auditable; diseñar recovery de crash antes del primer `DROP`.
3. **Process adapter:** consultar versiones y capacidades al startup; no construir comandos mediante shell strings.
4. **Orchestration:** modelar cada resource adquirido y su compensación. El unlock usa la misma sesión admin que adquirió el lock.
5. **Verification:** separar archive readability, restore, migraciones, schema, counts e invariants en resultados independientes.
6. **Prisma:** mantenerlo opcional; Khipu Engine arranca y funciona sin Prisma instalado.
7. **Providers:** los examples contienen dummy references y pruebas que impiden herencia accidental de API/Vision u otros servicios.
8. **Image:** fijar versions/digests según política publicada y automatizar actualización, sin prometer majors no ensayados.
9. **Local rehearsal:** debe ser el gate de integración principal, no una demo manual posterior.
10. **Hosted rehearsal:** usar recursos desechables con budget guard y cleanup observable; conservar evidencia antes de destruir.
11. **Release:** publicar únicamente después de secret/license review independiente.

### Secuencia intencional de commits

1. `chore(repo): initialize Kamayuq governance and CI`
2. `feat(khipu): define lifecycle and evidence contracts`
3. `test(khipu): exhaust lifecycle transition properties`
4. `feat(postgres): add safe process and connection adapters`
5. `feat(khipu): orchestrate dump restore and cleanup saga`
6. `feat(verify): add generic archive and SQL checks`
7. `feat(prisma): add migration parity adapter`
8. `feat(cli): expose config validation run inspect and cleanup`
9. `feat(docker): publish non-root PostgreSQL 18 image`
10. `test(rehearsal): add local PostgreSQL recovery matrix`
11. `docs(examples): add sanitized Railway and Supabase deployment`
12. `test(hosted): record cross-provider recovery rehearsal`
13. `docs(release): publish guarantees threat model and compatibility`
14. `chore(release): prepare signed Kamayuq prerelease`

Los commits de tests se separan solo donde hacen visible un contrato de seguridad; cada feature commit debe seguir verde. No hacer un commit “copy Preppie worker” que introduzca coupling para limpiarlo después.

## 15. Open questions

Estas decisiones permanecen abiertas. Ninguna debe ocultarse bajo defaults accidentales del worker actual.

### Recovery artifact and lifecycle

1. ¿Las bases verificadas deben mantenerse listas para conexión, volverse efímeras después de producir evidencia o coexistir con un archivo durable?
2. ¿Debe exigirse también object storage inmutable/WORM con checksum, cifrado y lifecycle independiente? Una recovery database mutable no sustituye un backup inmutable.
3. ¿Cómo reconciliar estados `pending`, `deleting` o target sin ledger después de crash? ¿Quién posee el garbage collector y qué ventana de seguridad usa?
4. ¿Cuánto tiempo y bajo qué proceso se conservan cuarentenas? ¿Se requiere aprobación humana para eliminarlas?
5. ¿El lifecycle store vive en el mismo recovery PostgreSQL, en un control plane separado o en ambos con event log?
6. ¿La última copia verified se protege por cantidad, edad mínima, réplica/provider diversity o una combinación?

### Compatibility and databases

7. ¿Qué majors de PostgreSQL soporta cada release y qué matrices source→client→target se ensayan obligatoriamente?
8. ¿Se permitirá target de major menor, misma cluster en distinta database o solo proveedor/cluster aislado?
9. ¿Qué SQL invariants genéricos se incluyen de fábrica y cómo se restringe su costo, privilegio y sintaxis?
10. ¿Cómo se soportan Flyway, Liquibase, Rails, Django, raw SQL y proyectos sin migrations ledger?
11. ¿Qué significa schema validity: solo tablas, o también columnas, constraints, indexes, sequences, functions, triggers, policies y extensions?
12. ¿Se agregan row digests/sampling para detectar corrupción que los counts no ven?
13. ¿Cómo se manejan roles, grants, ownership, tablespaces, large objects y extensiones no disponibles en el target?

### Provider resources and complete recovery

14. ¿Qué adapters restauran auth, storage/object buckets, functions, secrets y otros recursos externos de Supabase u otros proveedores?
15. ¿Railway y Supabase son examples best-effort o integraciones soportadas con compatibility SLA?
16. ¿Cómo se detecta que una URL pooler no preserva las propiedades de sesión requeridas?
17. ¿El producto debe provisionar el recovery PostgreSQL o solo operar sobre uno ya creado?

### Security, encryption and compliance

18. ¿Se exige `verify-full`/CA privada y mutual TLS? ¿Cómo se distribuyen/rotan trust roots?
19. ¿Dónde se cifran archives temporales, recovery databases y evidence; quién administra KMS keys?
20. ¿Qué datos pueden entrar en logs/evidence bajo GDPR, HIPAA u otras obligaciones y cuál es su retention/deletion policy?
21. ¿Qué modelo de plugins evita que un verifier de terceros exfiltre secretos o ejecute SQL destructivo?
22. ¿Cómo se firman/verifican imágenes, releases, SBOM y provenance?

### Service levels and operation

23. ¿Cuál es el RPO esperado: 12 horas por cron, menor mediante WAL/PITR o configurable por proyecto?
24. ¿Cuál es el RTO objetivo y qué rehearsal de cutover DNS/app/credentials lo demuestra?
25. ¿Quién recibe alertas por job missed, lock permanente, quarantine, retention warning o evidence write failure?
26. ¿Qué porcentaje de restauraciones debe ensayarse y con qué frecuencia para sostener una afirmación de readiness?
27. ¿La operación es single-project por deployment o multi-tenant con aislamiento fuerte, quotas y namespaces por tenant?
28. En multi-tenant, ¿cómo se separan locks, prefixes, lifecycle stores, credentials y blast radius?

### Product and governance

29. ¿Kamayuq será CLI/image open source, servicio administrado o ambos? ¿Qué parte exacta es Khipu Engine?
30. ¿Cuál será la licencia pública y existe autorización para adaptar el código Preppie actual?
31. ¿Qué stability promise tendrán config schema, plugin API, JSON events y exit codes durante v0.x?
32. ¿Qué gaps bloquean GA aunque una beta pueda documentarlos: object storage, CA verification, alerting, PITR, cutover rehearsal o todos?

Hasta responder estas preguntas, el claim correcto sigue siendo limitado: el sistema mergeado produce y conserva copias PostgreSQL restauradas y verificadas según checks concretos. No demuestra por sí solo recuperación integral del producto ni cumplimiento de un RPO/RTO contractual.
