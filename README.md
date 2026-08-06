# LabSystem

Sistema de laboratorio clínico (migración del sistema Laravel "Lab Santa Fe" a un stack moderno).

- **backend/** — API REST en Node.js + Express, MySQL con `mysql2`, JWT + bcrypt, roles y permisos (RBAC), auditoría en bitácora, PDFs con pdfmake.
- **frontend/** — React + Vite + Tailwind CSS v4. Colores en `frontend/src/config/theme.css`, iconos en `frontend/src/config/icons.js`, menú en `frontend/src/config/nav.js` (todo centralizado: se cambia en un solo lugar).

## Arquitectura

### Backend: rutas → controladores → modelos

```
backend/
├── knexfile.js                     # solo para migraciones y semillas
└── src/
    ├── index.js                    # servidor Express: middlewares + registro de rutas
    ├── core/
    │   ├── config/
    │   │   ├── index.js            # variables de entorno
    │   │   └── database.js         # pool de conexiones mysql2 (promesas)
    │   ├── errors.js               # AppError, asyncHandler, errorHandler central
    │   ├── audit.js                # escritura en bitácora (nunca lanza)
    │   └── middlewares/
    │       ├── authMiddleware.js   # JWT + carga de permisos; requirePermission()
    │       └── validateMiddleware.js # validación con zod → req.validated
    ├── modules/sistema/
    │   ├── routes/                 # endpoints, permisos y esquemas de validación
    │   ├── controllers/            # reciben req/res, orquestan, responden
    │   ├── models/                 # SQL parametrizado; sin req/res
    │   └── utils/ordenPdf.js       # generación de PDFs
    └── db/
        ├── migrations/             # esquema versionado (Knex)
        └── seeds/                  # roles, permisos, catálogos base
```

**Responsabilidad de cada capa:**

- **routes** — define el endpoint, exige el permiso (`requirePermission('ordenes.crear')`) y valida el cuerpo con zod. No contiene lógica.
- **controllers** — leen `req.validated`, llaman al modelo, escriben en bitácora y responden. Los errores se lanzan (`AppError`) y los captura `asyncHandler` + `errorHandler`.
- **models** — clases con métodos estáticos y **SQL parametrizado** (`db.execute('… WHERE id = ?', [id])`). Aquí vive la lógica del laboratorio (expansión de combos, transiciones de estado). Las operaciones de varios pasos usan transacciones con `db.getConnection()`.

Knex se usa **solo** para migraciones y semillas, así el esquema queda versionado y reproducible con `npm run migrate`. Las consultas de la aplicación son SQL directo.

### Frontend: services → páginas

```
frontend/src/
├── config/          # theme.css, icons.js, nav.js, config.js (URL de la API)
├── services/        # api.js (axios + interceptores) y un *Service.js por módulo
├── context/         # AuthContext.jsx: sesión, permisos, can()
├── hooks/           # useFetch (carga de datos), useDebounce (búsquedas)
├── components/      # ui.jsx (componentes base), CrudPage, SelectBuscador, …
└── pages/           # una página por pantalla
```

Las páginas **nunca llaman a axios directamente**: usan un service. `useFetch(fn, deps)` devuelve `{ data, cargando, error, recargar }` y descarta respuestas fuera de orden, que es lo que hace falta para búsquedas mientras se escribe.

### Convención de commits

```
<tipo>(módulo): descripción breve en presente
```

Tipos: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `perf`, `ci`, `revert`.

## Flujo de negocio

Una **orden** (`cotizacion` + `cotizacion_detalle`) pasa por tres estados (`estado_documento`):

1. **Cotización** → se crea con paciente, médico y exámenes (los combos se expanden automáticamente).
2. **Análisis en proceso** (venta) → se capturan resultados según el tipo de examen:
   numérico (con rangos), positivo/negativo, tecleado (texto), heces y orina (formularios por categoría/parámetro), estático.
3. **Finalizado** → PDF de resultados, aviso por WhatsApp; puede reabrirse con permiso.

Anular una orden exige reconfirmar la contraseña del usuario (igual que el sistema anterior).

## Puesta en marcha

```bash
# Base de datos
mysql -u root -p -e "CREATE DATABASE labsystem CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# Backend
cd backend
cp .env.example .env        # completar credenciales
npm install
npm run migrate             # crea el esquema
npm run seed                # roles, permisos, tipos de examen, usuario sysadmin/admin123
npm run dev                 # http://localhost:4000

# Frontend
cd ../frontend
npm install
npm run dev                 # http://localhost:5173 (proxy /api → 4000)
```

Usuario inicial: **sysadmin / admin123** (cámbialo en producción).

## Migración de datos desde el sistema anterior

1. Importar el dump de producción de Laravel en una BD local (p.ej. `seanlabsantafe`).
2. Configurar `LEGACY_DB_NAME` en `backend/.env`.
3. `npm run etl:legacy` — copia catálogos, usuarios (conservan su contraseña, hash bcrypt compatible), pacientes, médicos, exámenes, combos, órdenes, resultados (incluye heces/orina) y bitácora, conservando los IDs originales.
4. `npm run seed` — restaura permisos/roles y el usuario `sysadmin` (el ETL trunca `users`).

Los roles legados (super-admin, Administrador, Analista, Secretaria, Secretaria-cotizacion)
se mapean automáticamente a los roles nuevos con permisos equivalentes.

## Sistema anterior en paralelo (referencia)

El Laravel original corre localmente con Herd contra la BD `seanlabsantafe`, para comparar comportamiento:

```bash
cd _legacy/l1.labsantafe.online/seanlabsantafe
herd link seanlabsantafe
herd isolate 7.4                                  # Laravel 5.6 no corre en PHP 8
herd php -d pcre.jit=0 composer1.phar install     # Composer 1: Laravel 5.6 no soporta Composer 2
```

Queda en `http://seanlabsantafe.test`. Notas: hay que borrar `bootstrap/cache/config.php`
(viene cacheado de producción) y el `.env` debe apuntar al usuario MySQL local.

## Pendientes conocidos

- Subida de archivos adjuntos a órdenes (tabla `archivos` ya existe en el esquema).
- Resultados de orina con valor de texto libre (el esquema lo soporta; falta en la UI de captura).
- Editor de combos en la UI (el endpoint `PUT /api/examenes/combos` ya existe).
- Reportes secundarios del sistema anterior (talonario, contactos, existencias) y módulo de inventario.
- Subsistema MEL/indicadores del legado (registro/indicador/financiero/des_*): fuera del alcance del laboratorio.
- Revisión del sistema l2 (`seanlab.sql`) y publicación del repositorio en GitHub.
